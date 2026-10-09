import { exec } from 'node:child_process'

function run(cmd) {
  return new Promise((resolve) => {
    exec(cmd, { timeout: 15000, maxBuffer: 512 * 1024 }, (err, stdout, stderr) => {
      resolve({ err, stdout, stderr })
    })
  })
}

export default {
  name: 'exec',
  aliases: ['sh'],
  description: 'run shell (owner, $)',
  usage: '<command>',
  category: 'owner',
  ownerOnly: true,
  triggers: ['$'],
  async execute(ctx) {
    if (!ctx.text) {
      await ctx.reply('usage: $ <command>')
      return
    }
    const { err, stdout, stderr } = await run(ctx.text)
    const out = `${stdout || ''}${stderr || ''}`.trim() || (err ? `error: ${err.message}` : '(no output)')
    await ctx.reply(out.slice(0, 1500))
  }
}
