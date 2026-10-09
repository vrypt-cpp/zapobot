export default {
  name: 'desc',
  aliases: ['setdesc'],
  description: 'change group description',
  usage: 'desc <text>',
  category: 'group',
  groupOnly: true,
  adminOnly: true,
  botAdmin: true,
  async execute(ctx) {
    await ctx.client.group.setDescription(ctx.jid, ctx.text || null)
    await ctx.reply(ctx.text ? 'description updated' : 'description cleared')
  }
}
