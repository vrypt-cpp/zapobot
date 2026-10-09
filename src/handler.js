import { registerMessageHandler } from './events/message.js'
import { registerGroupHandler } from './events/group.js'

export function registerHandler(client, registry) {
  registerMessageHandler(client, registry)
  registerGroupHandler(client)
}
