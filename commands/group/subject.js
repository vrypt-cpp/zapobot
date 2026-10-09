export default {
  name: 'subject',
  aliases: ['setname'],
  description: 'change group name',
  usage: 'subject <name>',
  category: 'group',
  groupOnly: true,
  adminOnly: true,
  botAdmin: true,
  async execute(ctx) {
    if (!ctx.text) {
      await ctx.reply(`usage: ${ctx.prefix}subject new name`)
      return
    }
    await ctx.client.group.setSubject(ctx.jid, ctx.text)
    await ctx.reply('group name updated')
  }
}
