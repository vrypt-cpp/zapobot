export default {
  name: 'echo',
  description: 'repeat text',
  usage: 'echo <text>',
  category: 'general',
  cooldown: 2,
  async execute(ctx) {
    if (!ctx.text) {
      await ctx.reply(`usage: ${ctx.prefix}echo hello`)
      return
    }
    await ctx.send(ctx.text)
  }
}
