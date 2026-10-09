export default {
  name: 'eval',
  aliases: ['ev'],
  description: 'run js (owner, => or >)',
  usage: '<code>',
  category: 'owner',
  ownerOnly: true,
  triggers: ['=>', '>'],
  async execute(ctx) {
    if (!ctx.text) {
      await ctx.reply('usage: => 1+1')
      return
    }
    try {
      const fn = new Function('ctx', `return (async () => { return (${ctx.text}) })()`)
      let out = await fn(ctx)
      if (typeof out !== 'string') out = JSON.stringify(out, null, 2) ?? String(out)
      await ctx.reply(String(out).slice(0, 1500))
    } catch (err) {
      await ctx.reply(`error: ${err?.message || err}`)
    }
  }
}
