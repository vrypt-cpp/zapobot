export default {
  name: 'link',
  description: 'get the group invite link',
  category: 'group',
  groupOnly: true,
  adminOnly: true,
  async execute(ctx) {
    const code = await ctx.client.group.queryInviteCode(ctx.jid)
    await ctx.reply(`https://chat.whatsapp.com/${code}`)
  }
}
