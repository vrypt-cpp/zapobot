export default {
  name: 'react',
  description: 'react to a replied message',
  usage: 'react ❤️ (reply to a message)',
  category: 'tools',
  cooldown: 2,
  async execute(ctx) {
    const emoji = ctx.args[0]
    if (!emoji) {
      await ctx.reply(`usage: ${ctx.prefix}react ❤️ as a reply`)
      return
    }
    await ctx.client.message.send(ctx.jid, { type: 'reaction', emoji, target: ctx.event })
    await ctx.react('✅').catch(() => {})
  }
}
