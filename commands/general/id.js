export default {
  name: 'id',
  description: 'show chat jid',
  category: 'general',
  async execute(ctx) {
    await ctx.reply(ctx.jid)
  }
}
