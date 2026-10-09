import { config } from '../config.js'
import { logger } from '../logger.js'
import { buildContext } from '../context.js'
import { runGuards } from '../middleware.js'
import { extractText } from '../utils/text.js'
import { markEcho, isEcho } from '../services/echo.js'
import { isNewsletterJid, isStatusJid } from '../utils/jid.js'

function parseBody(raw) {
  for (const p of config.prefixes) {
    if (raw.startsWith(p)) {
      const body = raw.slice(p.length).trim()
      if (body) return { prefix: p, body }
    }
  }
  return null
}

async function typing(client, jid, fn) {
  const chat = config.autoTyping ? client.presence?.sendChatState : null
  if (chat) await chat.call(client.presence, jid, 'composing').catch(() => {})
  try {
    return await fn()
  } finally {
    if (chat) await chat.call(client.presence, jid, 'paused').catch(() => {})
  }
}

export function registerMessageHandler(client, registry) {
  client.on('message_send', (event) => {
    if (event?.id) markEcho(event.id)
  })
  client.on('message', async (event) => {
    try {
      const jid = event?.key?.remoteJid
      if (!jid || isNewsletterJid(jid) || isStatusJid(jid)) return
      if (event.key.fromMe && isEcho(event.key.id)) return
      const raw = extractText(event.message)?.trim()
      if (!raw) return
      const parsed = parseBody(raw)
      if (!parsed) return
      if (config.autoRead) void client.message.sendReceipt(event, { type: 'read' }).catch(() => {})
      const [name, ...args] = parsed.body.split(/\s+/)
      const def = registry.get(name.toLowerCase())
      if (!def) return
      const ctx = buildContext(client, event, config, {
        command: def.name,
        args,
        text: args.join(' '),
        prefix: parsed.prefix,
        registry
      })
      if (!(await runGuards(ctx, def))) return
      await typing(client, jid, () => def.execute(ctx))
    } catch (err) {
      logger.error(`handler error: ${err?.message || err}`)
      try {
        await client.message.send(event.key.remoteJid, 'failed to run the command', { quote: event })
      } catch {}
    }
  })
}
