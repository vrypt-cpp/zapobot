export default {
  name: 'leave',
  description: 'make the bot leave the group',
  category: 'group',
  groupOnly: true,
  adminOnly: true,
  async execute(ctx) {
    await ctx.reply('bot is leaving')
    await ctx.client.group.leaveGroup([ctx.jid])
  }
}
