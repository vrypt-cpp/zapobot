import { WaClient } from 'zapo-js'
import { config } from './config.js'
import { libLogger } from './logger.js'

export function buildClient(store) {
  return new WaClient(
    {
      store,
      sessionId: config.sessionId,
      markOnlineOnConnect: config.markOnline,
      recoverFromClientTooOld: true,
      history: { enabled: true, requireFullSync: config.fullSync }
    },
    libLogger
  )
}
