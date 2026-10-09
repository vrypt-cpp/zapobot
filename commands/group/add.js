export default {
  name: 'add',
  description: 'add a member by number',
  usage: 'add 62812xxxx',
  category: 'group',
  groupOnly: true,
  adminOnly: true,
  botAdmin: true,
  async execute(ctx) {
    const num = (ctx.args[0] || '').replace(/\D/g, '')
    if (!/^\d{5,16}$/.test(num)) {
      await ctx.reply(`usage: ${ctx.prefix}add 62812xxxx`)
      return
    }
    const results = await ctx.client.group.addParticipants(ctx.jid, [`${num}@s.whatsapp.net`])
    const fail = results.filter((r) => r.status !== 'ok')
    await ctx.reply(fail.length ? `failed: ${fail.map((r) => `${r.jid} (${r.code})`).join(', ')}` : 'added')
  }
}
