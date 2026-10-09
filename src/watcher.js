import fs from 'node:fs'
import path from 'node:path'
import { reloadCommands, reloadFile, uniqueCommands } from './loader.js'
import { logger } from './logger.js'

export function watchCommands(registry, dir) {
  let timer = null
  let pending = []

  function flush() {
    const batch = [...new Set(pending.filter(Boolean))]
    pending = []
    void (async () => {
      try {
        if (!batch.length) {
          const list = await reloadCommands(registry, dir)
          logger.info(`reloaded ${list.length} commands`)
          return
        }
        for (const file of batch) {
          await reloadFile(registry, path.join(dir, file))
        }
        logger.info(`reloaded ${batch.join(', ')} (${uniqueCommands(registry).length} commands)`)
      } catch (err) {
        logger.error(`reload failed: ${err?.message || err}`)
      }
    })()
  }

  function watchAt(target, rel) {
    try {
      fs.watch(target, (event, file) => {
        if (file && !String(file).endsWith('.js')) return
        pending.push(rel && file ? path.join(rel, String(file)) : (file ? String(file) : ''))
        if (timer) clearTimeout(timer)
        timer = setTimeout(flush, 300)
      })
    } catch (err) {
      logger.error(`watch failed: ${err?.message || err}`)
    }
  }

  try {
    watchAt(dir, '')
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) watchAt(path.join(dir, entry.name), entry.name)
    }
    logger.info(`watching ${dir} for plugin changes`)
  } catch (err) {
    logger.error(`watch failed: ${err?.message || err}`)
  }
}
