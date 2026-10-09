import { checkCooldown } from './utils/cooldown.js'
import { isAdmin } from './services/group.js'

export async function runGuards(ctx, def) {
  if (def.ownerOnly && !ctx.isOwner) {
    await ctx.reply('owner only')
    return false
  }
  if (def.groupOnly && !ctx.isGroup) {
    await ctx.reply('groups only')
    return false
  }
  if (def.privateOnly && ctx.isGroup) {
    await ctx.reply('private chat only')
    return false
  }
  if (def.adminOnly) {
    if (!ctx.isGroup) {
      await ctx.reply('groups only')
      return false
    }
    const ok = ctx.isOwner || (await isAdmin(ctx.client, ctx.jid, ctx.senderJid))
    if (!ok) {
      await ctx.reply('group admins only')
      return false
    }
  }
  if (def.botAdmin && ctx.isGroup) {
    const me = ctx.client.getCredentials()?.meJid
    const ok = me ? await isAdmin(ctx.client, ctx.jid, me) : false
    if (!ok) {
      await ctx.reply('bot must be admin')
      return false
    }
  }
  const left = checkCooldown(`${def.name}:${ctx.senderJid}`, def.cooldown)
  if (left > 0) {
    await ctx.reply(`wait ${left}s`)
    return false
  }
  return true
}
