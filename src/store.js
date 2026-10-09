import fs from 'node:fs'
import path from 'node:path'
import { createStore } from 'zapo-js'
import { createSqliteStore } from '@zapo-js/store-sqlite'
import { config } from './config.js'

export function buildStore() {
  fs.mkdirSync(path.dirname(config.authPath), { recursive: true })
  const sqlite = createSqliteStore({ path: config.authPath, driver: 'auto' })
  return createStore({
    backends: { sqlite },
    providers: {
      auth: 'sqlite',
      signal: 'sqlite',
      preKey: 'sqlite',
      session: 'sqlite',
      identity: 'sqlite',
      senderKey: 'sqlite',
      appState: 'sqlite',
      privacyToken: 'sqlite',
      messages: 'sqlite',
      threads: 'sqlite',
      contacts: 'sqlite'
    }
  })
}
