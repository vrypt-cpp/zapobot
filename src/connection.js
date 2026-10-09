import { config } from './config.js'
import { logger } from './logger.js'

export function registerConnection(client, onOpen) {
  let attempt = 0
  let reconnecting = false

  async function reconnect() {
    if (reconnecting) return
    reconnecting = true
    try {
      if (attempt >= config.maxReconnect) {
        logger.error(`stopping reconnect after ${attempt}x`)
        return
      }
      const base = Math.min(30000, 1000 * 2 ** attempt)
      const delay = Math.min(30000, Math.floor(base * (0.8 + Math.random() * 0.4)))
      attempt += 1
      logger.warn(`reconnecting ${attempt}/${config.maxReconnect} in ${delay}ms`)
      await new Promise((r) => setTimeout(r, delay))
      await client.connect()
    } catch (err) {
      logger.error(`reconnect failed: ${err?.message || err}`)
      reconnecting = false
      void reconnect()
      return
    }
    reconnecting = false
  }

  client.on('connection', (event) => {
    if (event.status === 'open') {
      attempt = 0
      reconnecting = false
      logger.info(`connected${event.isNewLogin ? ' (new login)' : ''}`)
      if (onOpen) void onOpen()
      return
    }
    logger.warn(`connection closed: ${event.reason} logout=${event.isLogout}`)
    if (event.isLogout) return
    void reconnect()
  })
}
