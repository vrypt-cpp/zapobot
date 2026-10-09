import { isGroupJid, jidToNumber, senderAltOf, senderOf } from './utils/jid.js'

export function buildContext(client, event, config, extra) {
  const jid = event.key.remoteJid
  const senderJid = senderOf(event)
  const senderAltJid = senderAltOf(event)
  const senderNumber = jidToNumber(senderJid)
  const senderAltNumber = senderAltJid ? jidToNumber(senderAltJid) : null
  const isGroup = isGroupJid(jid)
  const isOwner = config.owners.includes(senderNumber) || (senderAltNumber ? config.owners.includes(senderAltNumber) : false)
  const reply = (content, options) => client.message.send(jid, content, { quote: event, ...options })
  const react = (emoji) => client.message.send(jid, { type: 'reaction', emoji, target: event }).catch(() => {})
  return {
    client,
    event,
    config,
    registry: extra.registry,
    prefix: extra.prefix,
    jid,
    senderJid,
    senderAltJid,
    senderNumber,
    senderAltNumber,
    pushName: event.pushName || senderNumber,
    isGroup,
    isOwner,
    command: extra.command,
    args: extra.args,
    text: extra.text,
    reply,
    react,
    send: (content, options) => client.message.send(jid, content, options)
  }
}
