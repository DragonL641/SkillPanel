# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SkillPanel is a lightweight Web UI for managing Claude Code skills — browse custom skills (enable/disable via symlinks), view plugin skills (read-only), and trigger AI-powered skill analysis. Single-process Node.js app distributed as an npm package.

## Commands

```bash
npm run dev        # Start dev server (tsx runs Express + Vite HMR)
npm run build      # Build frontend with Vite to dist/
npm run start      # Production mode (NODE_ENV=production via cross-env)
npx vitest         # Run tests (vitest, no npm script defined)
npx vitest --run   # Single run (no watch)

# CLI subcommands (after npm install -g):
skillpanel         # Start in background (same as 'skillpanel start')
skillpanel start   # Start in background, stream startup logs, return to terminal
skillpanel stop    # Stop background process
skillpanel status  # Show running status, PID, URL
skillpanel logs    # Tail application logs (Ctrl+C to stop)
skillpanel serve   # Run in foreground (for development)
skillpanel --help  # Show help
```

No linter is configured. No vitest config — runs with defaults.

## Architecture

**Single-process design**: Express serves both the REST API and the React frontend (via vite-express). In dev, Vite provides HMR; in production, Express serves the built `dist/` assets. Published as npm package `@dragonl641/skillpanel` — `cli.js` is the bin entry point with subcommand dispatch (`start`/`stop`/`status`/`serve`/`logs`).

### CLI (`cli/`)

- `cli.js` — Entry point, parses subcommand and dispatches to `cli/commands/`
- `daemon.js` — Shared utilities: PID file management (`~/.skillpanel/skillpanel.pid`), log path (`~/.skillpanel/skillpanel.log`), process alive checks, config port reading
- `commands/start.js` — Background daemon: spawns detached child, streams startup logs to terminal, waits for "server started" confirmation
- `commands/stop.js` — Sends SIGTERM to background process, waits up to 5s, force-kills if needed
- `commands/status.js` — Reads PID file, checks process alive, displays URL and log path
- `commands/serve.js` — Foreground mode (original behavior): stdio inherit, signal relay
- `commands/logs.js` — Tails `~/.skillpanel/skillpanel.log` to stdout

### Backend (`server/`)

- `index.ts` — Express entry point, mounts all route modules, binds vite-express with explicit `viteConfigFile` path (resolves correctly regardless of CWD), handles graceful shutdown (SIGINT/SIGTERM aborts background analysis, closes server, force-exits after 3s)
- `config.ts` — Load/save `skillpanel.config.json` (JSON file persistence, no database)
- `errors.ts` — `HttpError` hierarchy: `ValidationError` (400), `NotFoundError` (404), `ConflictError` (409). Service layer throws these; global error middleware in `index.ts` maps to status codes
- `routes/` — REST API handlers (config, skills, plugins, analysis, summary, search, fs, projects, groups)
- `services/` — Business logic:
  - `skill-scanner.ts` — Recursively scans custom skill directory (with `SKIP_ENTRIES` exclusion set: `__pycache__`, `dist`, `build`, `.git`, `.venv`, etc.), builds tree, computes content hashes, checks symlink enabled status
  - `plugin-scanner.ts` — Reads `~/.claude/plugins/installed_plugins.json`, discovers skills via `marketplace.json` or `skills/` dir
  - `skill-manager.ts` — Creates/removes symlinks in `~/.claude/skills/` to enable/disable skills. Validates paths, handles edge cases (already enabled/disabled, missing directories)
  - `analyzer.ts` — Calls Claude API for skill analysis, caches results by content hash in `~/.skillpanel/analysis-cache.json`
  - `hash-utils.ts` — `computeContentHash()` and `collectSkillContent()` with `SKIP_DIRS` exclusion (avoids `__pycache__`, `.git`, etc.)
  - `cache.ts` — In-memory TTL cache (5s default) used by route handlers for list operations. `getOrCompute()` pattern with `invalidate()` on mutations. Cache keys follow conventions: `'config'`, `'skills:custom'`, `'skills:plugins'`; mutations call `invalidateByPrefix('skills:')`
  - `logger.ts` — Structured JSON logger (`{timestamp, level, message, context}`)
  - `group-manager.ts` — Skill groups CRUD, slug generation, skill-to-group association
  - `project-scanner.ts` — Project registration and per-project skill scanning
  - `native-dialog.ts` — OS-native folder picker via `osascript` (macOS) or `zenity` (Linux)

### Frontend (`src/`)

- React + Tailwind CSS (v4, imported via `@import "tailwindcss"` in index.css)
- Tailwind v4 `@theme` in `index.css` defines semantic color tokens (`surface-primary`, `fg-primary`, `accent`, `success`, `danger`, `warning`, `border`, etc.) — use these instead of raw color values
- `App.tsx` — Main shell: tabs (global/plugin/project), search, data fetching, project sidebar, and modal orchestration
- `api/client.ts` — `apiFetch<T>()` wrapper that handles error parsing and content-type validation; all API calls are one-liners using it
- State managed via custom hooks (`src/hooks/useSkills.ts`, `usePlugins.ts`, `useProjects.ts`) — no global state library
- i18n via `i18next` + `react-i18next` with `zh-CN` (default/fallback) and `en` locales in `src/locales/`. Components use `const { t } = useTranslation()`
- `components/` — UI components: `DirTree` (recursive directory tree), `SkillCard`, `AnalysisPanel` (expandable AI analysis), `PluginPanel` (plugin groups), `TabSwitch`, `StatsRow`, `ConfigModal`, `ProjectSidebar`, `ProjectSkillView`, `AddSkillModal`, `DirPicker`

### Key Patterns

- **Express 5 wildcards**: Routes use `{*paramName}` syntax (e.g. `/enable/{*skillPath}`). Parameter values can be arrays — handlers normalize: `Array.isArray(raw) ? raw.join('/') : raw`
- **Config persistence**: `config.ts` uses a serial promise chain (`saveQueue`) for atomic writes (write to `.tmp`, then `rename`)
- **Claude API config**: Derived from `~/.claude/settings.json` `env` object — NOT stored in app config. Reads `ANTHROPIC_API_KEY`, `ANTHROPIC_BASE_URL`, `ANTHROPIC_DEFAULT_SONNET_MODEL`. Default model: `claude-sonnet-4-6`
- **Environment variables**: `NODE_ENV` (production mode, auto-set by `cli.js` when `dist/` exists), `SKIP_AUTO_ANALYSIS=1` (skip startup analysis)
- **Directory exclusions**: `skill-scanner.ts` uses `SKIP_ENTRIES` set and `hash-utils.ts` uses `SKIP_DIRS` set to skip `__pycache__`, `dist`, `build`, `.git`, `.venv`, `node_modules`, etc. during recursive scans

### Key API Routes

| Route | Purpose |
|---|---|
| `GET /api/health` | Server uptime, version, API status |
| `GET /api/skills/custom` | Custom skill directory tree with metadata |
| `POST /api/skills/custom/enable/*` | Enable skill (create symlink) |
| `POST /api/skills/custom/disable/*` | Disable skill (remove symlink) |
| `POST /api/skills/custom/batch-enable` | Batch enable skills |
| `POST /api/skills/custom/batch-disable` | Batch disable skills |
| `DELETE /api/skills/custom/delete/*` | Delete skill directory and symlink |
| `GET /api/skills/plugin` | Plugin skills list |
| `POST /api/plugins/check-update/:name` | Check plugin for updates |
| `GET/POST /api/analysis/:source/:name` | Get cached / trigger AI analysis |
| `GET /api/skills/search` | Search skills by keyword, source, enabled status |
| `GET /api/skills/summary` | Statistics counts |
| `GET/PUT /api/config` | Configuration management |
| `POST /api/fs/pick` | OS native folder picker dialog |
| `GET /api/fs/browse` | List subdirectories under a path |
| `GET /api/projects` | List registered projects with stats |
| `POST /api/projects` | Register a new project |
| `DELETE /api/projects/:name` | Unregister a project |
| `GET /api/projects/:name/skills` | Global + project skill lists |
| `POST /api/projects/:name/skills/enable/*` | Enable skill for project |
| `POST /api/projects/:name/skills/disable/*` | Disable skill for project |
| `POST /api/projects/:name/skills/batch-enable` | Batch enable for project |
| `POST /api/projects/:name/skills/batch-disable` | Batch disable for project |
| `GET /api/groups` | List skill groups |
| `POST /api/groups` | Create a group |
| `PUT /api/groups/:id` | Update group (name, color) |
| `DELETE /api/groups/:id` | Delete group |
| `POST /api/groups/:groupId/skills` | Add skills to group |
| `DELETE /api/groups/:groupId/skills` | Remove skills from group |

### Data Model

- Skills are identified by filesystem path relative to `customSkillDir`
- A skill is a directory containing `SKILL.md` (with YAML frontmatter for `description`)
- Enabled state = symlink exists in `~/.claude/skills/` pointing to the skill directory
- Analysis cache keyed by `source/name` (e.g. `custom/my-skill`, `plugin/some-plugin-skill`)

### Testing

Tests use **vitest** with **supertest** for HTTP integration tests. `server/__tests__/app.ts` exports a `createApp()` factory that builds an Express app without `listen()` or vite-express binding — routes and error middleware are tested without binding to a port. Tests create temp directories for isolation. Test coverage includes: skill CRUD, batch operations, project registration and per-project skill management, groups CRUD, config validation, analysis caching, search, error middleware, and edge cases (path traversal, idempotency, conflict handling).

## Tech Stack

- TypeScript (ES2022, ESM, bundler module resolution)
- Express 5, vite-express, Vite 8
- React 19, Tailwind CSS 4
- Anthropic SDK (`@anthropic-ai/sdk`) for Claude API calls
- `gray-matter` for SKILL.md frontmatter parsing
- `tsx` for TypeScript execution (no compile step in dev)
