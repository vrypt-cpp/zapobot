export function normalizeNumber(input) {
  return String(input || '').replace(/\D/g, '')
}

export function numberToJid(number) {
  return `${normalizeNumber(number)}@s.whatsapp.net`
}

export function jidToNumber(jid) {
  return normalizeNumber(String(jid || '').split('@')[0].split(':')[0])
}

export function isGroupJid(jid) {
  return String(jid || '').endsWith('@g.us')
}

export function isNewsletterJid(jid) {
  return String(jid || '').endsWith('@newsletter')
}

export function isStatusJid(jid) {
  return jid === 'status@broadcast'
}

export function isLidJid(jid) {
  return String(jid || '').split(':').pop().endsWith('@lid')
}

export function isPhoneJid(jid) {
  return !isLidJid(jid) && String(jid || '').includes('@s.whatsapp.net')
}

export function senderOf(event) {
  return event.key.participant ?? event.key.remoteJid
}

export function senderAltOf(event) {
  return event.key.participantAlt ?? event.key.remoteJidAlt ?? null
}

export function mentionTag(jid) {
  return `@${jidToNumber(jid)}`
}
