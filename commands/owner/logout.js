export default {
  name: 'logout',
  description: 'log out and wipe the session',
  category: 'owner',
  ownerOnly: true,
  async execute(ctx) {
    await ctx.reply('logging out, session wiped')
    await ctx.client.logout()
  }
}
