import { resolveTarget } from '../../src/services/group.js'

export default {
  name: 'demote',
  description: 'remove admin rights',
  usage: 'demote @user / reply',
  category: 'group',
  groupOnly: true,
  adminOnly: true,
  botAdmin: true,
  async execute(ctx) {
    const target = resolveTarget(ctx)
    if (!target) {
      await ctx.reply(`usage: ${ctx.prefix}demote @user`)
      return
    }
    await ctx.client.group.demoteParticipants(ctx.jid, [target])
    await ctx.reply(`demoted ${target.split('@')[0]}`)
  }
}
