import { groupMetadata } from '../../src/services/group.js'

export default {
  name: 'hidetag',
  aliases: ['ht'],
  description: 'send text with hidden mentions',
  usage: 'hidetag <text>',
  category: 'group',
  groupOnly: true,
  adminOnly: true,
  async execute(ctx) {
    if (!ctx.text) {
      await ctx.reply(`usage: ${ctx.prefix}hidetag hello`)
      return
    }
    const meta = await groupMetadata(ctx.client, ctx.jid)
    const jids = meta.participants.map((p) => p.jid).filter(Boolean)
    await ctx.client.message.send(ctx.jid, { type: 'text', text: ctx.text }, { mentions: jids })
  }
}
