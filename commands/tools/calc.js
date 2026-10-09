function safeCalc(expr) {
  if (!/^[0-9+\-*/().%\s^]+$/.test(expr)) throw new Error('invalid characters')
  const safe = expr.replace(/\^/g, '**')
  const fn = new Function(`return (${safe})`)
  const out = fn()
  if (typeof out !== 'number' || !Number.isFinite(out)) throw new Error('invalid result')
  return out
}

export default {
  name: 'calc',
  description: 'evaluate math',
  usage: 'calc 12*3+4',
  category: 'tools',
  cooldown: 2,
  async execute(ctx) {
    if (!ctx.text) {
      await ctx.reply(`usage: ${ctx.prefix}calc 12*3`)
      return
    }
    try {
      await ctx.reply(`${ctx.text} = ${safeCalc(ctx.text)}`)
    } catch (err) {
      await ctx.reply(`error: ${err?.message || err}`)
    }
  }
}
