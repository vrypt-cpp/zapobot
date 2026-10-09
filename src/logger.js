import { config } from './config.js'

const RANK = { trace: 10, debug: 20, info: 30, warn: 40, error: 50 }
const COLORS = { trace: 90, debug: 36, info: 32, warn: 33, error: 31 }
const LABELS = { trace: 'TRC', debug: 'DBG', info: 'INF', warn: 'WRN', error: 'ERR' }

function useColor() {
  return !process.env.NO_COLOR && (process.stdout?.isTTY || process.stderr?.isTTY)
}

function paint(code, text) {
  if (!useColor()) return text
  return `\x1b[${code}m${text}\x1b[0m`
}

function time() {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

function validLevel(value) {
  return Object.hasOwn(RANK, value) ? value : 'info'
}

function formatValue(value, depth = 0) {
  if (value === undefined || value === null) return ''
  if (typeof value === 'string') return value
  if (value instanceof Error) return value.stack || `${value.name}: ${value.message}`
  if (typeof value !== 'object' || depth > 2) return String(value)
  try {
    const keys = Object.keys(value)
    if (!keys.length) return ''
    return keys.map((k) => `${k}=${formatValue(value[k], depth + 1)}`).join(' ')
  } catch {
    return ''
  }
}

class PrettyLogger {
  constructor(level = 'info', bindings = {}) {
    this.level = validLevel(level)
    this.bindings = bindings
  }

  child(bindings) {
    return new PrettyLogger(this.level, { ...this.bindings, ...bindings })
  }

  trace(message, context) {
    this.write('trace', message, context)
  }

  debug(message, context) {
    this.write('debug', message, context)
  }

  info(message, context) {
    this.write('info', message, context)
  }

  warn(message, context) {
    this.write('warn', message, context)
  }

  error(message, context) {
    this.write('error', message, context)
  }

  write(at, message, context) {
    if (RANK[at] < RANK[this.level]) return
    const merged = { ...this.bindings, ...(context || {}) }
    const tag = merged.component ?? merged.scope ?? null
    if (tag !== null) delete merged.component
    if (merged.scope !== undefined && tag !== null) delete merged.scope
    const extra = formatValue(merged)
    const line = `${paint(90, time())} ${paint(COLORS[at], LABELS[at])}${tag ? ` ${paint(36, `[${tag}]`)}` : ''} ${message}${extra ? ` ${paint(90, extra)}` : ''}`
    if (at === 'error' || at === 'warn') process.stderr.write(`${line}\n`)
    else process.stdout.write(`${line}\n`)
  }
}

export const logger = new PrettyLogger(config.logLevel)
export const libLogger = new PrettyLogger(config.zapoLogLevel)
