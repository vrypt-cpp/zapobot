import { groupMetadata } from '../../src/services/group.js'

export default {
  name: 'tagall',
  description: 'mention all members',
  usage: 'tagall [text]',
  category: 'group',
  groupOnly: true,
  adminOnly: true,
  async execute(ctx) {
    const meta = await groupMetadata(ctx.client, ctx.jid)
    const jids = meta.participants.map((p) => p.jid).filter(Boolean)
    if (!jids.length) {
      await ctx.reply('no members')
      return
    }
    const tags = jids.map((j) => `@${j.split('@')[0]}`).join(' ')
    await ctx.client.message.send(ctx.jid, { type: 'text', text: `${ctx.text || 'tagall'}\n${tags}` }, { mentions: jids })
  }
}
