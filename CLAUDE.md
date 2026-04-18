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
```

No linter is configured.

## Architecture

**Single-process design**: Express serves both the REST API and the React frontend (via vite-express). In dev, Vite provides HMR; in production, Express serves the built `dist/` assets. Published as npm package `@dragonl641/skillpanel` — `cli.js` is the bin entry point, which runs `tsx server/index.ts`.

### Backend (`server/`)

- `index.ts` — Express entry point, mounts all route modules, binds vite-express, handles graceful shutdown (SIGINT/SIGTERM aborts background analysis, closes server, force-exits after 3s)
- `config.ts` — Load/save `skillpanel.config.json` (JSON file persistence, no database)
- `errors.ts` — `HttpError` hierarchy: `ValidationError` (400), `NotFoundError` (404), `ConflictError` (409). Service layer throws these; global error middleware in `index.ts` maps to status codes
- `routes/` — REST API handlers (config, skills, plugins, analysis, summary, search, fs, projects)
- `services/` — Business logic:
  - `skill-scanner.ts` — Recursively scans custom skill directory, builds tree, computes content hashes, checks symlink enabled status
  - `plugin-scanner.ts` — Reads `~/.claude/plugins/installed_plugins.json`, discovers skills via `marketplace.json` or `skills/` dir
  - `skill-manager.ts` — Creates/removes symlinks in `~/.claude/skills/` to enable/disable skills. Validates paths, handles edge cases (already enabled/disabled, missing directories)
  - `analyzer.ts` — Calls Claude API for skill analysis, caches results by content hash in `~/.skillpanel/analysis-cache.json`
  - `cache.ts` — In-memory TTL cache (5s default) used by route handlers for list operations. `getOrCompute()` pattern with `invalidate()` on mutations

### Frontend (`src/`)

- React + Tailwind CSS (v4, imported via `@import "tailwindcss"` in index.css)
- `App.tsx` — Main shell: tabs (global/plugin/project), search, data fetching, project sidebar, and modal orchestration
- `api/client.ts` — Fetch wrapper for all `/api/*` endpoints
- `components/` — UI components: `DirTree` (recursive directory tree), `SkillCard`, `AnalysisPanel` (expandable AI analysis), `PluginPanel` (plugin groups), `TabSwitch`, `StatsRow`, `ConfigModal`, `ProjectSidebar`, `ProjectSkillView`, `AddSkillModal`, `DirPicker`

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

### Data Model

- Skills are identified by filesystem path relative to `customSkillDir`
- A skill is a directory containing `SKILL.md` (with YAML frontmatter for `description`)
- Enabled state = symlink exists in `~/.claude/skills/` pointing to the skill directory
- Analysis cache keyed by `source/name` (e.g. `custom/my-skill`, `plugin/some-plugin-skill`)

### Testing

Tests use **vitest** with **supertest** for HTTP integration tests. `server/__tests__/app.ts` exports a `createApp()` factory that builds an Express app without `listen()` or vite-express binding — routes and error middleware are tested without binding to a port. Tests create temp directories for isolation. Test coverage includes: skill CRUD, batch operations, project registration and per-project skill management, config validation, analysis caching, search, error middleware, and edge cases (path traversal, idempotency, conflict handling).

## Tech Stack

- TypeScript (ES2022, ESM, bundler module resolution)
- Express 5, vite-express, Vite 8
- React 19, Tailwind CSS 4
- Anthropic SDK (`@anthropic-ai/sdk`) for Claude API calls
- `gray-matter` for SKILL.md frontmatter parsing
- `tsx` for TypeScript execution (no compile step in dev)
