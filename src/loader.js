import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { logger } from './logger.js'

function walk(dir) {
  const out = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) out.push(...walk(full))
    else if (entry.isFile() && entry.name.endsWith('.js')) out.push(full)
  }
  return out.sort()
}

function normalize(def) {
  return {
    name: String(def.name).toLowerCase(),
    aliases: (def.aliases || []).map((a) => String(a).toLowerCase()),
    description: def.description || '',
    usage: def.usage || '',
    category: def.category || 'general',
    cooldown: Number(def.cooldown) > 0 ? Math.floor(Number(def.cooldown)) : 0,
    ownerOnly: Boolean(def.ownerOnly),
    groupOnly: Boolean(def.groupOnly),
    privateOnly: Boolean(def.privateOnly),
    adminOnly: Boolean(def.adminOnly),
    botAdmin: Boolean(def.botAdmin),
    execute: def.execute
  }
}

export async function loadCommands(commandsDir) {
  const registry = new Map()
  if (!fs.existsSync(commandsDir)) {
    fs.mkdirSync(commandsDir, { recursive: true })
    return registry
  }
  const files = walk(commandsDir)
  const mods = await Promise.all(files.map((file) => import(pathToFileURL(file).href).then(
    (mod) => ({ file, mod }),
    (err) => ({ file, err })
  )))
  for (const { file, mod, err } of mods) {
    if (err) {
      logger.error(`failed to load ${file}: ${err?.message || err}`)
      continue
    }
    const def = mod.default || mod.command
    if (!def?.name || typeof def.execute !== 'function') {
      logger.warn(`skipping invalid plugin: ${file}`)
      continue
    }
    const record = normalize(def)
    record.file = file
    if (registry.has(record.name)) logger.warn(`duplicate name: ${record.name} (${file})`)
    registry.set(record.name, record)
    for (const alias of record.aliases) {
      if (registry.has(alias) && registry.get(alias) !== record) logger.warn(`duplicate alias: ${alias} (${file})`)
      registry.set(alias, record)
    }
  }
  return registry
}

export function uniqueCommands(registry) {
  return [...new Set(registry.values())].sort((a, b) => a.name.localeCompare(b.name))
}
