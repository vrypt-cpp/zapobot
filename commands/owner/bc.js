const CONCURRENCY = 5

export default {
  name: 'bc',
  aliases: ['broadcast'],
  description: 'broadcast to all groups',
  usage: 'bc <text>',
  category: 'owner',
  ownerOnly: true,
  async execute(ctx) {
    if (!ctx.text) {
      await ctx.reply(`usage: ${ctx.prefix}bc hello`)
      return
    }
    const groups = await ctx.client.group.queryAllGroups()
    let ok = 0
    for (let i = 0; i < groups.length; i += CONCURRENCY) {
      const batch = groups.slice(i, i + CONCURRENCY)
      const results = await Promise.allSettled(batch.map((g) => ctx.client.message.send(g.jid, { type: 'text', text: ctx.text })))
      for (const r of results) if (r.status === 'fulfilled') ok += 1
    }
    await ctx.reply(`sent to ${ok}/${groups.length} groups`)
  }
}
