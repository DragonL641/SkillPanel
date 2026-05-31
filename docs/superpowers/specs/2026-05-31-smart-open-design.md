# Smart Open: `skillpanel` Bare Command Enhancement

## Problem

When `skillpanel` is already running, running `skillpanel` again shows "already running" and exits. Users must manually open the browser. The desired behavior: running `skillpanel` should always result in the browser opening — either to an already-running instance, or after starting one.

## Decision

- Bare command `skillpanel` (no subcommand) maps to new `open` command instead of `start`
- `skillpanel start` behavior unchanged (pure daemon start, no browser)
- New `skillpanel open` subcommand documented in `--help`

## File Changes

| File | Change |
|------|--------|
| `cli.js` | Default command `start` → `open`, add `open` to COMMANDS map, add to HELP text |
| `cli/commands/open.js` | **New file** — smart launch logic |
| `cli/daemon.js` | No changes |
| `cli/commands/start.js` | No changes |

## `open.js` Logic

```
1. getRunningPid() → check if process alive
2. If running:
   a. GET http://localhost:{port}/api/health (5s timeout)
   b. 200 → open browser → exit 0
   c. Not ready → poll log for "server started" (up to 10s), then open browser → exit
3. If not running:
   a. Spawn daemon (same as start.js)
   b. Poll log for "server started" (up to 10s)
   c. Open browser → exit 0
4. On startup failure → print error, exit 1 (no browser open)
5. On health-check timeout → print warning, still try to open browser
```

### Browser Opening

- Package: `open` (npm)
- Usage: `await open(url)` — opens in system default browser
- Cross-platform: macOS (`open`), Linux (`xdg-open`), Windows (`start`)

### Health Check

- `GET /api/health` with 5s timeout using native `fetch` (Node 18+)
- Confirms server is actually serving, not just process alive

## Error Handling

| Scenario | Behavior |
|----------|----------|
| Process alive but not ready yet | Wait for readiness, then open |
| Startup fails (child error/exit) | Print error, exit 1, no browser |
| Health check timeout (5s) | Print warning, attempt browser open anyway |
| Startup log timeout (10s) | Print timeout warning, exit 1 |

## Dependencies

- Add `open` as production dependency

## Testing

- Manual verification: bare command with no process, with running process, with starting-but-not-ready process
- Existing `start` command tests unaffected
