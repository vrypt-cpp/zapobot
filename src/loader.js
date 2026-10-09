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
    triggers: [...new Set((def.triggers || []).map((t) => String(t)).filter(Boolean))],
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

async function importFile(file, fresh) {
  const href = pathToFileURL(file).href
  try {
    const mod = await import(fresh ? `${href}?t=${Date.now()}` : href)
    return { file, mod }
  } catch (err) {
    return { file, err }
  }
}

function fillRegistry(registry, entries) {
  for (const { file, mod, err } of entries) {
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

export function bumpRegistry(registry) {
  registry.rev = (registry.rev || 0) + 1
  return registry.rev
}

export async function loadCommands(commandsDir) {
  const registry = new Map()
  if (!fs.existsSync(commandsDir)) {
    fs.mkdirSync(commandsDir, { recursive: true })
    return registry
  }
  const entries = await Promise.all(walk(commandsDir).map((file) => importFile(file, false)))
  fillRegistry(registry, entries)
  bumpRegistry(registry)
  return registry
}

export async function reloadCommands(registry, commandsDir) {
  if (!fs.existsSync(commandsDir)) return uniqueCommands(registry)
  const entries = await Promise.all(walk(commandsDir).map((file) => importFile(file, true)))
  registry.clear()
  fillRegistry(registry, entries)
  bumpRegistry(registry)
  return uniqueCommands(registry)
}

export function purgeFile(registry, file) {
  for (const [key, record] of registry) {
    if (record.file === file) registry.delete(key)
  }
}

export async function reloadFile(registry, file) {
  purgeFile(registry, file)
  if (fs.existsSync(file)) {
    fillRegistry(registry, [await importFile(file, true)])
  }
  bumpRegistry(registry)
  return uniqueCommands(registry)
}

export function uniqueCommands(registry) {
  return [...new Set(registry.values())].sort((a, b) => a.name.localeCompare(b.name))
}

export function triggerIndex(registry) {
  const out = []
  const seen = new Set()
  for (const def of uniqueCommands(registry)) {
    for (const t of def.triggers || []) {
      if (seen.has(t)) continue
      seen.add(t)
      out.push([t, def])
    }
  }
  out.sort((a, b) => b[0].length - a[0].length)
  return out
}
