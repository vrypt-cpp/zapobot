import dotenv from 'dotenv'

dotenv.config()

function toBool(value, fallback = false) {
  if (value === undefined) return fallback
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase())
}

function toList(value) {
  return [...new Set(String(value || '').split(/[\s,;|]+/).map((s) => s.trim()).filter(Boolean))]
}

function toCount(value, fallback) {
  const n = Number(value)
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : fallback
}

export const config = {
  prefixes: toList(process.env.PREFIXES || process.env.PREFIX || '!'),
  sessionId: (process.env.SESSION_ID || 'default').trim() || 'default',
  authPath: (process.env.AUTH_PATH || '.auth/state.sqlite').trim() || '.auth/state.sqlite',
  botName: (process.env.BOT_NAME || 'ZapoBot').trim() || 'ZapoBot',
  owners: toList(process.env.OWNER_NUMBERS).map((n) => n.replace(/\D/g, '')).filter(Boolean),
  pairingNumber: (process.env.PAIRING_NUMBER || '').replace(/\D/g, ''),
  logLevel: (process.env.LOG_LEVEL || 'info').trim() || 'info',
  zapoLogLevel: (process.env.ZAPO_LOG_LEVEL || 'warn').trim() || 'warn',
  markOnline: toBool(process.env.MARK_ONLINE, false),
  fullSync: toBool(process.env.HISTORY_FULL_SYNC, true),
  autoRead: toBool(process.env.AUTO_READ, true),
  autoTyping: toBool(process.env.AUTO_TYPING, true),
  welcome: toBool(process.env.WELCOME, true),
  maxReconnect: toCount(process.env.MAX_RECONNECT, 20)
}
if (!config.prefixes.length) config.prefixes = ['!']
config.prefixes.sort((a, b) => b.length - a.length)
