export default {
  name: 'close',
  description: 'lock the group, admins only',
  category: 'group',
  groupOnly: true,
  adminOnly: true,
  botAdmin: true,
  async execute(ctx) {
    await ctx.client.group.setSetting(ctx.jid, 'announcement', true)
    await ctx.reply('group locked')
  }
}
