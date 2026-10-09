<div align="center">

# ZapoBot

[![version](https://img.shields.io/badge/version-1.0.0-blue?style=flat-square)](package.json)
[![node](https://img.shields.io/badge/node-%3E%3D20.9.0-green?style=flat-square)](https://nodejs.org)
[![whatsapp](https://img.shields.io/badge/whatsapp-zapo--js-25D366?style=flat-square)](https://zapo.to/llms.txt)
[![store](https://img.shields.io/badge/store-sqlite-orange?style=flat-square)](https://www.npmjs.com/package/@zapo-js/store-sqlite)
[![license](https://img.shields.io/badge/license-ISC-lightgrey?style=flat-square)](package.json)

**A modular, production-ready WhatsApp bot on [zapo-js](https://zapo.to/llms.txt) with a file-based command plugin system.**

</div>

---

## Table of contents

- [Features](#features)
- [Requirements](#requirements)
- [Quickstart](#quickstart)
- [Pairing](#pairing)
- [Configuration](#configuration)
- [Commands](#commands)
- [Writing a plugin](#writing-a-plugin)
- [Project layout](#project-layout)
- [Troubleshooting](#troubleshooting)

## Features

- **Plugin architecture** — drop a file into `commands/<category>/`, it loads on boot with alias and cooldown support
- **Guard middleware** — `ownerOnly`, `groupOnly`, `privateOnly`, `adminOnly`, `botAdmin` enforced before every execution
- **PN/LID aware** — sender resolution uses `participantAlt`/`remoteJidAlt` fallback, so owner checks work in LID-addressed groups
- **Resilient session** — SQLite credential store, QR rotation, 8-digit pairing codes, exponential-backoff reconnect with jitter
- **Fast at scale** — parallel plugin loading, LRU group-metadata cache with in-flight dedup, batched broadcasts, fire-and-forget read receipts
- **Clean observability** — zero-dependency pretty logger (`HH:MM:SS LVL [component] msg key=value`) with level filtering

## Requirements

- Node.js `>= 20.9.0`
- A WhatsApp account for linking (companion device)

## Quickstart

```bash
cp .env.example .env
npm install
npm start
```

For live reload during development:

```bash
npm run dev
```

## Pairing

Pairing defaults to an 8-digit code. Set your full international number in `.env`:

```env
PAIRING_NUMBER=1551999999999
```

The code is printed in the terminal — enter it via **Linked devices → Link with phone number instead**. While a code is active the QR is suppressed. If `PAIRING_NUMBER` is empty, the bot asks for it interactively; leave it blank (or if the code request fails) to fall back to QR.

**QR fallback.** A QR renders in the terminal — scan it from **WhatsApp → Linked devices → Link a device** before it expires.

> Some accounts are passkey-gated by the server. The bot logs a warning in that case; link approval must happen on the primary device.

## Configuration

All settings live in `.env`:

| Key | Default | Description |
| --- | ------- | ----------- |
| `PREFIXES` | `!` | Command prefixes, separated by comma or space |
| `SESSION_ID` | `default` | Session key inside the store |
| `AUTH_PATH` | `.auth/state.sqlite` | Credential and Signal storage |
| `BOT_NAME` | `ZapoBot` | Name shown in `help` |
| `OWNER_NUMBERS` | — | Owner numbers, e.g. `1551999999999,1551888888888` |
| `PAIRING_NUMBER` | — | Phone number for code pairing |
| `LOG_LEVEL` | `info` | Bot logs: `trace`, `debug`, `info`, `warn`, `error` |
| `ZAPO_LOG_LEVEL` | `warn` | Library (socket/noise/auth) logs, kept quiet in prod |
| `MARK_ONLINE` | `false` | Announce online on connect |
| `HISTORY_FULL_SYNC` | `true` | Request full archive on pairing |
| `AUTO_READ` | `true` | Send read receipts |
| `AUTO_TYPING` | `true` | Show typing during commands |
| `WELCOME` | `true` | Greet new group members |
| `MAX_RECONNECT` | `20` | Reconnect attempts before giving up |

## Commands

| Category | Commands |
| -------- | -------- |
| `general` | `ping`, `help`, `echo`, `info`, `id`, `runtime` |
| `group` | `tagall`, `hidetag`, `kick`, `add`, `promote`, `demote`, `subject`, `desc`, `open`, `close`, `link`, `leave` |
| `owner` | `eval`, `exec`, `logout`, `bc` |
| `tools` | `calc`, `react` |

Run `!help <name>` in chat for per-command usage. Owner shortcuts bypass the prefix: `$ <shell>` for `exec`, `=> <js>` or `> <js>` for `eval`.

## Writing a plugin

Create `commands/<category>/<name>.js`. Every field except `name` and `execute` is optional:

```js
export default {
  name: 'hello',
  aliases: ['hi'],
  description: 'say hello',
  usage: 'hello <name>',
  category: 'general',
  cooldown: 3,
  ownerOnly: false,
  groupOnly: false,
  privateOnly: false,
  adminOnly: false,
  botAdmin: false,
  async execute(ctx) {
    await ctx.reply(`hello ${ctx.text || ctx.pushName}`)
  }
}
```

The context (`ctx`) exposes:

| Field | Description |
| ----- | ----------- |
| `client` | The `WaClient` instance |
| `event` | Raw incoming message event |
| `jid` / `senderJid` / `senderAltJid` | Chat, sender, and PN/LID alternate |
| `args` / `text` / `prefix` / `command` | Parsed invocation |
| `reply(content, opts)` / `send(content, opts)` | Quoted and plain sends |
| `react(emoji)` | React to the invoking message |
| `isGroup` / `isOwner` | Chat and owner flags |
| `registry` / `config` | Plugin map and bot config |

Target a user from a mention, reply, or number with `resolveTarget(ctx)` from `src/services/group.js`, and check adminship with `isAdmin(client, groupJid, jid)`.

## Project layout

```text
src/index.js             bootstrap and shutdown hooks
src/config.js            validated env config
src/logger.js            pretty level-filtered logger
src/client.js            WaClient factory
src/store.js             SQLite store builder
src/auth.js              QR and pairing-code flow
src/connection.js        backoff reconnect loop
src/loader.js            parallel plugin loader
src/context.js           PN/LID-aware ctx builder
src/middleware.js        permission and cooldown guards
src/events/message.js    prefix router
src/events/group.js      welcome handler
src/services/group.js    cached metadata, admin checks, target parsing
src/utils/               jid, text, time, cooldown helpers
commands/                23 plugins across general, group, owner, tools
```

## Troubleshooting

| Symptom | Fix |
| ------- | --- |
| QR expired | A fresh QR re-renders automatically; scan the latest one |
| `logged out` on connect | Session was unlinked — delete `.auth/` and re-pair |
| Owner commands rejected | Check `OWNER_NUMBERS` uses full international format without `+` |
| Bot must be admin | Promote the bot in group settings first |
| High memory over time | Lower `HISTORY_FULL_SYNC` load or clear `.auth/state.sqlite` mailbox |

## License

ISC. Built on [zapo-js](https://zapo.to/llms.txt) — see its docs for protocol details.
