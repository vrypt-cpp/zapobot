export function extractText(message) {
  if (!message) return undefined
  return (
    message.conversation ??
    message.extendedTextMessage?.text ??
    message.imageMessage?.caption ??
    message.videoMessage?.caption ??
    message.documentMessage?.caption ??
    undefined
  )
}

export function extractQuoted(message) {
  return message?.extendedTextMessage?.contextInfo?.quotedMessage || null
}
