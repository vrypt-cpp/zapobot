import { checkCooldown } from './utils/cooldown.js'
import { findParticipant, groupMetadata, isAdmin, participantNumbers } from './services/group.js'

async function resolveOwner(ctx) {
  if (ctx.isOwner) return true
  if (!ctx.isGroup) return false
  try {
    const meta = await groupMetadata(ctx.client, ctx.jid)
    const nums = participantNumbers(findParticipant(meta, ctx.senderJid))
    return nums.some((n) => ctx.config.owners.includes(n))
  } catch {
    return false
  }
}

export async function runGuards(ctx, def) {
  if (def.ownerOnly && !(await resolveOwner(ctx))) {
    await ctx.reply('owner only')
    return false
  }
  if (def.groupOnly && !ctx.isGroup) {
    await ctx.reply('groups only')
    return false
  }
  if (def.privateOnly && ctx.isGroup) {
    await ctx.reply('private chat only')
    return false
  }
  if (def.adminOnly) {
    if (!ctx.isGroup) {
      await ctx.reply('groups only')
      return false
    }
    const ok = (await resolveOwner(ctx)) || (await isAdmin(ctx.client, ctx.jid, ctx.senderJid))
    if (!ok) {
      await ctx.reply('group admins only')
      return false
    }
  }
  if (def.botAdmin && ctx.isGroup) {
    const me = ctx.client.getCredentials()?.meJid
    const ok = me ? await isAdmin(ctx.client, ctx.jid, me) : false
    if (!ok) {
      await ctx.reply('bot must be admin')
      return false
    }
  }
  const left = checkCooldown(`${def.name}:${ctx.senderJid}`, def.cooldown)
  if (left > 0) {
    await ctx.reply(`wait ${left}s`)
    return false
  }
  return true
}
