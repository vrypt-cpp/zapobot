import qrcode from 'qrcode-terminal'
import readline from 'node:readline'
import { config } from './config.js'
import { logger } from './logger.js'

function askNumber() {
  return new Promise((resolve) => {
    if (!process.stdin.isTTY) {
      resolve('')
      return
    }
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
    rl.question('phone number for pairing code (empty for QR): ', (answer) => {
      rl.close()
      resolve(answer.replace(/\D/g, ''))
    })
  })
}

export function registerAuth(client) {
  let pairingCodeTried = false
  let codeActive = false

  async function tryPairingCode() {
    if (pairingCodeTried) return false
    pairingCodeTried = true
    let number = config.pairingNumber
    if (!number || number.length < 5) number = await askNumber()
    if (!number || number.length < 5) return false
    try {
      const code = await client.auth.requestPairingCode(number)
      codeActive = true
      logger.info(`enter this code on your phone: ${code.match(/.{1,4}/g)?.join('-')}`)
      return true
    } catch (err) {
      logger.error(`pairing failed: ${err?.message || err}`)
      return false
    }
  }

  client.on('auth_qr', ({ qr, ttlMs }) => {
    if (codeActive) return
    void tryPairingCode().then((ok) => {
      if (ok) return
      qrcode.generate(qr, { small: true })
      logger.info(`scan the QR within ${ttlMs}ms`)
    })
  })
  client.on('auth_pairing_code', ({ code }) => {
    logger.info(`pairing code: ${code}`)
  })
  client.on('auth_pairing_required', async () => {
    if (codeActive) return
    const ok = await tryPairingCode()
    if (!ok) logger.info('waiting for QR scan')
  })
  client.on('auth_passkey_required', ({ hasSigner }) => {
    if (!hasSigner) logger.warn('account requires a passkey, server aborted pairing')
  })
  client.on('auth_paired', ({ credentials }) => {
    logger.info(`paired as ${credentials.meJid}`)
  })
  client.on('connection', (event) => {
    if (event.status === 'close' && event.isLogout) {
      pairingCodeTried = false
      codeActive = false
    }
  })
}
