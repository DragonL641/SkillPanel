# SkillPanel

A lightweight Web UI for managing [Claude Code](https://claude.ai/code) skills. Browse custom skills (enable/disable via symlinks), view plugin skills (read-only), and trigger AI-powered skill analysis.

## Features

- **Custom Skill Management** — Browse your skill directory as a tree, toggle skills on/off with one click
- **Plugin Skill Viewer** — View skills installed via Claude Code plugins, with update checking
- **AI Analysis** — Trigger Claude-powered analysis for any skill to understand its execution steps
- **Batch Operations** — Enable or disable multiple skills at once
- **Auto Analysis** — Skills are automatically analyzed on server startup when content changes

## Quick Start

### Install & Run

```bash
# Clone the repo
git clone https://github.com/DragonL641/SkillPanel.git
cd SkillPanel

# Install dependencies
npm install

# Start dev server
npm run dev
```

Open http://localhost:3210 in your browser.

### Configuration

On first launch, SkillPanel looks for `skillpanel.config.json` in the project root. If not found, it uses defaults:

| Field | Default | Description |
|-------|---------|-------------|
| `claudeRootDir` | `~/.claude` | Claude Code root directory |
| `customSkillDir` | `~/Projects/myskill` | Your custom skills directory |
| `port` | `3210` | Server port |

You can configure these through the Settings modal in the Web UI, or create the config file manually:

```json
{
  "claudeRootDir": "~/.claude",
  "customSkillDir": "/path/to/your/skills",
  "port": 3210
}
```

### Claude API Integration

Skill analysis requires a Claude API key. SkillPanel auto-detects it from `~/.claude/settings.json` (the same config Claude Code uses). No additional setup needed if you already use Claude Code.

Set `SKIP_AUTO_ANALYSIS=1` to skip auto-analysis on startup.

## Tech Stack

- **Backend**: TypeScript, Express 5, vite-express
- **Frontend**: React 19, Tailwind CSS 4, Vite 8
- **AI**: Anthropic SDK (Claude API)

## Development

```bash
npm run dev        # Start dev server (tsx + Vite HMR)
npm run build      # Build frontend to dist/
npm run start      # Production mode
npm test           # Run tests (vitest)
```

## Architecture

Single-process Node.js app — Express serves both the REST API and the React frontend.

```
server/
  index.ts          # Express entry point
  config.ts         # Config load/save
  routes/           # REST API handlers
  services/         # Business logic (scanning, symlinks, analysis)

src/
  App.tsx           # Main React shell
  api/client.ts     # API client
  components/       # UI components
```

Skills are directories containing a `SKILL.md` file. Enabling a skill creates a symlink in `~/.claude/skills/`.

## License

MIT
