import { formatUptime } from '../../src/utils/time.js'
import { bootTime } from '../../src/state.js'

export default {
  name: 'runtime',
  aliases: ['uptime'],
  description: 'bot uptime',
  category: 'general',
  cooldown: 3,
  async execute(ctx) {
    await ctx.reply(`uptime ${formatUptime(Date.now() - bootTime)}`)
  }
}
