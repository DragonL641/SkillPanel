# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SkillPanel is a lightweight Web UI for managing Claude Code skills — browse custom skills (enable/disable via symlinks), view plugin skills (read-only), and trigger AI-powered skill analysis. Single-process Node.js app distributed as an npm package.

## Commands

```bash
npm run dev        # Start dev server (tsx runs Express + Vite HMR)
npm run build      # Build frontend with Vite to dist/
npm run start      # Production mode (NODE_ENV=production)
```

No test framework is configured. No linter is configured.

## Architecture

**Single-process design**: Express serves both the REST API and the React frontend (via vite-express). In dev, Vite provides HMR; in production, Express serves the built `dist/` assets.

### Backend (`server/`)

- `index.ts` — Express entry point, mounts all route modules, binds vite-express
- `config.ts` — Load/save `skillpanel.config.json` (JSON file persistence, no database)
- `routes/` — REST API handlers (config, skills, plugins, analysis, summary)
- `services/` — Business logic:
  - `skill-scanner.ts` — Recursively scans custom skill directory, builds tree, computes content hashes, checks symlink enabled status
  - `plugin-scanner.ts` — Reads `~/.claude/plugins/installed_plugins.json`, discovers skills via `marketplace.json` or `skills/` dir
  - `skill-manager.ts` — Creates/removes symlinks in `~/.claude/skills/` to enable/disable skills
  - `analyzer.ts` — Calls Claude API for skill analysis, caches results by content hash in `.skillpanel/analysis-cache.json`

### Frontend (`src/`)

- React + Tailwind CSS (v4, imported via `@import "tailwindcss"` in index.css)
- `App.tsx` — Main shell: tabs, search, data fetching orchestration
- `api/client.ts` — Fetch wrapper for all `/api/*` endpoints
- `components/` — UI components: `DirTree` (recursive directory tree), `SkillCard`, `AnalysisPanel` (expandable AI analysis), `PluginPanel` (plugin groups), `TabSwitch`, `SummaryBar`, `ConfigModal`

### Key API Routes

| Route | Purpose |
|---|---|
| `GET /api/skills/custom` | Custom skill directory tree with metadata |
| `POST /api/skills/custom/enable/*` | Enable skill (create symlink) |
| `POST /api/skills/custom/disable/*` | Disable skill (remove symlink) |
| `GET /api/skills/plugin` | Plugin skills list |
| `GET/POST /api/analysis/:source/:name` | Get cached / trigger AI analysis |
| `GET /api/skills/summary` | Statistics counts |
| `GET/PUT /api/config` | Configuration management |

### Data Model

- Skills are identified by filesystem path relative to `customSkillDir`
- A skill is a directory containing `SKILL.md` (with YAML frontmatter for `description`)
- Enabled state = symlink exists in `~/.claude/skills/` pointing to the skill directory
- Analysis cache keyed by `source:name` (e.g. `custom:my-skill`, `plugin:some-plugin-skill`)

## Tech Stack

- TypeScript (ES2022, ESM, bundler module resolution)
- Express 5, vite-express, Vite 8
- React 19, Tailwind CSS 4
- Anthropic SDK (`@anthropic-ai/sdk`) for Claude API calls
- `gray-matter` for SKILL.md frontmatter parsing
- `tsx` for TypeScript execution (no compile step in dev)
