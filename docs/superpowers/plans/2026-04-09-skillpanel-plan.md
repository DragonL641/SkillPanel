# SkillPanel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build SkillPanel — a lightweight Web UI to browse, search, enable/disable Claude Code custom skills, view plugin skills (read-only), and display AI-generated skill principle analysis.

**Architecture:** Single-process Node.js app using Express + vite-express. Backend serves REST APIs for skill scanning, symlink management, and Claude API analysis. Frontend is React + Tailwind, built by Vite and served by the same Express instance in production.

**Tech Stack:** TypeScript, Express, vite-express, React, Tailwind CSS, Anthropic SDK, gray-matter

---

## File Map

### Backend
| File | Responsibility |
|---|---|
| `server/index.ts` | Express entry, vite-express integration, mount routes |
| `server/config.ts` | Load/save config from `skillpanel.config.json` |
| `server/services/skill-scanner.ts` | Recursively scan custom skill dir, build tree with metadata |
| `server/services/plugin-scanner.ts` | Scan `installed_plugins.json` + plugin `skills/` dirs |
| `server/services/skill-manager.ts` | Create/remove symlinks in `~/.claude/skills/` |
| `server/services/analyzer.ts` | Hash skills, call Claude API, cache results to JSON |
| `server/routes/config.ts` | GET/PUT `/api/config` |
| `server/routes/skills.ts` | GET `/api/skills/custom`, POST enable/disable |
| `server/routes/plugins.ts` | GET `/api/skills/plugin` |
| `server/routes/analysis.ts` | GET/POST `/api/analysis/:source/:name` |
| `server/routes/summary.ts` | GET `/api/skills/summary` |

### Frontend
| File | Responsibility |
|---|---|
| `src/App.tsx` | Tab layout, data fetching, search state |
| `src/main.tsx` | React entry point |
| `src/api/client.ts` | Fetch wrapper for all API calls |
| `src/components/TabSwitch.tsx` | Custom Skills / Plugin Skills tab buttons |
| `src/components/DirTree.tsx` | Recursive directory tree with expand/collapse |
| `src/components/SkillCard.tsx` | Single skill card (vertical, full-width) |
| `src/components/AnalysisPanel.tsx` | Expandable AI analysis inside SkillCard |
| `src/components/PluginPanel.tsx` | Plugin group with expand/collapse |
| `src/components/SummaryBar.tsx` | Fixed bottom stats bar |
| `src/components/ConfigModal.tsx` | Settings modal |

### Config / Root
| File | Responsibility |
|---|---|
| `package.json` | Dependencies, scripts, bin |
| `tsconfig.json` | TypeScript config |
| `vite.config.ts` | Vite + vite-express config |
| `index.html` | Vite HTML entry |
| `cli.js` | npm bin entry point |
| `skillpanel.config.json` | User config (gitignored) |

---

### Task 1: Project Scaffolding

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `index.html`
- Create: `.gitignore`
- Create: `src/main.tsx`
- Create: `src/index.css`
- Create: `src/App.tsx`

- [ ] **Step 1: Initialize package.json**

```bash
cd /Users/liuziyi/Projects/SkillPanel
npm init -y
```

Then update `package.json`:

```json
{
  "name": "skillpanel",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "tsx server/index.ts",
    "build": "vite build",
    "start": "NODE_ENV=production tsx server/index.ts"
  },
  "bin": {
    "skillpanel": "./cli.js"
  }
}
```

- [ ] **Step 2: Install dependencies**

```bash
npm install express vite-express react react-dom @anthropic-ai/sdk gray-matter
npm install -D typescript tsx vite @vitejs/plugin-react tailwindcss @tailwindcss/vite @types/express @types/react @types/react-dom
```

- [ ] **Step 3: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "dist",
    "rootDir": ".",
    "types": ["vite/client"]
  },
  "include": ["server/**/*.ts", "src/**/*.ts", "src/**/*.tsx"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 4: Create vite.config.ts**

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  root: resolve(__dirname),
  build: {
    outDir: resolve(__dirname, 'dist'),
    emptyOutDir: true,
  },
  server: {
    port: 3210,
  },
});
```

- [ ] **Step 5: Create index.html**

```html
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>SkillPanel</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 6: Create .gitignore**

```
node_modules/
dist/
.skillpanel/
skillpanel.config.json
*.DS_Store
```

- [ ] **Step 7: Create src/main.tsx**

```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

`src/index.css`:
```css
@import "tailwindcss";
```

`src/App.tsx`:
```typescript
export default function App() {
  return <div className="p-8 text-center text-xl">SkillPanel Loading...</div>;
}
```

- [ ] **Step 8: Commit**

```bash
git init
git add -A
git commit -m "chore: scaffold SkillPanel project with Express + Vite + React"
```

---

### Task 2: Express Server + Config Service

**Files:**
- Create: `server/index.ts`
- Create: `server/config.ts`
- Create: `server/routes/config.ts`
- Create: `cli.js`

- [ ] **Step 1: Create server/config.ts**

```typescript
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');
const CONFIG_FILE = path.join(PROJECT_ROOT, 'skillpanel.config.json');

export interface AppConfig {
  customSkillDir: string;
  claudeSkillsDir: string;
  claudePluginsDir: string;
  port: number;
  anthropicApiKey?: string;
}

const DEFAULT_CONFIG: AppConfig = {
  customSkillDir: path.join(os.homedir(), 'Projects', 'myskill'),
  claudeSkillsDir: path.join(os.homedir(), '.claude', 'skills'),
  claudePluginsDir: path.join(os.homedir(), '.claude', 'plugins'),
  port: 3210,
};

export function loadConfig(): AppConfig {
  if (fs.existsSync(CONFIG_FILE)) {
    const raw = fs.readFileSync(CONFIG_FILE, 'utf-8');
    return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  }
  return { ...DEFAULT_CONFIG };
}

export function saveConfig(config: Partial<AppConfig>): AppConfig {
  const current = loadConfig();
  const merged = { ...current, ...config };
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(merged, null, 2), 'utf-8');
  return merged;
}
```

- [ ] **Step 2: Create server/routes/config.ts**

```typescript
import { Router } from 'express';
import { loadConfig, saveConfig } from '../config.js';

const router = Router();

router.get('/config', (_req, res) => {
  const config = loadConfig();
  res.json({
    ...config,
    anthropicApiKey: config.anthropicApiKey ? '****' + config.anthropicApiKey.slice(-4) : '',
  });
});

router.put('/config', (req, res) => {
  const updated = saveConfig(req.body);
  res.json({
    ...updated,
    anthropicApiKey: updated.anthropicApiKey ? '****' + updated.anthropicApiKey.slice(-4) : '',
  });
});

export default router;
```

- [ ] **Step 3: Create server/index.ts**

```typescript
import express from 'express';
import { viteExpress } from 'vite-express';
import { loadConfig } from './config.js';
import configRoutes from './routes/config.js';

const app = express();
app.use(express.json());

app.use('/api', configRoutes);
app.get('/api/health', (_req, res) => res.json({ ok: true }));

const config = loadConfig();

app.listen(config.port, () => {
  console.log(`SkillPanel running at http://localhost:${config.port}`);
});

viteExpress({ app });
```

- [ ] **Step 4: Create cli.js**

```javascript
#!/usr/bin/env node
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverPath = path.join(__dirname, 'server', 'index.ts');

try {
  execFileSync('npx', ['tsx', serverPath], { stdio: 'inherit' });
} catch (e) {
  process.exit(e.status || 1);
}
```

```bash
chmod +x cli.js
```

- [ ] **Step 5: Verify server starts**

```bash
npm run dev
```

Expected: console shows `SkillPanel running at http://localhost:3210`, browser shows "SkillPanel Loading..."

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add Express server with vite-express and config service"
```

---

### Task 3: Skill Scanner Service + Custom Skills API

**Files:**
- Create: `server/services/skill-scanner.ts`
- Create: `server/services/skill-manager.ts`
- Create: `server/routes/skills.ts`

- [ ] **Step 1: Create server/services/skill-scanner.ts**

```typescript
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import matter from 'gray-matter';
import { loadConfig } from '../config.js';

export interface SkillMeta {
  name: string;
  description: string;
  enabled: boolean;
  hash: string;
  hasAnalysis: boolean;
}

export interface TreeNode {
  type: 'dir' | 'skill';
  name: string;
  path: string;
  children?: TreeNode[];
  skill?: SkillMeta;
}

function isSkillDir(dirPath: string): boolean {
  return fs.existsSync(path.join(dirPath, 'SKILL.md'));
}

function computeHash(skillDir: string): string {
  const skillMd = path.join(skillDir, 'SKILL.md');
  if (!fs.existsSync(skillMd)) return '';
  const content = fs.readFileSync(skillMd, 'utf-8');
  let combined = content;
  const scriptsDir = path.join(skillDir, 'scripts');
  if (fs.existsSync(scriptsDir)) {
    const scripts = fs.readdirSync(scriptsDir).sort();
    for (const s of scripts) {
      combined += fs.readFileSync(path.join(scriptsDir, s), 'utf-8');
    }
  }
  return crypto.createHash('md5').update(combined).digest('hex');
}

function isEnabled(skillDir: string, skillName: string): boolean {
  const config = loadConfig();
  const linkPath = path.join(config.claudeSkillsDir, skillName);
  try {
    const stat = fs.lstatSync(linkPath);
    if (!stat.isSymbolicLink()) return false;
    const target = fs.readlinkSync(linkPath);
    return path.resolve(path.dirname(linkPath), target) === path.resolve(skillDir);
  } catch {
    return false;
  }
}

function parseDescription(skillDir: string): string {
  const skillMd = path.join(skillDir, 'SKILL.md');
  if (!fs.existsSync(skillMd)) return '';
  const raw = fs.readFileSync(skillMd, 'utf-8');
  const { data } = matter(raw);
  return data.description || '';
}

function scanDir(dirPath: string, rootDir: string): TreeNode[] {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  const nodes: TreeNode[] = [];

  for (const entry of entries) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
    const fullPath = path.join(dirPath, entry.name);
    if (!entry.isDirectory()) continue;

    const relPath = path.relative(rootDir, fullPath);

    if (isSkillDir(fullPath)) {
      const hash = computeHash(fullPath);
      nodes.push({
        type: 'skill',
        name: entry.name,
        path: relPath,
        skill: {
          name: entry.name,
          description: parseDescription(fullPath),
          enabled: isEnabled(fullPath, entry.name),
          hash,
          hasAnalysis: false,
        },
      });
    } else {
      const children = scanDir(fullPath, rootDir);
      if (children.length > 0) {
        nodes.push({
          type: 'dir',
          name: entry.name,
          path: relPath,
          children,
        });
      }
    }
  }

  nodes.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'dir' ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  return nodes;
}

export function scanCustomSkills(): TreeNode[] {
  const config = loadConfig();
  if (!fs.existsSync(config.customSkillDir)) return [];
  return scanDir(config.customSkillDir, config.customSkillDir);
}
```

- [ ] **Step 2: Create server/services/skill-manager.ts**

```typescript
import fs from 'fs';
import path from 'path';
import { loadConfig } from '../config.js';

export function enableSkill(skillRelativePath: string): void {
  const config = loadConfig();
  const skillDir = path.join(config.customSkillDir, skillRelativePath);
  const skillName = path.basename(skillRelativePath);
  const linkPath = path.join(config.claudeSkillsDir, skillName);

  if (!fs.existsSync(skillDir)) {
    throw new Error(`Skill directory not found: ${skillDir}`);
  }

  if (!fs.existsSync(config.claudeSkillsDir)) {
    fs.mkdirSync(config.claudeSkillsDir, { recursive: true });
  }

  // Remove existing link or file
  try {
    const stat = fs.lstatSync(linkPath);
    if (stat.isSymbolicLink()) {
      fs.unlinkSync(linkPath);
    }
  } catch {
    // doesn't exist, fine
  }

  fs.symlinkSync(skillDir, linkPath);
}

export function disableSkill(skillRelativePath: string): void {
  const config = loadConfig();
  const skillName = path.basename(skillRelativePath);
  const linkPath = path.join(config.claudeSkillsDir, skillName);

  try {
    const stat = fs.lstatSync(linkPath);
    if (!stat.isSymbolicLink()) {
      throw new Error(`${skillName} in skills dir is not a symlink, refusing to delete`);
    }
  } catch (err: any) {
    if (err.code === 'ENOENT') {
      throw new Error(`Skill not enabled: ${skillName}`);
    }
    throw err;
  }

  fs.unlinkSync(linkPath);
}
```

- [ ] **Step 3: Create server/routes/skills.ts**

```typescript
import { Router } from 'express';
import { scanCustomSkills } from '../services/skill-scanner.js';
import { enableSkill, disableSkill } from '../services/skill-manager.js';

const router = Router();

router.get('/skills/custom', (_req, res) => {
  try {
    const tree = scanCustomSkills();
    res.json({ tree });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Use wildcard to capture path segments like "baoyu-comic" or "sub/dir/skill-name"
router.post('/skills/custom/enable/*', (req, res) => {
  try {
    const skillPath = req.params[0];
    enableSkill(skillPath);
    res.json({ ok: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/skills/custom/disable/*', (req, res) => {
  try {
    const skillPath = req.params[0];
    disableSkill(skillPath);
    res.json({ ok: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
```

- [ ] **Step 4: Mount route in server/index.ts**

Add import and mount to `server/index.ts`:
```typescript
import skillsRoutes from './routes/skills.js';
// Add after existing app.use lines:
app.use('/api', skillsRoutes);
```

- [ ] **Step 5: Verify API**

```bash
curl http://localhost:3210/api/skills/custom | python3 -m json.tool | head -40
```

Expected: JSON with `tree` array containing dir and skill nodes.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add skill scanner service and custom skills API"
```

---

### Task 4: Plugin Scanner Service + API

**Files:**
- Create: `server/services/plugin-scanner.ts`
- Create: `server/routes/plugins.ts`

- [ ] **Step 1: Create server/services/plugin-scanner.ts**

```typescript
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { loadConfig } from '../config.js';

export interface PluginSkill {
  name: string;
  description: string;
  path: string;
}

export interface PluginInfo {
  name: string;
  displayName: string;
  installPath: string;
  version: string;
  skills: PluginSkill[];
}

interface InstalledPlugin {
  installPath: string;
  version: string;
}

function parseSkillDescription(skillDir: string): string {
  const skillMd = path.join(skillDir, 'SKILL.md');
  if (!fs.existsSync(skillMd)) return '';
  const raw = fs.readFileSync(skillMd, 'utf-8');
  const { data } = matter(raw);
  return data.description || '';
}

function scanSkillsInDir(skillsDir: string): PluginSkill[] {
  if (!fs.existsSync(skillsDir) || !fs.statSync(skillsDir).isDirectory()) return [];

  return fs.readdirSync(skillsDir, { withFileTypes: true })
    .filter(e => e.isDirectory() && fs.existsSync(path.join(skillsDir, e.name, 'SKILL.md')))
    .map(e => ({
      name: e.name,
      description: parseSkillDescription(path.join(skillsDir, e.name)),
      path: path.join(skillsDir, e.name),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function getPluginSkills(installPath: string): PluginSkill[] {
  // Strategy 1: Check marketplace.json for explicit skill list
  const marketplacePath = path.join(installPath, '.claude-plugin', 'marketplace.json');
  if (fs.existsSync(marketplacePath)) {
    const marketplace = JSON.parse(fs.readFileSync(marketplacePath, 'utf-8'));
    for (const plugin of marketplace.plugins || []) {
      if (plugin.skills && plugin.skills.length > 0) {
        return (plugin.skills as string[])
          .map(relPath => path.join(installPath, relPath))
          .filter(absPath => fs.existsSync(absPath))
          .map(absPath => ({
            name: path.basename(absPath),
            description: parseSkillDescription(absPath),
            path: absPath,
          }));
      }
    }
  }

  // Strategy 2: Auto-discover skills/ directory
  const skillsDir = path.join(installPath, 'skills');
  return scanSkillsInDir(skillsDir);
}

export function scanPlugins(): PluginInfo[] {
  const config = loadConfig();
  const installedPluginsPath = path.join(config.claudePluginsDir, 'installed_plugins.json');
  if (!fs.existsSync(installedPluginsPath)) return [];

  const installed = JSON.parse(fs.readFileSync(installedPluginsPath, 'utf-8'));
  const plugins: PluginInfo[] = [];

  for (const [fullName, installs] of Object.entries(installed.plugins || {})) {
    const installArr = installs as InstalledPlugin[];
    if (!installArr || installArr.length === 0) continue;

    const { installPath, version } = installArr[0];
    if (!fs.existsSync(installPath)) continue;

    const skills = getPluginSkills(installPath);
    if (skills.length === 0) continue;

    plugins.push({
      name: fullName,
      displayName: fullName.split('@')[0],
      installPath,
      version: version || 'unknown',
      skills,
    });
  }

  return plugins.sort((a, b) => a.displayName.localeCompare(b.displayName));
}
```

- [ ] **Step 2: Create server/routes/plugins.ts**

```typescript
import { Router } from 'express';
import { scanPlugins } from '../services/plugin-scanner.js';

const router = Router();

router.get('/skills/plugin', (_req, res) => {
  try {
    const plugins = scanPlugins();
    res.json({ plugins });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
```

- [ ] **Step 3: Mount route in server/index.ts**

```typescript
import pluginsRoutes from './routes/plugins.js';
app.use('/api', pluginsRoutes);
```

- [ ] **Step 4: Verify API**

```bash
curl http://localhost:3210/api/skills/plugin | python3 -m json.tool | head -40
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add plugin scanner service and plugin skills API"
```

---

### Task 5: Summary API

**Files:**
- Create: `server/routes/summary.ts`

- [ ] **Step 1: Create server/routes/summary.ts**

```typescript
import { Router } from 'express';
import { scanCustomSkills } from '../services/skill-scanner.js';
import { scanPlugins } from '../services/plugin-scanner.js';

const router = Router();

function countSkillsInTree(nodes: any[]): { total: number; enabled: number } {
  let total = 0;
  let enabled = 0;
  for (const node of nodes) {
    if (node.type === 'skill') {
      total++;
      if (node.skill?.enabled) enabled++;
    } else if (node.children) {
      const sub = countSkillsInTree(node.children);
      total += sub.total;
      enabled += sub.enabled;
    }
  }
  return { total, enabled };
}

router.get('/skills/summary', (_req, res) => {
  const tree = scanCustomSkills();
  const plugins = scanPlugins();
  const custom = countSkillsInTree(tree);
  const pluginTotal = plugins.reduce((sum, p) => sum + p.skills.length, 0);

  res.json({
    customTotal: custom.total,
    customEnabled: custom.enabled,
    pluginTotal,
    grandTotal: custom.total + pluginTotal,
  });
});

export default router;
```

- [ ] **Step 2: Mount and verify**

```typescript
import summaryRoutes from './routes/summary.js';
app.use('/api', summaryRoutes);
```

```bash
curl http://localhost:3210/api/skills/summary
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: add summary statistics API"
```

---

### Task 6: AI Analyzer Service + API

**Files:**
- Create: `server/services/analyzer.ts`
- Create: `server/routes/analysis.ts`

- [ ] **Step 1: Create server/services/analyzer.ts**

```typescript
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import Anthropic from '@anthropic-ai/sdk';
import { loadConfig } from '../config.js';

export interface SkillAnalysis {
  name: string;
  hash: string;
  summary: string;
  analyzedAt: string;
  model: string;
}

const ANALYSIS_PROMPT = `分析以下 Claude Code skill 的工作原理，用中文输出，包含：
1. 一句话概述
2. 核心工作流程（步骤化）
3. 关键依赖（API、工具、库等）

Skill 内容：
{{content}}`;

function getCacheDir(): string {
  const config = loadConfig();
  const dir = path.join(path.dirname(config.customSkillDir), '.skillpanel');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function getCachePath(): string {
  return path.join(getCacheDir(), 'analysis-cache.json');
}

function loadCache(): Record<string, SkillAnalysis> {
  const p = getCachePath();
  if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf-8'));
  return {};
}

function saveCache(cache: Record<string, SkillAnalysis>): void {
  fs.writeFileSync(getCachePath(), JSON.stringify(cache, null, 2), 'utf-8');
}

function computeHash(skillDir: string): string {
  const skillMd = path.join(skillDir, 'SKILL.md');
  if (!fs.existsSync(skillMd)) return '';
  let content = fs.readFileSync(skillMd, 'utf-8');
  const scriptsDir = path.join(skillDir, 'scripts');
  if (fs.existsSync(scriptsDir)) {
    for (const f of fs.readdirSync(scriptsDir).sort()) {
      content += fs.readFileSync(path.join(scriptsDir, f), 'utf-8');
    }
  }
  return crypto.createHash('md5').update(content).digest('hex');
}

export function getCachedAnalysis(key: string): SkillAnalysis | null {
  return loadCache()[key] || null;
}

export async function analyzeSkill(skillDir: string, key: string): Promise<SkillAnalysis> {
  const hash = computeHash(skillDir);
  const cache = loadCache();

  if (cache[key] && cache[key].hash === hash) {
    return cache[key];
  }

  const skillMd = path.join(skillDir, 'SKILL.md');
  if (!fs.existsSync(skillMd)) throw new Error('SKILL.md not found');
  const content = fs.readFileSync(skillMd, 'utf-8');

  const config = loadConfig();
  const apiKey = config.anthropicApiKey || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('Anthropic API key not configured. Set it in config or ANTHROPIC_API_KEY env.');

  const client = new Anthropic({ apiKey });
  const model = 'claude-sonnet-4-6';

  const response = await client.messages.create({
    model,
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: ANALYSIS_PROMPT.replace('{{content}}', content),
    }],
  });

  const textBlock = response.content.find((b: any) => b.type === 'text');
  const summary = textBlock ? (textBlock as any).text : 'Analysis failed';

  const analysis: SkillAnalysis = {
    name: key,
    hash,
    summary,
    analyzedAt: new Date().toISOString(),
    model,
  };

  cache[key] = analysis;
  saveCache(cache);
  return analysis;
}
```

- [ ] **Step 2: Create server/routes/analysis.ts**

```typescript
import fs from 'fs';
import path from 'path';
import { Router } from 'express';
import { getCachedAnalysis, analyzeSkill } from '../services/analyzer.js';
import { scanPlugins } from '../services/plugin-scanner.js';
import { loadConfig } from '../config.js';

const router = Router();

function findSkillDir(source: string, name: string): string | null {
  if (source === 'custom') {
    const config = loadConfig();
    return findInTree(config.customSkillDir, name);
  } else if (source === 'plugin') {
    for (const p of scanPlugins()) {
      const skill = p.skills.find(s => s.name === name);
      if (skill) return skill.path;
    }
  }
  return null;
}

function findInTree(dir: string, targetName: string): string | null {
  if (!fs.existsSync(dir)) return null;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.name === targetName && fs.existsSync(path.join(fullPath, 'SKILL.md'))) {
      return fullPath;
    }
    if (fs.existsSync(path.join(fullPath, 'SKILL.md'))) continue;
    const found = findInTree(fullPath, targetName);
    if (found) return found;
  }
  return null;
}

router.get('/analysis/:source/:name', (req, res) => {
  const key = `${req.params.source}:${req.params.name}`;
  const cached = getCachedAnalysis(key);
  res.json(cached || { summary: null });
});

router.post('/analysis/:source/:name', async (req, res) => {
  const { source, name } = req.params;
  const key = `${source}:${name}`;
  const skillDir = findSkillDir(source, name);

  if (!skillDir) {
    res.status(404).json({ error: `Skill not found: ${name}` });
    return;
  }

  try {
    const analysis = await analyzeSkill(skillDir, key);
    res.json(analysis);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
```

- [ ] **Step 3: Mount and verify**

```typescript
import analysisRoutes from './routes/analysis.js';
app.use('/api', analysisRoutes);
```

```bash
curl http://localhost:3210/api/analysis/custom/baoyu-comic
```

Expected: `{"summary":null}`

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: add AI analyzer service with Claude API and hash-based caching"
```

---

### Task 7: Frontend Foundation — App Shell + Tabs

**Files:**
- Modify: `src/App.tsx`
- Create: `src/api/client.ts`
- Create: `src/components/TabSwitch.tsx`
- Create: `src/components/SummaryBar.tsx`

- [ ] **Step 1: Create src/api/client.ts**

```typescript
const BASE = '/api';

export const fetchCustomSkills = () => fetch(`${BASE}/skills/custom`).then(r => r.json());
export const fetchPluginSkills = () => fetch(`${BASE}/skills/plugin`).then(r => r.json());
export const fetchSummary = () => fetch(`${BASE}/skills/summary`).then(r => r.json());

export const enableSkill = (skillPath: string) =>
  fetch(`${BASE}/skills/custom/enable/${skillPath}`, { method: 'POST' }).then(r => r.json());

export const disableSkill = (skillPath: string) =>
  fetch(`${BASE}/skills/custom/disable/${skillPath}`, { method: 'POST' }).then(r => r.json());

export const fetchAnalysis = (source: string, name: string) =>
  fetch(`${BASE}/analysis/${source}/${name}`).then(r => r.json());

export const triggerAnalysis = (source: string, name: string) =>
  fetch(`${BASE}/analysis/${source}/${name}`, { method: 'POST' }).then(r => r.json());

export const fetchConfig = () => fetch(`${BASE}/config`).then(r => r.json());

export const saveConfig = (config: any) =>
  fetch(`${BASE}/config`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  }).then(r => r.json());
```

- [ ] **Step 2: Create src/components/TabSwitch.tsx**

```typescript
interface Props {
  active: 'custom' | 'plugin';
  onChange: (tab: 'custom' | 'plugin') => void;
}

export default function TabSwitch({ active, onChange }: Props) {
  return (
    <div className="flex gap-1 border-b border-gray-200 mb-4">
      <button
        onClick={() => onChange('custom')}
        className={`px-4 py-2 text-sm font-medium transition-colors ${
          active === 'custom'
            ? 'text-blue-600 border-b-2 border-blue-600'
            : 'text-gray-500 hover:text-gray-700'
        }`}
      >
        自定义 Skills
      </button>
      <button
        onClick={() => onChange('plugin')}
        className={`px-4 py-2 text-sm font-medium transition-colors ${
          active === 'plugin'
            ? 'text-blue-600 border-b-2 border-blue-600'
            : 'text-gray-500 hover:text-gray-700'
        }`}
      >
        插件 Skills
      </button>
    </div>
  );
}
```

- [ ] **Step 3: Create src/components/SummaryBar.tsx**

```typescript
interface Summary {
  customTotal: number;
  customEnabled: number;
  pluginTotal: number;
  grandTotal: number;
}

export default function SummaryBar({ data }: { data: Summary | null }) {
  if (!data) return null;
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-3 text-sm text-gray-600 flex gap-6">
      <span>自定义: <strong>{data.customTotal}</strong> (已启用 <strong className="text-blue-600">{data.customEnabled}</strong>)</span>
      <span>插件: <strong>{data.pluginTotal}</strong></span>
      <span>总计: <strong>{data.grandTotal}</strong></span>
    </div>
  );
}
```

- [ ] **Step 4: Rewrite src/App.tsx**

```typescript
import { useState, useEffect, useCallback } from 'react';
import TabSwitch from './components/TabSwitch';
import SummaryBar from './components/SummaryBar';
import { fetchSummary } from './api/client';

export default function App() {
  const [tab, setTab] = useState<'custom' | 'plugin'>('custom');
  const [summary, setSummary] = useState<any>(null);
  const [search, setSearch] = useState('');

  useEffect(() => { fetchSummary().then(setSummary); }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800">SkillPanel</h1>
        <div className="flex gap-3 items-center">
          <input
            type="text"
            placeholder="搜索 skill..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="text-sm border border-gray-200 rounded px-3 py-1.5 w-48 focus:outline-none focus:border-blue-400"
          />
          <button className="text-gray-400 hover:text-gray-600 text-sm">刷新</button>
          <button className="text-gray-400 hover:text-gray-600 text-sm">配置</button>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-6 py-6 pb-20">
        <TabSwitch active={tab} onChange={setTab} />
        <div className="text-gray-500 text-sm">
          {tab === 'custom' ? '自定义 skill（待实现）' : '插件 skill（待实现）'}
        </div>
      </main>
      <SummaryBar data={summary} />
    </div>
  );
}
```

- [ ] **Step 5: Verify UI renders with tabs and summary bar**

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add frontend shell with tabs, summary bar, and API client"
```

---

### Task 8: Custom Skills UI — DirTree + SkillCard + AnalysisPanel

**Files:**
- Create: `src/components/AnalysisPanel.tsx`
- Create: `src/components/SkillCard.tsx`
- Create: `src/components/DirTree.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Create src/components/AnalysisPanel.tsx**

```typescript
import { useState } from 'react';
import { fetchAnalysis, triggerAnalysis } from '../api/client';

interface Props {
  source: 'custom' | 'plugin';
  name: string;
}

export default function AnalysisPanel({ source, name }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleToggle = async () => {
    if (!expanded && !analysis) {
      const cached = await fetchAnalysis(source, name);
      if (cached.summary) setAnalysis(cached);
    }
    setExpanded(!expanded);
  };

  const handleAnalyze = async () => {
    setLoading(true);
    try {
      const result = await triggerAnalysis(source, name);
      setAnalysis(result);
    } catch (err) {
      console.error('Analysis failed:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-2">
      <button
        onClick={handleToggle}
        className="text-xs text-gray-500 hover:text-blue-600 flex items-center gap-1"
      >
        {expanded ? '▼' : '▶'} 原理分析
        {analysis?.summary && <span className="text-green-500 ml-1">✓</span>}
      </button>
      {expanded && (
        <div className="mt-2 p-3 bg-gray-50 rounded text-sm text-gray-700 whitespace-pre-wrap border border-gray-100">
          {analysis?.summary ? (
            <>
              {analysis.summary}
              <button
                onClick={handleAnalyze}
                disabled={loading}
                className="mt-2 block text-xs text-gray-400 hover:text-blue-600 disabled:opacity-50"
              >
                {loading ? '重新分析中...' : '[重新分析]'}
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-gray-400">未分析</span>
              <button
                onClick={handleAnalyze}
                disabled={loading}
                className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded hover:bg-blue-100 disabled:opacity-50"
              >
                {loading ? '分析中...' : '分析'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create src/components/SkillCard.tsx**

```typescript
import AnalysisPanel from './AnalysisPanel';

interface SkillMeta {
  name: string;
  description: string;
  enabled: boolean;
}

interface Props {
  skill: SkillMeta;
  path: string;
  source: 'custom' | 'plugin';
  onToggle?: (path: string, enable: boolean) => void;
}

export default function SkillCard({ skill, path, source, onToggle }: Props) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 hover:border-gray-300 transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-800">{skill.name}</span>
            {skill.enabled && <span className="text-xs bg-green-50 text-green-600 px-1.5 py-0.5 rounded">已启用</span>}
            {!skill.enabled && source === 'custom' && <span className="text-xs bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded">未启用</span>}
            {source === 'plugin' && <span className="text-xs bg-purple-50 text-purple-500 px-1.5 py-0.5 rounded">只读</span>}
          </div>
          <p className="text-sm text-gray-500 mt-1 line-clamp-2">{skill.description || '无描述'}</p>
        </div>
        {source === 'custom' && onToggle && (
          <button
            onClick={() => onToggle(path, !skill.enabled)}
            className={`text-xs px-3 py-1.5 rounded shrink-0 ${
              skill.enabled
                ? 'bg-red-50 text-red-500 hover:bg-red-100'
                : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
            }`}
          >
            {skill.enabled ? '禁用' : '启用'}
          </button>
        )}
      </div>
      <AnalysisPanel source={source} name={skill.name} />
    </div>
  );
}
```

- [ ] **Step 3: Create src/components/DirTree.tsx**

```typescript
import { useState } from 'react';
import SkillCard from './SkillCard';

interface SkillMeta {
  name: string;
  description: string;
  enabled: boolean;
  hash: string;
}

interface TreeNode {
  type: 'dir' | 'skill';
  name: string;
  path: string;
  children?: TreeNode[];
  skill?: SkillMeta;
}

interface Props {
  nodes: TreeNode[];
  onToggle: (path: string, enable: boolean) => void;
  filter?: string;
}

export default function DirTree({ nodes, onToggle, filter }: Props) {
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());

  const toggleDir = (dirPath: string) => {
    setExpandedDirs(prev => {
      const next = new Set(prev);
      next.has(dirPath) ? next.delete(dirPath) : next.add(dirPath);
      return next;
    });
  };

  const countSkills = (nodes: TreeNode[]): number =>
    nodes.reduce((sum, n) => sum + (n.type === 'skill' ? 1 : countSkills(n.children || [])), 0);

  const matchesFilter = (node: TreeNode): boolean => {
    if (!filter) return true;
    const f = filter.toLowerCase();
    if (node.type === 'skill') return node.name.toLowerCase().includes(f) || node.skill?.description?.toLowerCase().includes(f);
    return node.name.toLowerCase().includes(f) || (node.children?.some(c => matchesFilter(c)) ?? false);
  };

  return (
    <div className="flex flex-col gap-2">
      {nodes.filter(matchesFilter).map(node => {
        if (node.type === 'dir') {
          const isExpanded = expandedDirs.has(node.path);
          return (
            <div key={node.path}>
              <button
                onClick={() => toggleDir(node.path)}
                className="flex items-center gap-2 py-2 px-1 text-sm font-medium text-gray-700 hover:text-blue-600 w-full text-left"
              >
                <span className="text-xs">{isExpanded ? '▼' : '▶'}</span>
                <span>{node.name}/</span>
                <span className="text-xs text-gray-400">({countSkills(node.children || [])})</span>
              </button>
              {isExpanded && (
                <div className="ml-4 flex flex-col gap-2">
                  <DirTree nodes={node.children || []} onToggle={onToggle} filter={filter} />
                </div>
              )}
            </div>
          );
        }
        return (
          <SkillCard
            key={node.path}
            skill={node.skill!}
            path={node.path}
            source="custom"
            onToggle={onToggle}
          />
        );
      })}
    </div>
  );
}
```

- [ ] **Step 4: Update src/App.tsx**

```typescript
import { useState, useEffect, useCallback } from 'react';
import TabSwitch from './components/TabSwitch';
import SummaryBar from './components/SummaryBar';
import DirTree from './components/DirTree';
import { fetchCustomSkills, fetchSummary, enableSkill, disableSkill } from './api/client';

export default function App() {
  const [tab, setTab] = useState<'custom' | 'plugin'>('custom');
  const [summary, setSummary] = useState<any>(null);
  const [tree, setTree] = useState<any[]>([]);
  const [search, setSearch] = useState('');

  const loadCustomSkills = useCallback(() => fetchCustomSkills().then(d => setTree(d.tree)), []);
  const loadSummary = useCallback(() => fetchSummary().then(setSummary), []);

  useEffect(() => {
    loadSummary();
    if (tab === 'custom') loadCustomSkills();
  }, [tab]);

  const handleToggleSkill = async (skillPath: string, enable: boolean) => {
    if (enable) await enableSkill(skillPath);
    else await disableSkill(skillPath);
    await loadCustomSkills();
    await loadSummary();
  };

  const handleRefresh = async () => { await loadCustomSkills(); await loadSummary(); };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800">SkillPanel</h1>
        <div className="flex gap-3 items-center">
          <input type="text" placeholder="搜索 skill..." value={search} onChange={e => setSearch(e.target.value)}
            className="text-sm border border-gray-200 rounded px-3 py-1.5 w-48 focus:outline-none focus:border-blue-400" />
          <button onClick={handleRefresh} className="text-gray-400 hover:text-gray-600 text-sm">刷新</button>
          <button className="text-gray-400 hover:text-gray-600 text-sm">配置</button>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-6 py-6 pb-20">
        <TabSwitch active={tab} onChange={setTab} />
        {tab === 'custom' && <DirTree nodes={tree} onToggle={handleToggleSkill} filter={search} />}
        {tab === 'plugin' && <div className="text-gray-500 text-sm">插件 skill（待实现）</div>}
      </main>
      <SummaryBar data={summary} />
    </div>
  );
}
```

- [ ] **Step 5: Verify custom skills UI in browser**

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add custom skills UI with directory tree, skill cards, and analysis panel"
```

---

### Task 9: Plugin Skills UI

**Files:**
- Create: `src/components/PluginPanel.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Create src/components/PluginPanel.tsx**

```typescript
import { useState } from 'react';
import SkillCard from './SkillCard';

interface PluginSkill {
  name: string;
  description: string;
}

interface PluginInfo {
  name: string;
  displayName: string;
  skills: PluginSkill[];
}

interface Props {
  plugins: PluginInfo[];
  filter?: string;
}

export default function PluginPanel({ plugins, filter }: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggle = (name: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  };

  const matchesFilter = (p: PluginInfo): boolean => {
    if (!filter) return true;
    const f = filter.toLowerCase();
    return p.displayName.toLowerCase().includes(f) || p.skills.some(s => s.name.toLowerCase().includes(f));
  };

  return (
    <div className="flex flex-col gap-2">
      {plugins.filter(matchesFilter).map(plugin => (
        <div key={plugin.name}>
          <button
            onClick={() => toggle(plugin.name)}
            className="flex items-center gap-2 py-2 px-1 text-sm font-medium text-gray-700 hover:text-blue-600 w-full text-left"
          >
            <span className="text-xs">{expanded.has(plugin.name) ? '▼' : '▶'}</span>
            <span>{plugin.displayName}</span>
            <span className="text-xs text-gray-400">({plugin.skills.length})</span>
            <span className="text-xs text-gray-300 ml-auto">只读</span>
          </button>
          {expanded.has(plugin.name) && (
            <div className="ml-4 flex flex-col gap-2">
              {plugin.skills.map(skill => (
                <SkillCard
                  key={skill.name}
                  skill={{ ...skill, enabled: false }}
                  path={skill.name}
                  source="plugin"
                />
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Update App.tsx — add plugin state and PluginPanel**

Add imports:
```typescript
import PluginPanel from './components/PluginPanel';
import { fetchPluginSkills } from './api/client';
```

Add state:
```typescript
const [plugins, setPlugins] = useState<any[]>([]);
```

Update useEffect:
```typescript
useEffect(() => {
  loadSummary();
  if (tab === 'custom') loadCustomSkills();
  if (tab === 'plugin') fetchPluginSkills().then(d => setPlugins(d.plugins));
}, [tab]);
```

Replace plugin placeholder:
```tsx
{tab === 'plugin' && <PluginPanel plugins={plugins} filter={search} />}
```

- [ ] **Step 3: Verify plugin tab**

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: add plugin skills UI with expandable plugin groups"
```

---

### Task 10: Config Modal

**Files:**
- Create: `src/components/ConfigModal.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Create src/components/ConfigModal.tsx**

```typescript
import { useState, useEffect } from 'react';
import { fetchConfig, saveConfig } from '../api/client';

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export default function ConfigModal({ open, onClose, onSaved }: Props) {
  const [form, setForm] = useState({ customSkillDir: '', claudeSkillsDir: '', port: 3210, anthropicApiKey: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      fetchConfig().then(c => setForm({
        customSkillDir: c.customSkillDir || '',
        claudeSkillsDir: c.claudeSkillsDir || '',
        port: c.port || 3210,
        anthropicApiKey: '',
      }));
    }
  }, [open]);

  const handleSave = async () => {
    setSaving(true);
    const payload: any = { customSkillDir: form.customSkillDir, claudeSkillsDir: form.claudeSkillsDir, port: form.port };
    if (form.anthropicApiKey) payload.anthropicApiKey = form.anthropicApiKey;
    await saveConfig(payload);
    setSaving(false);
    onSaved();
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-semibold mb-4">配置</h2>
        <label className="block text-sm text-gray-600 mb-1">自定义 Skill 目录</label>
        <input type="text" value={form.customSkillDir} onChange={e => setForm(f => ({ ...f, customSkillDir: e.target.value }))}
          className="w-full border border-gray-200 rounded px-3 py-1.5 text-sm mb-3 focus:outline-none focus:border-blue-400" />
        <label className="block text-sm text-gray-600 mb-1">Claude Skills 目录</label>
        <input type="text" value={form.claudeSkillsDir} onChange={e => setForm(f => ({ ...f, claudeSkillsDir: e.target.value }))}
          className="w-full border border-gray-200 rounded px-3 py-1.5 text-sm mb-3 focus:outline-none focus:border-blue-400" />
        <label className="block text-sm text-gray-600 mb-1">端口</label>
        <input type="number" value={form.port} onChange={e => setForm(f => ({ ...f, port: Number(e.target.value) }))}
          className="w-full border border-gray-200 rounded px-3 py-1.5 text-sm mb-3 focus:outline-none focus:border-blue-400" />
        <label className="block text-sm text-gray-600 mb-1">Anthropic API Key（AI 分析用）</label>
        <input type="password" value={form.anthropicApiKey} onChange={e => setForm(f => ({ ...f, anthropicApiKey: e.target.value }))}
          placeholder="sk-ant-..." className="w-full border border-gray-200 rounded px-3 py-1.5 text-sm mb-4 focus:outline-none focus:border-blue-400" />
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-1.5 text-sm text-gray-500 hover:text-gray-700">取消</button>
          <button onClick={handleSave} disabled={saving}
            className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">
            {saving ? '保存中...' : '保存'}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Wire into App.tsx**

Add state, import, and update button:
```typescript
import ConfigModal from './components/ConfigModal';
// ...
const [configOpen, setConfigOpen] = useState(false);
// Update button: <button onClick={() => setConfigOpen(true)}>配置</button>
// Add at end: <ConfigModal open={configOpen} onClose={() => setConfigOpen(false)} onSaved={handleRefresh} />
```

- [ ] **Step 3: Verify config modal**

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: add config modal for skill directory and API key settings"
```

---

### Task 11: Final Integration

**Files:**
- Verify: `server/index.ts` has all routes
- Full end-to-end test

- [ ] **Step 1: Verify final server/index.ts**

All 5 route modules mounted: config, skills, plugins, analysis, summary. `viteExpress()` called after routes.

- [ ] **Step 2: Full end-to-end verification**

1. `npm run dev` starts successfully
2. Custom Skills tab shows directory tree with expand/collapse
3. Enable/disable creates/removes symlinks
4. Plugin Skills tab shows plugins grouped
5. Analysis panel expands and can trigger AI analysis
6. Config modal saves settings
7. Summary bar shows accurate counts
8. Search filters skills

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "feat: SkillPanel v0.1.0 complete"
```
