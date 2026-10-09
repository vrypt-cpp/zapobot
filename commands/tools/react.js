import { jidToNumber } from '../../src/utils/jid.js'
import { isEcho } from '../../src/services/echo.js'

function quotedInfo(message) {
  return (
    message?.extendedTextMessage?.contextInfo ??
    message?.imageMessage?.contextInfo ??
    message?.videoMessage?.contextInfo ??
    null
  )
}

function quotedTarget(ctx) {
  const info = quotedInfo(ctx.event.message)
  if (!info?.stanzaId) return null
  const me = ctx.client.getCredentials()?.meJid
  const mine =
    isEcho(info.stanzaId) ||
    (info.participant && me && jidToNumber(info.participant) === jidToNumber(me))
  return {
    remoteJid: ctx.jid,
    id: info.stanzaId,
    fromMe: Boolean(mine),
    ...(ctx.isGroup && info.participant ? { participant: info.participant } : {})
  }
}

export default {
  name: 'react',
  description: 'react to a replied message',
  usage: 'react ❤️ (reply to a message)',
  category: 'tools',
  cooldown: 2,
  async execute(ctx) {
    const emoji = ctx.args[0]
    if (!emoji) {
      await ctx.reply(`usage: ${ctx.prefix}react ❤️ as a reply`)
      return
    }
    await ctx.client.message.send(ctx.jid, { type: 'reaction', emoji, target: quotedTarget(ctx) || ctx.event })
    await ctx.react('✅').catch(() => {})
  }
}
