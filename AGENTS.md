# AGENTS.md

## Repo

ESM Node bot (`"type": "module"`, Node `>=20.9.0`). Entry: `src/index.js`. No tests, lint, or typecheck — only `npm start` / `npm run dev`.

## Hard conventions

- **No code comments.** No `//` or `/* */` in `src/` or `commands/`. Verify with `grep -rn '^\s*//' src commands`. URLs are fine; there are none in code.
- **Commands never import `src/index.js`.** It calls `client.connect()` at module top level, so importing it connects and creates circular imports. Shared boot values live in `src/state.js`.
- **Import paths:** files in `src/events/` use `../` to reach `src/` modules; `src/middleware.js` uses `./`. Both have crashed the boot before — always re-verify after touching imports.

## Verify (no test suite)

```bash
for f in $(find src commands -name '*.js'); do node --check "$f" || echo "FAIL $f"; done
node --input-type=module -e "import { loadCommands, uniqueCommands } from './src/loader.js'; const r = await loadCommands('./commands'); console.log(uniqueCommands(r).length)"
```

## Boot test

`node src/index.js` opens a real WhatsApp socket and prints a QR. Never run it unbounded — it blocks waiting for a scan and writes `.auth/`:

```bash
timeout 12 node src/index.js 2>&1 | head -8
```

Success = `loaded N commands` + `socket open` lines. Missing `.env` is fine (dotenv prints `injected env (0)`); copy from `.env.example` only when testing env-dependent behavior.

## Plugin contract

`commands/<category>/<name>.js` exports default `{ name, aliases?, triggers?, description, usage?, category, cooldown?, ownerOnly?, groupOnly?, privateOnly?, adminOnly?, botAdmin?, execute(ctx) }`. `triggers?` are prefix-less symbols matched longest-first (e.g. `$`, `=>`). `ctx` (`src/context.js`) gives `client, event, jid, senderJid, senderAltJid, args, text, prefix, reply, send, react, isGroup, isOwner, registry`.

## Commits

Conventional Commits: `feat:`, `fix:`, `docs:`, `refactor:`, `perf:`, `chore:`. Imperative subject, lowercase, no trailing period, max ~72 chars. Examples: `feat: add prefix-less triggers with exec command`, `fix: eval circular JSON crash with util.inspect`. One logical change per commit.

## zapo specifics

- No auto-reconnect in the library — `src/connection.js` owns the backoff loop; `isLogout` means stop, do not retry.
- Logger is a custom `PrettyLogger` implementing zapo's `Logger` interface (`level`, 5 methods, `child(bindings)`). Level filter + `NO_COLOR`/non-TTY handling already in `src/logger.js`.
- PN/LID: sender identity is `key.participant ?? key.remoteJid` with alt `key.participantAlt ?? key.remoteJidAlt`. Owner checks must test both numbers (`src/context.js` does). Replies in groups always target `key.remoteJid`; `message.send` accepts PN or LID. Group metadata `participants[].jid` follows the group's addressing mode — never synthesize JIDs from phone numbers for mentions.
- `src/services/group.js` caches metadata (LRU 200, 5-min TTL) with in-flight dedup; `tagall`/`hidetag` intentionally use the cache, not forced refresh.
