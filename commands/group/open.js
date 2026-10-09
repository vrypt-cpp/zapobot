export default {
  name: 'open',
  description: 'open the group, everyone can chat',
  category: 'group',
  groupOnly: true,
  adminOnly: true,
  botAdmin: true,
  async execute(ctx) {
    await ctx.client.group.setSetting(ctx.jid, 'announcement', false)
    await ctx.reply('group opened')
  }
}
