import { createRequire } from 'node:module'
import os from 'node:os'
import { formatUptime } from '../../src/utils/time.js'
import { bootTime } from '../../src/state.js'
import { uniqueCommands } from '../../src/loader.js'

const require = createRequire(import.meta.url)
const { version } = require('../../package.json')

function mb(bytes) {
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`
}

function row(label, value) {
  return `${label.padEnd(8)}: ${value}`
}

export default {
  name: 'info',
  aliases: ['me', 'about'],
  description: 'bot info and stats',
  category: 'general',
  cooldown: 3,
  async execute(ctx) {
    const me = ctx.client.getCredentials()?.meJid || '-'
    const total = ctx.registry ? uniqueCommands(ctx.registry).length : 0
    const mem = process.memoryUsage()
    await ctx.reply([
      `*${ctx.config.botName} v${version}*`,
      '',
      row('Account', me),
      row('Session', ctx.config.sessionId),
      row('Uptime', formatUptime(Date.now() - bootTime)),
      row('Commands', `${total} | Owners: ${ctx.config.owners.length}`),
      row('Prefixes', ctx.config.prefixes.join(' ')),
      row('Memory', `rss ${mb(mem.rss)} heap ${mb(mem.heapUsed)}`),
      row('CPU', `${os.cpus().length} cores load ${os.loadavg()[0].toFixed(2)}`),
      row('Platform', `${os.platform()} ${os.release()} | node ${process.version}`)
    ].join('\n'))
  }
}
