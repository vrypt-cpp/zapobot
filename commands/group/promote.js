import { resolveTarget } from '../../src/services/group.js'

export default {
  name: 'promote',
  description: 'make a member admin',
  usage: 'promote @user / reply',
  category: 'group',
  groupOnly: true,
  adminOnly: true,
  botAdmin: true,
  async execute(ctx) {
    const target = resolveTarget(ctx)
    if (!target) {
      await ctx.reply(`usage: ${ctx.prefix}promote @user`)
      return
    }
    await ctx.client.group.promoteParticipants(ctx.jid, [target])
    await ctx.reply(`promoted ${target.split('@')[0]}`)
  }
}
