import { uniqueCommands } from '../../src/loader.js'

export default {
  name: 'help',
  aliases: ['menu', 'h'],
  description: 'list commands',
  usage: 'help [name]',
  category: 'general',
  cooldown: 2,
  async execute(ctx) {
    const list = ctx.registry ? uniqueCommands(ctx.registry) : []
    const query = (ctx.args[0] || '').toLowerCase()
    if (query) {
      const found = list.find((c) => c.name === query || c.aliases.includes(query))
      if (!found) {
        await ctx.reply(`command ${query} not found`)
        return
      }
      await ctx.reply(`${ctx.prefix}${found.name} ${found.usage}\n${found.description}\ncategory: ${found.category}`)
      return
    }
    const groups = new Map()
    for (const cmd of list) {
      if (!groups.has(cmd.category)) groups.set(cmd.category, [])
      groups.get(cmd.category).push(cmd.name)
    }
    const lines = [ctx.config.botName, '']
    for (const [cat, names] of [...groups.entries()].sort()) lines.push(`${cat}: ${names.sort().join(', ')}`)
    lines.push('', `type ${ctx.prefix}help <name> for details`)
    await ctx.reply(lines.join('\n'))
  }
}
