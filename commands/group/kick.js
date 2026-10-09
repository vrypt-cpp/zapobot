import { resolveTarget } from '../../src/services/group.js'

export default {
  name: 'kick',
  description: 'remove a member',
  usage: 'kick @user / reply',
  category: 'group',
  groupOnly: true,
  adminOnly: true,
  botAdmin: true,
  async execute(ctx) {
    const target = resolveTarget(ctx)
    if (!target) {
      await ctx.reply(`usage: ${ctx.prefix}kick @user or reply to a message`)
      return
    }
    await ctx.client.group.removeParticipants(ctx.jid, [target])
    await ctx.reply(`kicked ${target.split('@')[0]}`)
  }
}
