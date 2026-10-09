import dotenv from 'dotenv'

dotenv.config()

import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { config } from './config.js'
import { logger } from './logger.js'
import { buildStore } from './store.js'
import { buildClient } from './client.js'
import { registerAuth } from './auth.js'
import { registerConnection } from './connection.js'
import { loadCommands, uniqueCommands } from './loader.js'
import { registerHandler } from './handler.js'

const root = path.dirname(fileURLToPath(import.meta.url))
const commandsDir = path.join(root, '..', 'commands')

const store = buildStore()
const client = buildClient(store)
const registry = await loadCommands(commandsDir)

registerAuth(client)
registerConnection(client)
registerHandler(client, registry)

logger.info(`${config.botName} loaded ${uniqueCommands(registry).length} commands, prefixes ${config.prefixes.join(' ')}`)

process.on('unhandledRejection', (err) => {
  logger.error(`unhandled: ${err?.message || err}`)
})
process.on('uncaughtException', (err) => {
  logger.error(`uncaught: ${err?.message || err}`)
})
process.on('SIGINT', async () => {
  await client.disconnect().catch(() => {})
  process.exit(0)
})
process.on('SIGTERM', async () => {
  await client.disconnect().catch(() => {})
  process.exit(0)
})

await client.connect()
