# SkillPanel Enhancement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix security/reliability issues, add performance optimizations, and introduce plugin update checking and batch skill operations.

**Architecture:** Incremental enhancement of the existing Express + React app. New shared utility modules (`cache.ts`, `hash-utils.ts`) are introduced first, then consumed by existing services. Security fixes are applied to existing path validation logic. New API routes and frontend UI are added for update checking and batch operations.

**Tech Stack:** TypeScript, Express 5, React 19, Tailwind CSS 4, Anthropic SDK, vite-express, Node.js child_process

---

### Task 1: Fix path traversal in skill-manager.ts

**Files:**
- Modify: `server/services/skill-manager.ts`

- [ ] **Step 1: Replace `resolveSkillDir` with safe implementation**

```typescript
function resolveSkillDir(skillRelativePath: string): string {
  const config = loadConfig();
  const resolved = path.resolve(config.customSkillDir, skillRelativePath);
  const base = path.resolve(config.customSkillDir);
  if (!resolved.startsWith(base + path.sep) && resolved !== base) {
    throw new Error('Invalid skill path: path traversal detected');
  }
  return resolved;
}
```

- [ ] **Step 2: Verify build passes**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add server/services/skill-manager.ts
git commit -m "fix: prevent path traversal in resolveSkillDir using path.resolve + prefix check"
```

---

### Task 2: Fix path traversal in plugin-scanner.ts

**Files:**
- Modify: `server/services/plugin-scanner.ts`

- [ ] **Step 1: Add path validation in `getSkillsFromMarketplace`**

In the inner loop of `getSkillsFromMarketplace`, after the `skillAbsPath` line (line 67), add validation:

```typescript
      for (const skillRelPath of pluginEntry.skills) {
        const skillAbsPath = path.resolve(installPath, skillRelPath);
        const resolvedInstall = path.resolve(installPath);
        if (!skillAbsPath.startsWith(resolvedInstall + path.sep)) continue;
        const skillMdPath = path.join(skillAbsPath, 'SKILL.md');
```

Note: The `path.join` on the old line 67 is replaced by `path.resolve` above, so remove the old `path.join(installPath, skillRelPath)` line.

- [ ] **Step 2: Verify build passes**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add server/services/plugin-scanner.ts
git commit -m "fix: validate marketplace skill paths to prevent traversal outside plugin dir"
```

---

### Task 3: Create shared hash-utils.ts

**Files:**
- Create: `server/services/hash-utils.ts`

- [ ] **Step 1: Create the file**

```typescript
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export function computeContentHash(skillDir: string): string {
  const hash = crypto.createHash('md5');

  const skillMdPath = path.join(skillDir, 'SKILL.md');
  if (fs.existsSync(skillMdPath)) {
    hash.update(fs.readFileSync(skillMdPath));
  }

  const scriptsDir = path.join(skillDir, 'scripts');
  if (fs.existsSync(scriptsDir)) {
    const walkDir = (dir: string) => {
      const entries = fs.readdirSync(dir).sort();
      for (const entry of entries) {
        const fullPath = path.join(dir, entry);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          walkDir(fullPath);
        } else {
          hash.update(fs.readFileSync(fullPath));
        }
      }
    };
    walkDir(scriptsDir);
  }

  return hash.digest('hex');
}

export function collectSkillContent(skillDir: string): string {
  const parts: string[] = [];

  const skillMdPath = path.join(skillDir, 'SKILL.md');
  if (fs.existsSync(skillMdPath)) {
    parts.push(fs.readFileSync(skillMdPath, 'utf-8'));
  }

  const scriptsDir = path.join(skillDir, 'scripts');
  if (fs.existsSync(scriptsDir)) {
    const walkDir = (dir: string) => {
      const entries = fs.readdirSync(dir).sort();
      for (const entry of entries) {
        const fullPath = path.join(dir, entry);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          walkDir(fullPath);
        } else {
          const relPath = path.relative(scriptsDir, fullPath);
          const content = fs.readFileSync(fullPath, 'utf-8');
          parts.push(`\n--- ${relPath} ---\n${content}`);
        }
      }
    };
    walkDir(scriptsDir);
  }

  return parts.join('\n');
}
```

- [ ] **Step 2: Verify build passes**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add server/services/hash-utils.ts
git commit -m "refactor: extract shared hash and content collection utilities"
```

---

### Task 4: Update skill-scanner.ts to use hash-utils

**Files:**
- Modify: `server/services/skill-scanner.ts`

- [ ] **Step 1: Replace local `computeHash` with import**

Add import at top:

```typescript
import { computeContentHash } from './hash-utils.js';
```

Remove the entire `computeHash` function (lines 23-51).

Replace the hash computation in `scanDirectory`:

```typescript
          hash: computeContentHash(fullPath).slice(0, 12),
```

- [ ] **Step 2: Remove unused `crypto` import**

Remove `import crypto from 'crypto';` from the top of the file since it's no longer used.

- [ ] **Step 3: Verify build passes**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add server/services/skill-scanner.ts
git commit -m "refactor: use shared hash-utils in skill-scanner, remove duplicate code"
```

---

### Task 5: Update analyzer.ts to use hash-utils

**Files:**
- Modify: `server/services/analyzer.ts`

- [ ] **Step 1: Replace local functions with imports**

Add import at top:

```typescript
import { computeContentHash, collectSkillContent } from './hash-utils.js';
```

Remove `computeContentHash` function (lines 48-76) and `collectSkillContent` function (lines 78-106).

Remove `import crypto from 'crypto';` from the top of the file since it's no longer used.

- [ ] **Step 2: Verify build passes**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add server/services/analyzer.ts
git commit -m "refactor: use shared hash-utils in analyzer, remove duplicate code"
```

---

### Task 6: Create in-memory cache module

**Files:**
- Create: `server/services/cache.ts`

- [ ] **Step 1: Create the file**

```typescript
interface CacheEntry<T> { data: T; expiry: number; }
const cache = new Map<string, CacheEntry<any>>();
const DEFAULT_TTL = 5_000; // 5 seconds

export function getOrCompute<T>(key: string, compute: () => T, ttl = DEFAULT_TTL): T {
  const entry = cache.get(key);
  if (entry && Date.now() < entry.expiry) return entry.data;
  const data = compute();
  cache.set(key, { data, expiry: Date.now() + ttl });
  return data;
}

export function invalidate(key?: string): void {
  if (key) cache.delete(key);
  else cache.clear();
}
```

- [ ] **Step 2: Verify build passes**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add server/services/cache.ts
git commit -m "feat: add TTL-based in-memory cache for API response optimization"
```

---

### Task 7: Add cache to route handlers

**Files:**
- Modify: `server/routes/skills.ts`
- Modify: `server/routes/plugins.ts`
- Modify: `server/routes/summary.ts`

- [ ] **Step 1: Add cache to skills.ts**

Add import:

```typescript
import { getOrCompute, invalidate } from '../services/cache.js';
```

Wrap the scan in the GET handler:

```typescript
router.get('/skills/custom', (_req, res) => {
  try {
    const tree = getOrCompute('custom-skills', () => scanCustomSkills());
    res.json({ tree });
  } catch (err: any) {
    console.error('Failed to scan custom skills:', err);
    res.status(500).json({ error: err.message });
  }
});
```

Add `invalidate()` after enable and disable:

```typescript
  try {
    enableSkill(skillRelativePath);
    invalidate();
    res.json({ ok: true, path: skillRelativePath });
```

Same for disable handler — add `invalidate()` after `disableSkill(skillRelativePath)`.

- [ ] **Step 2: Add cache to plugins.ts**

Add import:

```typescript
import { getOrCompute } from '../services/cache.js';
```

Wrap the scan:

```typescript
    const plugins = getOrCompute('plugin-skills', () => scanPlugins());
```

- [ ] **Step 3: Add cache to summary.ts**

Add import:

```typescript
import { getOrCompute } from '../services/cache.js';
```

Wrap both scans:

```typescript
  const tree = getOrCompute('custom-skills', () => scanCustomSkills());
  const plugins = getOrCompute('plugin-skills', () => scanPlugins());
```

- [ ] **Step 4: Verify build passes**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add server/routes/skills.ts server/routes/plugins.ts server/routes/summary.ts
git commit -m "perf: add in-memory cache to API routes, invalidate on mutation"
```

---

### Task 8: Add config input validation

**Files:**
- Modify: `server/routes/config.ts`

- [ ] **Step 1: Add validation before `saveConfig`**

Replace the PUT handler:

```typescript
router.put('/config', (req, res) => {
  const { claudeRootDir, customSkillDir, port } = req.body;
  if (port !== undefined) {
    const p = Number(port);
    if (!Number.isInteger(p) || p < 1024 || p > 65535) {
      res.status(400).json({ error: 'Port must be an integer between 1024 and 65535' });
      return;
    }
  }
  if (claudeRootDir !== undefined && (typeof claudeRootDir !== 'string' || !claudeRootDir.trim())) {
    res.status(400).json({ error: 'Claude root directory must be a non-empty string' });
    return;
  }
  if (customSkillDir !== undefined && (typeof customSkillDir !== 'string' || !customSkillDir.trim())) {
    res.status(400).json({ error: 'Custom skill directory must be a non-empty string' });
    return;
  }
  const updated = saveConfig(req.body);
  const apiConfig = loadClaudeApiConfig();
  res.json({
    claudeRootDir: updated.claudeRootDir,
    customSkillDir: updated.customSkillDir,
    port: updated.port,
    apiConfigDetected: !!apiConfig,
    apiModel: apiConfig?.model || null,
  });
});
```

Also add `invalidate` import and call after config save:

```typescript
import { invalidate } from '../services/cache.js';
```

Add `invalidate();` right after `saveConfig(req.body)`.

- [ ] **Step 2: Verify build passes**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add server/routes/config.ts
git commit -m "fix: add input validation for config API endpoint"
```

---

### Task 9: Add unified apiFetch wrapper in client.ts

**Files:**
- Modify: `src/api/client.ts`

- [ ] **Step 1: Add wrapper and refactor all functions**

Replace the entire file:

```typescript
const BASE = '/api';

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data as T;
}

export const fetchCustomSkills = () =>
  apiFetch<{ tree: any[] }>(`${BASE}/skills/custom`);

export const fetchPluginSkills = () =>
  apiFetch<{ plugins: any[] }>(`${BASE}/skills/plugin`);

export const fetchSummary = () =>
  apiFetch<any>(`${BASE}/skills/summary`);

export const enableSkill = (skillPath: string) =>
  apiFetch<any>(`${BASE}/skills/custom/enable/${skillPath}`, { method: 'POST' });

export const disableSkill = (skillPath: string) =>
  apiFetch<any>(`${BASE}/skills/custom/disable/${skillPath}`, { method: 'POST' });

export const fetchAnalysis = (source: string, name: string) =>
  apiFetch<any>(`${BASE}/analysis/${source}/${name}`);

export const triggerAnalysis = (source: string, name: string) =>
  apiFetch<any>(`${BASE}/analysis/${source}/${name}`, { method: 'POST' });

export const fetchConfig = () =>
  apiFetch<any>(`${BASE}/config`);

export const saveConfig = (config: any) =>
  apiFetch<any>(`${BASE}/config`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  });
```

- [ ] **Step 2: Verify build passes**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/api/client.ts
git commit -m "fix: add unified apiFetch wrapper with error handling for all API calls"
```

---

### Task 10: Add error and loading states to App.tsx

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Add state variables**

After the existing state declarations, add:

```typescript
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
```

- [ ] **Step 2: Wrap data loading with loading/error states**

Replace `loadSummary`, `loadCustomSkills`, `loadPluginSkills`:

```typescript
  const loadSummary = useCallback(() => fetchSummary().then(setSummary), []);

  const loadCustomSkills = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const d = await fetchCustomSkills();
      setTree(d.tree);
    } catch (err: any) {
      setError(err.message || '加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadPluginSkills = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const d = await fetchPluginSkills();
      setPlugins(d.plugins);
    } catch (err: any) {
      setError(err.message || '加载失败');
    } finally {
      setLoading(false);
    }
  }, []);
```

- [ ] **Step 3: Wrap handleToggleSkill in try-catch**

```typescript
  const handleToggleSkill = async (skillPath: string, enable: boolean) => {
    setError(null);
    try {
      if (enable) await enableSkill(skillPath);
      else await disableSkill(skillPath);
      await loadCustomSkills();
      await loadSummary();
    } catch (err: any) {
      setError(err.message || (enable ? '启用失败' : '禁用失败'));
    }
  };
```

- [ ] **Step 4: Add error banner and loading indicator to JSX**

In the `<main>` element, before the tab content, add:

```tsx
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-2 rounded mb-4 flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 ml-2">&times;</button>
          </div>
        )}
        {loading && (
          <div className="text-gray-400 text-sm py-4 text-center">加载中...</div>
        )}
```

- [ ] **Step 5: Verify build passes**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 6: Commit**

```bash
git add src/App.tsx
git commit -m "fix: add loading and error states to main App component"
```

---

### Task 11: Add error display to ConfigModal

**Files:**
- Modify: `src/components/ConfigModal.tsx`

- [ ] **Step 1: Add saveError state**

After the existing state declarations, add:

```typescript
  const [saveError, setSaveError] = useState<string | null>(null);
```

- [ ] **Step 2: Update handleSave to show errors**

```typescript
  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const data: ConfigResponse = await saveConfig(config);
      setApiConfigDetected(data.apiConfigDetected);
      setApiModel(data.apiModel);
      onSaved();
      onClose();
    } catch (err: any) {
      setSaveError(err.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };
```

- [ ] **Step 3: Add error display in JSX**

Before the button row (`<div className="flex justify-end gap-2 mt-6">`), add:

```tsx
        {saveError && (
          <div className="text-red-500 text-sm mt-3">{saveError}</div>
        )}
```

- [ ] **Step 4: Verify build passes**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add src/components/ConfigModal.tsx
git commit -m "fix: show save errors inline in ConfigModal instead of console-only"
```

---

### Task 12: Add plugin update check route

**Files:**
- Modify: `server/routes/plugins.ts`

- [ ] **Step 1: Add update check route using execFileSync**

Add import at top:

```typescript
import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { loadConfig } from '../config.js';
```

Add route after the existing GET handler:

```typescript
router.post('/plugins/check-update/:pluginName', (req, res) => {
  const { pluginName } = req.params;
  const config = loadConfig();
  const pluginsFile = path.join(config.claudePluginsDir, 'installed_plugins.json');

  if (!fs.existsSync(pluginsFile)) {
    res.json({ hasUpdate: false, error: 'No installed plugins file' });
    return;
  }

  try {
    const raw = fs.readFileSync(pluginsFile, 'utf-8');
    const installed = JSON.parse(raw).plugins || {};

    let installPath: string | null = null;
    for (const [key, entries] of Object.entries(installed)) {
      const name = key.split('@')[0];
      if (name === pluginName && entries[0]) {
        installPath = entries[0].installPath;
        break;
      }
    }

    if (!installPath || !fs.existsSync(installPath)) {
      res.json({ hasUpdate: false, error: 'Plugin not found' });
      return;
    }

    // Get current commit
    let currentCommit = '';
    try {
      currentCommit = execFileSync('git', ['rev-parse', '--short', 'HEAD'], {
        cwd: installPath,
        encoding: 'utf-8',
        timeout: 5000,
      }).trim();
    } catch {
      res.json({ hasUpdate: false, error: 'Not a git repository' });
      return;
    }

    // Fetch from origin
    try {
      execFileSync('git', ['fetch', 'origin'], {
        cwd: installPath,
        encoding: 'utf-8',
        timeout: 30000,
      });
    } catch {
      res.json({ hasUpdate: false, error: 'Network error', currentCommit });
      return;
    }

    // Check commits behind
    let behindBy = 0;
    try {
      const count = execFileSync('git', ['rev-list', '--count', 'HEAD..origin/main'], {
        cwd: installPath,
        encoding: 'utf-8',
        timeout: 5000,
      }).trim();
      behindBy = parseInt(count, 10) || 0;
    } catch {
      // Might be on a different default branch, try master
      try {
        const count = execFileSync('git', ['rev-list', '--count', 'HEAD..origin/master'], {
          cwd: installPath,
          encoding: 'utf-8',
          timeout: 5000,
        }).trim();
        behindBy = parseInt(count, 10) || 0;
      } catch {
        // Can't determine, report no update found
      }
    }

    invalidate('plugin-skills');
    res.json({ hasUpdate: behindBy > 0, behindBy, currentCommit });
  } catch (err: any) {
    res.json({ hasUpdate: false, error: err.message });
  }
});
```

Also ensure the `invalidate` import is present (should already be from Task 7).

- [ ] **Step 2: Verify build passes**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add server/routes/plugins.ts
git commit -m "feat: add plugin update check route using git fetch"
```

---

### Task 13: Add batch enable/disable routes

**Files:**
- Modify: `server/routes/skills.ts`

- [ ] **Step 1: Add batch routes**

Add import:

```typescript
import { enableSkill, disableSkill } from '../services/skill-manager.js';
```

(This import already exists. Just add the new routes after the existing ones.)

```typescript
router.post('/skills/custom/batch-enable', (req, res) => {
  const { paths } = req.body as { paths: string[] };
  if (!Array.isArray(paths) || paths.length === 0) {
    res.status(400).json({ error: 'paths must be a non-empty array' });
    return;
  }

  const failed: Array<{ path: string; error: string }> = [];
  for (const p of paths) {
    try {
      enableSkill(p);
    } catch (err: any) {
      failed.push({ path: p, error: err.message });
    }
  }
  invalidate();
  res.json({ ok: true, succeeded: paths.length - failed.length, failed });
});

router.post('/skills/custom/batch-disable', (req, res) => {
  const { paths } = req.body as { paths: string[] };
  if (!Array.isArray(paths) || paths.length === 0) {
    res.status(400).json({ error: 'paths must be a non-empty array' });
    return;
  }

  const failed: Array<{ path: string; error: string }> = [];
  for (const p of paths) {
    try {
      disableSkill(p);
    } catch (err: any) {
      failed.push({ path: p, error: err.message });
    }
  }
  invalidate();
  res.json({ ok: true, succeeded: paths.length - failed.length, failed });
});
```

- [ ] **Step 2: Verify build passes**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add server/routes/skills.ts
git commit -m "feat: add batch enable/disable routes for custom skills"
```

---

### Task 14: Add new API client functions

**Files:**
- Modify: `src/api/client.ts`

- [ ] **Step 1: Add three new functions**

Append to the end of the file:

```typescript
export const checkPluginUpdate = (pluginName: string) =>
  apiFetch<{ hasUpdate: boolean; behindBy: number; currentCommit: string; error?: string }>(
    `${BASE}/plugins/check-update/${pluginName}`,
    { method: 'POST' },
  );

export const batchEnableSkills = (paths: string[]) =>
  apiFetch<{ ok: boolean; succeeded: number; failed: Array<{ path: string; error: string }> }>(
    `${BASE}/skills/custom/batch-enable`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paths }),
    },
  );

export const batchDisableSkills = (paths: string[]) =>
  apiFetch<{ ok: boolean; succeeded: number; failed: Array<{ path: string; error: string }> }>(
    `${BASE}/skills/custom/batch-disable`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paths }),
    },
  );
```

- [ ] **Step 2: Verify build passes**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/api/client.ts
git commit -m "feat: add API client functions for plugin update check and batch operations"
```

---

### Task 15: Add update check UI to PluginPanel

**Files:**
- Modify: `src/components/PluginPanel.tsx`

- [ ] **Step 1: Add imports and type**

```typescript
import { useState } from 'react';
import SkillCard from './SkillCard';
import { checkPluginUpdate } from '../api/client';

type UpdateStatus = { hasUpdate: boolean; behindBy: number } | { error: string } | null;
```

- [ ] **Step 2: Extract PluginHeader component**

Before `export default function PluginPanel`, add:

```tsx
function PluginHeader({ plugin, isOpen, onToggle }: {
  plugin: PluginInfo;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const [checking, setChecking] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>(null);

  const handleCheckUpdate = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setChecking(true);
    setUpdateStatus(null);
    try {
      const result = await checkPluginUpdate(plugin.name);
      if (result.error) {
        setUpdateStatus({ error: result.error });
      } else {
        setUpdateStatus({ hasUpdate: result.hasUpdate, behindBy: result.behindBy });
      }
    } catch (err: any) {
      setUpdateStatus({ error: err.message || '检查失败' });
    } finally {
      setChecking(false);
    }
  };

  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center gap-2 px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
    >
      <span className={`text-xs transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`}>
        ▶
      </span>
      <span className="text-sm font-medium text-gray-800">{plugin.displayName}</span>
      <span className="text-xs text-gray-400">({plugin.skills.length})</span>
      <span className="ml-auto flex items-center gap-2">
        {updateStatus && !('error' in updateStatus) && !updateStatus.hasUpdate && (
          <span className="text-xs text-green-500">已是最新 ✓</span>
        )}
        {updateStatus && !('error' in updateStatus) && updateStatus.hasUpdate && (
          <span className="text-xs text-amber-500">落后 {updateStatus.behindBy} 个 commit</span>
        )}
        {updateStatus && 'error' in updateStatus && (
          <span className="text-xs text-red-400">{updateStatus.error}</span>
        )}
        <button
          onClick={handleCheckUpdate}
          disabled={checking}
          className="text-xs text-gray-400 hover:text-blue-500 disabled:opacity-50 transition-colors"
        >
          {checking ? '检查中...' : '检查更新'}
        </button>
        <span className="text-xs text-gray-400">只读</span>
      </span>
    </button>
  );
}
```

- [ ] **Step 3: Use PluginHeader in the main render**

Replace the `<button>` in the plugin header area with:

```tsx
            <PluginHeader plugin={plugin} isOpen={isOpen} onToggle={() => toggleExpand(plugin.name)} />
```

- [ ] **Step 4: Verify build passes**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add src/components/PluginPanel.tsx
git commit -m "feat: add plugin update check button with inline status display"
```

---

### Task 16: Add batch enable/disable UI to DirTree

**Files:**
- Modify: `src/components/DirTree.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Update DirTree Props to include batch handler**

In `DirTree.tsx`, update the Props interface:

```typescript
interface Props {
  nodes: TreeNode[];
  onToggle: (path: string, enable: boolean) => void;
  onBatchToggle?: (paths: string[], enable: boolean) => void;
  filter?: string;
}
```

Update `TreeNodeItem` props similarly:

```typescript
function TreeNodeItem({
  node,
  onToggle,
  onBatchToggle,
  filter,
}: {
  node: TreeNode;
  onToggle: (path: string, enable: boolean) => void;
  onBatchToggle?: (paths: string[], enable: boolean) => void;
  filter?: string;
}) {
```

- [ ] **Step 2: Add `collectSkillPaths` helper**

Before `TreeNodeItem`:

```typescript
function collectSkillPaths(node: TreeNode): string[] {
  if (node.type === 'skill') return [node.path];
  return (node.children ?? []).flatMap(collectSkillPaths);
}
```

- [ ] **Step 3: Add batch buttons to directory nodes**

In the directory node JSX (inside the `<button>` element, after the count span), add batch buttons:

```tsx
        <span className="ml-auto flex items-center gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); onBatchToggle?.(collectSkillPaths(node), true); }}
            className="text-xs text-blue-400 hover:text-blue-600 transition-colors"
          >
            全部启用
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onBatchToggle?.(collectSkillPaths(node), false); }}
            className="text-xs text-gray-400 hover:text-red-500 transition-colors"
          >
            全部禁用
          </button>
        </span>
```

- [ ] **Step 4: Pass props through recursive calls and DirTree**

Update the recursive `<TreeNodeItem>` call to pass `onBatchToggle`:

```tsx
            <TreeNodeItem
              key={child.path}
              node={child}
              onToggle={onToggle}
              onBatchToggle={onBatchToggle}
              filter={filter}
            />
```

Update the `DirTree` component to pass `onBatchToggle`:

```typescript
export default function DirTree({ nodes, onToggle, onBatchToggle, filter }: Props) {
```

```tsx
        <TreeNodeItem
          key={node.path}
          node={node}
          onToggle={onToggle}
          onBatchToggle={onBatchToggle}
          filter={filter}
        />
```

- [ ] **Step 5: Add handleBatchToggle to App.tsx**

In `App.tsx`, add import for batch functions:

```typescript
import {
  fetchCustomSkills,
  fetchPluginSkills,
  fetchSummary,
  enableSkill,
  disableSkill,
  batchEnableSkills,
  batchDisableSkills,
} from './api/client';
```

Add handler after `handleToggleSkill`:

```typescript
  const handleBatchToggle = async (paths: string[], enable: boolean) => {
    setError(null);
    try {
      const result = enable ? await batchEnableSkills(paths) : await batchDisableSkills(paths);
      if (result.failed.length > 0) {
        setError(`${result.failed.length} 个 skill 操作失败`);
      }
      await loadCustomSkills();
      await loadSummary();
    } catch (err: any) {
      setError(err.message || '批量操作失败');
    }
  };
```

Pass to DirTree:

```tsx
          <DirTree nodes={tree} onToggle={handleToggleSkill} onBatchToggle={handleBatchToggle} filter={search} />
```

- [ ] **Step 6: Verify build passes**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 7: Commit**

```bash
git add src/components/DirTree.tsx src/App.tsx
git commit -m "feat: add batch enable/disable buttons on directory nodes in DirTree"
```
