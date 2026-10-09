# ZapoBot Developer Guide

Codebase documentation for contributors. For setup and usage, see [README.md](README.md). For agent sessions, see [AGENTS.md](AGENTS.md).

## Table of contents

- [Architecture](#architecture)
- [Boot sequence](#boot-sequence)
- [Message pipeline](#message-pipeline)
- [Module reference](#module-reference)
- [Plugin system](#plugin-system)
- [Guard order](#guard-order)
- [Identity resolution](#identity-resolution)
- [Echo suppression](#echo-suppression)
- [Pairing flow](#pairing-flow)
- [Reconnect behavior](#reconnect-behavior)
- [Hot reload internals](#hot-reload-internals)
- [Logging internals](#logging-internals)
- [Store layout](#store-layout)
- [Config parsing](#config-parsing)
- [Error handling](#error-handling)
- [Performance notes](#performance-notes)
- [Testing cookbook](#testing-cookbook)
- [Conventions](#conventions)
- [Verification](#verification)
- [Known gotchas](#known-gotchas)

## Architecture

```text
WhatsApp servers
      │  Noise-encrypted frames (managed by zapo-js)
      ▼
WaClient ──┬── message ──► message_send / message ──► src/events/message.js
           ├── presence ─► chat-state (typing indicators)
           ├── group ────► group events ────────────► src/events/group.js
           ├── auth ─────► auth_qr / pairing / paired ► src/auth.js
           └── connection ► open / close ───────────► src/connection.js

src/events/message.js ──► src/middleware.js (guards) ──► commands/*/​*.js (execute(ctx))
src/services/* ── shared domain logic (group metadata, echo tracking)
src/utils/* ── pure helpers (jid, text, time, cooldown)
```

The bot owns no protocol code. All WhatsApp behavior comes from `zapo-js`; this repo is routing, guards, state, and plugins. `src/state.js` is the only module plugins may import that relates to boot — it has no side effects.

## Boot sequence

`src/index.js` executes top to bottom, all side effects inline:

1. `dotenv.config()` loads `.env` (also called in `src/config.js`, so standalone module imports work in tests).
2. `buildStore()` creates the parent dir of `AUTH_PATH` and builds the SQLite store.
3. `buildClient(store)` constructs `WaClient` with `sessionId`, `markOnlineOnConnect`, `recoverFromClientTooOld: true`, history options, and the library-level logger.
4. `loadCommands(commands/)` walks the tree sorted, imports every `.js` file in parallel, normalizes definitions, and returns the shared registry `Map` with `rev = 1`.
5. `registerAuth`, `registerConnection`, `registerHandler` attach event listeners.
6. `watchCommands` starts when `HOT_RELOAD=true`.
7. `SIGINT`/`SIGTERM` disconnect cleanly; `unhandledRejection`/`uncaughtException` are logged, never thrown.
8. `await client.connect()` blocks. First boot drives pairing; later boots resume credentials from the store.

## Message pipeline

Each incoming `message` event flows through these stages inside `registerMessageHandler`:

| # | Stage | Code | Detail |
| - | ----- | ---- | ------ |
| 1 | Filter | `events/message.js` | Drop missing `remoteJid`, `@newsletter`, `status@broadcast` |
| 2 | Echo filter | `services/echo.js` | Drop `fromMe` whose stanza id came from `message_send` |
| 3 | Receipt | `client.message.sendReceipt(event, {type:'read'})` | Fire-and-forget when `AUTO_READ=true`, all messages |
| 4 | Extract | `utils/text.js` | `conversation`, `extendedTextMessage.text`, image/video/document captions |
| 5 | Trigger match | `loader.js triggerIndex` | Prefix-less symbols longest-first (`=>` beats `>`) |
| 6 | Prefix parse | `parseBody` | `PREFIXES`, longest-first; unknown names ignored silently |
| 7 | Context | `context.js` | `buildContext(client, event, config, {command, args, text, prefix, registry})` |
| 8 | Guards | `middleware.js` | Permission + cooldown gates, each failure replies the reason |
| 9 | Execute | `def.execute(ctx)` | Wrapped in typing indicators when `AUTO_TYPING=true` |

Example trace for `!tagall hello` from a group admin:

```text
message{key:{remoteJid:'12036@g.us', participant:'...@lid', fromMe:false}}
→ echo? no → receipt (void) → raw='!tagall hello'
→ no trigger hit → prefix '!' body='tagall hello' → registry.get('tagall')
→ guards: groupOnly ok, adminOnly → isAdmin via cached metadata ok
→ typing composing → execute → typing paused
```

Any throw in stages 7–9 is caught, logged, and answered with `failed to run the command` quoting the original.

## Module reference

### `src/config.js`

Exports `config`. Parsers: `toBool` accepts `1/true/yes/on` (case-insensitive); `toList` splits on whitespace, `,`, `;`, `|` and dedupes; `toCount` floors finite non-negative numbers or falls back. `prefixes` is sorted longest-first so overlapping prefixes (`!` vs `!!`) match correctly. `owners` is pre-normalized to bare digits.

### `src/logger.js`

`PrettyLogger` implementing the zapo `Logger` contract. Constructor `(level = 'info', bindings = {})`. `child(bindings)` returns a new instance with merged bindings. Two singletons: `logger` (`LOG_LEVEL`, default `info`) for bot code, `libLogger` (`ZAPO_LOG_LEVEL`, default `warn`) passed to `WaClient` — the library calls `.child({component})` internally, so the warn level propagates to the whole socket/noise/auth subtree.

### `src/client.js`

`buildClient(store) -> WaClient`. Fixed options: `recoverFromClientTooOld: true` (one-shot version refetch on HTTP 405), history `{enabled: true, requireFullSync}`.

### `src/store.js`

`buildStore()` creates one `sqlite` backend (`driver: 'auto'` → `better-sqlite3`, falling back to `node:sqlite`) and routes every persistence domain to it: `auth, signal, preKey, session, identity, senderKey, appState, privacyToken, messages, threads, contacts`.

### `src/auth.js`

- `auth_qr`: tries the pairing code first when possible; renders the QR only if no code path applies. Suppressed entirely while a code is active.
- `auth_pairing_code`: logs the issued code.
- `auth_pairing_required`: fallback trigger for the code path; logs `waiting for QR scan` when no number is available.
- `auth_passkey_required`: warns when the server demands a passkey with no signer configured.
- `auth_paired`: logs the linked JID.
- `connection` close with `isLogout`: resets the pairing latch so a later re-pair can use a code again.
- `askNumber()`: interactive TTY prompt for the phone number; resolves `''` when stdin is not a TTY.

State kept in closure: `pairingCodeTried` (one attempt per pairing flow, prevents QR-rotation spam and repeated prompts) and `codeActive` (suppresses QR while a code is pending).

### `src/connection.js`

Backoff reconnect: `delay = min(30s, 2^attempt * 1s)` with ±20% jitter. `open` resets the counter and fires the optional `onOpen`. `close` with `isLogout` stops (credentials are gone); otherwise reconnects. `MAX_RECONNECT=0` means retry forever.

### `src/loader.js`

| Export | Signature | Behavior |
| ------ | --------- | -------- |
| `loadCommands` | `(dir) -> Promise<Map>` | Fresh registry, plain imports, `rev = 1` |
| `reloadCommands` | `(registry, dir) -> Promise<Command[]>` | Clears and rebuilds in place with `?t=` cache-busters |
| `reloadFile` | `(registry, file) -> Promise<Command[]>` | Purges keys from that file, re-imports if it still exists |
| `purgeFile` | `(registry, file)` | Deletes every key whose record came from the file |
| `bumpRegistry` | `(registry) -> number` | Increments the `rev` expando |
| `uniqueCommands` | `(registry) -> Command[]` | Deduped values sorted by name |
| `triggerIndex` | `(registry) -> [trigger, Command][]` | First-wins per symbol, sorted longest-first |

`normalize` lowercases names/aliases, dedupes triggers, floors positive cooldowns, coerces guard flags. Invalid modules (no `name` or non-function `execute`) are skipped with a warning; name/alias collisions warn but last-writer-wins.

### `src/watcher.js`

`watchCommands(registry, dir)`: watches `commands/` plus each category subdirectory individually (no `recursive` flag — not portable to Linux). `.js`-only, 300 ms debounce, batched: changed files go through `reloadFile`, root-level events (new/deleted categories) trigger a full `reloadCommands`. Logs per-file results with the active command count.

### `src/context.js`

`buildContext(client, event, config, extra) -> ctx`. Derives `jid`, `senderJid`/`senderAltJid`, bare numbers, `isGroup`, and the fast-path `isOwner` (both numbers vs `config.owners`). Helpers: `reply` (quotes the invoking message), `send` (plain), `react` (reaction, failures swallowed).

### `src/middleware.js`

`runGuards(ctx, def) -> Promise<boolean>`. See [Guard order](#guard-order).

### `src/events/message.js`

Owns the pipeline above plus a cached trigger index: rebuilt only when the registry object or its `rev` changes, so reloads (including new triggers) take effect without re-registering listeners.

### `src/events/group.js`

Drops the group-metadata cache on every group event, then (when `WELCOME=true`) greets `action: 'add'` participants with mentions.

### `src/services/echo.js`

`markEcho(id)` / `isEcho(id)`: bounded `Map` (1000 entries, 60 s TTL each). `isEcho` lazily expires entries. Prevents the bot's own sends from re-entering the router while letting the owner's hand-typed messages through.

### `src/services/group.js`

- `groupMetadata(client, jid, force?)`: 5-minute TTL, LRU capped at 200 groups, in-flight dedup via a `pending` map so concurrent misses share one query.
- `dropGroupCache(jid?)`: single or full invalidation.
- `matchId(row, jid)`: compares normalized numbers across `jid`, `phoneNumber`, and `lid` columns.
- `findParticipant(meta, jid)`, `participantNumbers(row)`: lookup + all bare numbers of a row.
- `isAdmin` / `isBotAdmin`: admin check against live-or-cached metadata.
- `resolveTarget(ctx)`: quoted participant → first mention → bare-digit arg → `s.whatsapp.net` JID, else `null`. Reads `contextInfo` from text and all caption types.

### `src/utils/jid.js`

`normalizeNumber`, `numberToJid`, `jidToNumber` (strips `:device` and domain), predicates `isGroupJid`/`isNewsletterJid`/`isStatusJid`/`isLidJid`/`isPhoneJid`, `senderOf` (`participant ?? remoteJid`), `senderAltOf` (`participantAlt ?? remoteJidAlt`), `mentionTag`.

### `src/utils/text.js`

`extractText` (conversation, extended text, image/video/document captions) and `quotedContext` (contextInfo from the same set) shared by the router, `resolveTarget`, and `react`.

### `src/utils/time.js` / `src/utils/cooldown.js`

`formatUptime` (`2h 5m 3s`), `formatLatency`. `checkCooldown(key, seconds) -> remaining seconds`: single lazy 60 s sweep timer (`unref`ed so it never holds the process open).

## Plugin system

Full field reference (only `name` + `execute` required):

| Field | Type | Meaning |
| ----- | ---- | ------- |
| `name` | `string` | Primary name, lowercased |
| `aliases` | `string[]` | Alternate names |
| `triggers` | `string[]` | Prefix-less symbols, longest-first (`=>` beats `>`) |
| `description` / `usage` | `string` | Shown by `help` |
| `category` | `string` | Directory-derived grouping, defaults `general` |
| `cooldown` | `number` | Seconds per sender, floored, `0` disables |
| `ownerOnly` / `groupOnly` / `privateOnly` / `adminOnly` / `botAdmin` | `boolean` | Guards |
| `execute` | `(ctx) -> Promise<void>` | Handler |

Current inventory (25): `general` — ping, help, echo, info, id, runtime; `group` — tagall, hidetag, kick, add, promote, demote, subject, desc, open, close, link, leave; `owner` — eval, exec, logout, bc, reload; `tools` — calc, react.

## Guard order

1. `ownerOnly` → `resolveOwner` (fast path, else group-metadata lookup); reply `owner only`
2. `groupOnly` / `privateOnly` → replies `groups only` / `private chat only`
3. `adminOnly` → owner counts as admin, else live `isAdmin`; reply `group admins only`
4. `botAdmin` (groups only) → reply `bot must be admin`
5. Cooldown → reply `wait Ns`

## Identity resolution

```text
event.key
 ├─ participant ?? remoteJid ──────────► senderJid ──► senderNumber ──┐
 ├─ participantAlt ?? remoteJidAlt ───► senderAltJid ─► senderAltNumber ┤──► ctx.isOwner?
 └────────────────────────────────────────────────────────────────────┘
        │ miss in group?                                    │
        ▼                                                   │
groupMetadata(jid) → findParticipant(senderJid)             │
        → participantNumbers(row) vs OWNER_NUMBERS ──────────┘──► resolveOwner
```

- 1:1 chats: sender is `remoteJid`, alternate is `remoteJidAlt`. Prefer replying to the peer's LID when known.
- Groups: always send to the group JID (`remoteJid`), never to a participant. Mentions reuse participant JIDs from metadata verbatim — they already follow the group's addressing mode.
- Reactions/edits/revokes/pins build keys as `{remoteJid (forced to recipient), fromMe, id, participant?}` with `participant` only in groups (see `react`).

## Echo suppression

```text
bot sends ──► message_send{id} ──► markEcho(id)
server echo ──► message{fromMe, id} ──► isEcho(id)? drop : process
owner types ──► message{fromMe, new id} ──► not tracked ──► process
```

Residual risk (untracked ids) is bounded: command outputs carry no trigger, so at most one extra hop can occur, never a loop.

## Pairing flow

```text
connect() ──► noise handshake ──► server: pairing required
  ├─ auth_qr ──► try code (env number, else TTY prompt, once)
  │               ├─ ok ──► log code, suppress further QRs
  │               └─ fail/empty ──► render QR
  ├─ auth_pairing_code ──► log issued code
  ├─ auth_pairing_required ──► fallback code attempt / wait for QR
  ├─ auth_passkey_required{hasSigner:false} ──► warn, manual approval needed
  └─ auth_paired ──► credentials persisted, QR never shown again
```

`requestPairingCode` requires an active connection, which holds at the first `auth_qr` — that is why the code path triggers there rather than waiting for `auth_pairing_required`, which fresh sessions never emit.

## Reconnect behavior

| Close reason | Action |
| ------------ | ------ |
| `open` | Reset backoff, optional `onOpen` |
| `close`, `isLogout: false` | Backoff + jitter, up to `MAX_RECONNECT` (`0` = forever) |
| `close`, `isLogout: true` | Stop. Credentials are gone; re-pair required. Also resets the pairing latch. |

Connection-scoped state (presence subscriptions, newsletter live updates) must be re-established by the app after `open`; persisted state restores from the store automatically.

## Hot reload internals

```text
save plugin ──► fs.watch (per-dir) ──► debounce 300ms ──► reloadFile ──► rev++
new category ──► root event ──► reloadCommands (full rescan)
delete file ──► purgeFile drops name + aliases
router ──► rev changed? rebuild trigger index : reuse cache
```

`registry.rev` is an expando on the shared `Map` — never copy or spread the registry or the revision is lost.

## Logging internals

```text
bot code ──► logger (LOG_LEVEL, default info) ──► stdout (info/debug/trace) / stderr (warn/error)
WaClient ──► libLogger (ZAPO_LOG_LEVEL, default warn) ──► .child({component}) inherits level
```

Line shape: `HH:MM:SS LVL [component] message key=value`. Empty contexts print nothing (no trailing `undefined`), `Error` prints its stack, nesting beyond depth 2 stringifies. Colors honor `NO_COLOR` and drop off-TTY.

## Store layout

One SQLite backend (`driver: 'auto'`), all domains routed to it: `auth`, `signal`, `preKey`, `session`, `identity`, `senderKey`, `appState`, `privacyToken`, `messages`, `threads`, `contacts`. The file at `AUTH_PATH` holds credentials and Signal state — anyone with read access can impersonate the device. `logout()` wipes everything except the mailbox archive by default (zapo `logoutStoreClear` semantics).

## Config parsing

| Parser | Rule |
| ------ | ---- |
| `toBool` | `1`, `true`, `yes`, `on` (case-insensitive) → true, else fallback |
| `toList` | Split on whitespace/`, ; |`, trim, dedupe, drop empties |
| `toCount` | Floor finite numbers `>= 0`, else fallback |
| `prefixes` | `PREFIXES` or legacy `PREFIX`, sorted longest-first, defaults `['!']` |
| `owners` | Pre-normalized to bare digits at load |
| `pairingNumber` | Non-digits stripped |

Falsy-but-present values (`''`) fall back to defaults for `sessionId`, `authPath`, `botName`, `logLevel`.

## Error handling

- Router: per-message try/catch → log + `failed to run the command` quoted reply.
- Loader: per-file try/catch → log, skip, continue booting with the rest.
- Watcher: per-flush try/catch → log, keep watching.
- Process: `unhandledRejection`/`uncaughtException` log without exiting; `SIGINT`/`SIGTERM` disconnect (flushes write-behind) then exit.
- Presence/typing calls: `.catch(() => {})` — cosmetic features never fail commands.

## Performance notes

Measured or structural wins already in the tree:

- Plugin boot import is parallel (`Promise.all` over ~25 files).
- Group metadata: one live query per group per 5 minutes max; concurrent misses share a single in-flight promise; LRU cap bounds memory.
- Trigger index rebuilds only on `registry.rev` change, not per message.
- Reloads are per-file; full rescans happen only for root-level changes and manual `!reload`.
- Read receipts and typing indicators are fire-and-forget — zero added latency on the command path.
- Broadcast fans out in batches of 5 concurrent sends with `allSettled` accounting.
- Cooldown and echo maps self-prune (60 s sweep / TTL expiry).

## Testing cookbook

No suite — use throwaway scripts with fake clients:

```bash
node --input-type=module -e "
import { registerMessageHandler } from './src/events/message.js';
const handlers = {};
const sent = [];
const fake = {
  on: (ev, fn) => { handlers[ev] = fn; },
  message: { send: async (j, c) => { sent.push(c); return { id: 'x' }; }, sendReceipt: async () => ({}) },
  presence: {}
};
registerMessageHandler(fake, new Map([['ping', { name: 'ping', aliases: [], cooldown: 0,
  execute: async (ctx) => { sent.push('PONG'); } }]]));
await handlers['message']({ key: { remoteJid: '1@s.whatsapp.net', fromMe: false, id: 'm1' },
  message: { conversation: '!ping' }, pushName: 'U' });
console.log(sent);
"
```

Set env before the import when identity matters (`OWNER_NUMBERS=... node --input-type=module -e "..."`), since `config.js` evaluates at import time. For routing/guard tests, emulate `message_send` before the `fromMe` echo to exercise suppression.

## Conventions

- No code comments in `src/` or `commands/` — enforced by CI (`grep -rn '^\s*//'`).
- Plugins import `src/state.js`, `src/services/*`, `src/utils/*` — never `src/index.js` (connects on import).
- Conventional Commits (`feat/fix/docs/refactor/perf/chore`), imperative, lowercase, ≤72 chars, one logical change per commit.
- Prefer shared helpers over duplication: quoted/media context lives in `utils/text.js`, participant matching in `services/group.js`.

## Verification

Per change: `node --check` every file under `src/` and `commands/`, the no-comment grep, the loader smoke test, and a targeted behavioral script as above (all in `AGENTS.md`). The bounded boot test (`timeout 12 node src/index.js`) proves wiring, QR/code pairing start, and socket reachability only.

## Known gotchas

- `auth_pairing_required` does not fire on fresh sessions; the code path triggers off the first `auth_qr` instead (documented as valid by zapo).
- `client.message.send` resolves `{ id }`, but `message_send.id` can be undefined — echo filtering degrades gracefully.
- Group sends derive `addressingMode` server-side; pass participant JIDs from metadata verbatim for mentions.
- `registry.rev` is an expando on the shared `Map` — copies/spreads drop it; always mutate in place.
- dotenv runs twice (entry + config) and logs twice; harmless, keeps standalone imports working.
- `new Function` in `eval`/`calc` throws on malformed input — both catch and reply the error.
- `exec` output is capped only by `maxBuffer` (512 KB) and `MAX_REPLY` (`0` = unlimited) — long outputs can flood chats.
