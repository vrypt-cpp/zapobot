export default {
  name: 'info',
  aliases: ['me'],
  description: 'chat and account info',
  category: 'general',
  async execute(ctx) {
    const me = ctx.client.getCredentials()?.meJid || '-'
    await ctx.reply([`bot: ${me}`, `chat: ${ctx.jid}`, `sender: ${ctx.senderJid}`, `name: ${ctx.pushName}`, `group: ${ctx.isGroup ? 'yes' : 'no'}`].join('\n'))
  }
}
