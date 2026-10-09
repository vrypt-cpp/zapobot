import { jidToNumber } from '../utils/jid.js'
import { quotedContext } from '../utils/text.js'

const cache = new Map()
const pending = new Map()
const TTL_MS = 5 * 60 * 1000
const MAX_CACHED_GROUPS = 200

function prune() {
  while (cache.size > MAX_CACHED_GROUPS) {
    const oldest = cache.keys().next().value
    cache.delete(oldest)
  }
}

export async function groupMetadata(client, jid, force = false) {
  const now = Date.now()
  if (!force) {
    const hit = cache.get(jid)
    if (hit && now - hit.at < TTL_MS) {
      cache.delete(jid)
      cache.set(jid, hit)
      return hit.meta
    }
  }
  const inflight = pending.get(jid)
  if (inflight) return inflight
  const task = client.group.queryGroupMetadata(jid).then((meta) => {
    cache.delete(jid)
    cache.set(jid, { meta, at: Date.now() })
    prune()
    pending.delete(jid)
    return meta
  }).catch((err) => {
    pending.delete(jid)
    throw err
  })
  pending.set(jid, task)
  return task
}

export function dropGroupCache(jid) {
  if (jid) cache.delete(jid)
  else cache.clear()
}

function matchId(row, jid) {
  const want = jidToNumber(jid)
  if (row.jid && jidToNumber(row.jid) === want) return true
  if (row.phoneNumber && jidToNumber(row.phoneNumber) === want) return true
  if (row.lid && jidToNumber(row.lid) === want) return true
  return row.jid === jid
}

export function findParticipant(meta, jid) {
  return meta?.participants?.find((p) => matchId(p, jid)) || null
}

export function participantNumbers(row) {
  return [row?.jid, row?.phoneNumber, row?.lid].filter(Boolean).map(jidToNumber)
}

export async function isAdmin(client, groupJid, participantJid) {
  const meta = await groupMetadata(client, groupJid)
  const row = meta.participants.find((p) => matchId(p, participantJid))
  return Boolean(row?.isAdmin || row?.isSuperAdmin)
}

export async function isBotAdmin(client, groupJid) {
  const me = client.getCredentials()?.meJid
  if (!me) return false
  return isAdmin(client, groupJid, me)
}

export function resolveTarget(ctx) {
  const info = quotedContext(ctx.event.message)
  if (info?.participant) return info.participant
  if (info?.mentionedJid?.[0]) return info.mentionedJid[0]
  const raw = (ctx.args[0] || '').replace(/[@+\s-]/g, '')
  if (/^\d{5,16}$/.test(raw)) return `${raw}@s.whatsapp.net`
  return null
}
