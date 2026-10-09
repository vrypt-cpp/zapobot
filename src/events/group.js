import { config } from '../config.js'
import { logger } from '../logger.js'
import { dropGroupCache } from '../services/group.js'
import { mentionTag } from '../utils/jid.js'

export function registerGroupHandler(client) {
  client.on('group', async (event) => {
    try {
      dropGroupCache(event.groupJid)
      if (!config.welcome || !event.groupJid) return
      if (event.action !== 'add' || !event.participants?.length) return
      const jids = event.participants.map((p) => p.jid).filter(Boolean)
      if (!jids.length) return
      const tags = jids.map(mentionTag).join(' ')
      await client.message.send(event.groupJid, { type: 'text', text: `welcome ${tags}` }, { mentions: jids })
    } catch (err) {
      logger.error(`group handler error: ${err?.message || err}`)
    }
  })
}
