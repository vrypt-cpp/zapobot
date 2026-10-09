import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { reloadCommands } from '../../src/loader.js'

const root = path.dirname(fileURLToPath(import.meta.url))

export default {
  name: 'reload',
  description: 'reload all command plugins',
  category: 'owner',
  ownerOnly: true,
  async execute(ctx) {
    const list = await reloadCommands(ctx.registry, path.join(root, '..'))
    await ctx.reply(`reloaded ${list.length} commands`)
  }
}
