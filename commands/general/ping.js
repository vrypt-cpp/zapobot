import { formatUptime, formatLatency } from '../../src/utils/time.js'
import { bootTime } from '../../src/state.js'

export default {
  name: 'ping',
  aliases: ['p'],
  description: 'check latency and uptime',
  category: 'general',
  cooldown: 3,
  async execute(ctx) {
    const t0 = Date.now()
    await ctx.react('🏓').catch(() => {})
    const latency = formatLatency(Date.now() - t0)
    await ctx.reply(`pong ${latency}\nuptime ${formatUptime(Date.now() - bootTime)}`)
  }
}
