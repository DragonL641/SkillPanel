# SkillPanel Enhancement Design

> **Goal:** Fix security/reliability issues, add performance optimizations, and introduce plugin update checking and batch skill operations.

---

## A. Security & Reliability Fixes

### 1. Path Traversal Fix — `server/services/skill-manager.ts`

**Current problem:** `resolveSkillDir` uses regex to strip leading `../`, but embedded traversals like `foo/../../bar` pass through.

**Fix:** Use `path.resolve` + prefix validation:

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

### 2. Path Traversal Fix — `server/services/plugin-scanner.ts`

**Current problem:** `skillRelPath` from `marketplace.json` is joined with `installPath` without validation. A malicious `../../` path could resolve outside the plugin directory.

**Fix:** In `getSkillsFromMarketplace`, after resolving the absolute path, validate it starts with `installPath`:

```typescript
const skillAbsPath = path.resolve(installPath, skillRelPath);
if (!skillAbsPath.startsWith(path.resolve(installPath) + path.sep)) continue;
```

### 3. API Client Error Handling — `src/api/client.ts`

**Current problem:** 7 of 8 fetch functions ignore HTTP error status codes. Only `triggerAnalysis` checks `res.ok`.

**Fix:** Extract a unified `apiFetch` wrapper:

```typescript
async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}
```

Refactor all exported functions to use this wrapper. This ensures errors from enable/disable/config/etc. are properly thrown and can be caught by callers.

### 4. Config Input Validation — `server/routes/config.ts`

**Current problem:** PUT handler accepts any values without validation.

**Fix:** Add validation before calling `saveConfig`:

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
  // ... return response
});
```

### 5. Frontend Error Feedback — `src/App.tsx` + `src/components/ConfigModal.tsx`

**Current problem:** `handleToggleSkill` has no try-catch; `ConfigModal.handleSave` catches errors but only logs them.

**Fix:**

- `App.tsx`: Add an `error` state. Wrap `handleToggleSkill` in try-catch, set error message on failure, display as a dismissible banner at the top of the page.
- `ConfigModal.tsx`: Add an `error` state. On save failure, set error message, keep modal open, display error inline above the buttons.

---

## B. Performance & Code Quality

### 6. In-Memory Cache — `server/services/cache.ts` (new file)

**Current problem:** Every API request triggers full synchronous filesystem scans.

**Fix:** Simple TTL-based in-memory cache:

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

Usage in route handlers:

```typescript
// skills.ts
router.get('/skills/custom', (_req, res) => {
  const tree = getOrCompute('custom-skills', () => scanCustomSkills());
  res.json({ tree });
});
```

After enable/disable, call `invalidate()` to force fresh data on next request.

### 7. Deduplicate Hash Utilities — `server/services/hash-utils.ts` (new file)

**Current problem:** `computeHash` exists in both `skill-scanner.ts` and `analyzer.ts` with minor differences (one truncates to 12 chars). `collectSkillContent` in `analyzer.ts` duplicates the directory walking logic.

**Fix:** Extract shared functions:

```typescript
// hash-utils.ts
export function computeContentHash(skillDir: string): string {
  // Full MD5 hash of SKILL.md + scripts/
}

export function collectSkillContent(skillDir: string): string {
  // Concatenate SKILL.md + all files in scripts/ with headers
}
```

- `skill-scanner.ts` uses `computeContentHash` and slices to 12 chars for display.
- `analyzer.ts` uses both functions directly.

### 8. Frontend Loading State — `src/App.tsx`

**Current problem:** No loading indicator when data is being fetched.

**Fix:** Add `loading` state, show a simple text indicator ("加载中...") in the main content area while fetching, hide when data arrives or errors occur.

---

## C. New Features

### 9. Plugin Update Check

#### Backend — New route in `server/routes/plugins.ts`

```
POST /api/plugins/check-update/:pluginName
```

Logic:
1. Read `installed_plugins.json` to find the plugin's `installPath`
2. In `installPath`, run `git fetch --dry-run 2>&1`
3. If fetch output contains new refs → has update
4. Also run `git rev-list --count HEAD..origin/main 2>/dev/null` for commit count
5. Return `{ hasUpdate: boolean, behindBy: number, currentCommit: string }`

Error cases:
- Not a git repo → `{ hasUpdate: false, error: 'Not a git repository' }`
- No network → `{ hasUpdate: false, error: 'Network error' }`

#### Frontend — `src/components/PluginPanel.tsx`

Each plugin's header row gets a "检查更新" button (text button, right-aligned, before "只读"). On click:
1. Call the API
2. Show result inline: "已是最新 ✓" or "落后 N 个 commit" or error message
3. Button disabled during check

Add API client function:
```typescript
export const checkPluginUpdate = (pluginName: string) =>
  apiFetch<{ hasUpdate: boolean; behindBy: number; currentCommit: string }>(
    `${BASE}/plugins/check-update/${pluginName}`,
    { method: 'POST' }
  );
```

### 10. Batch Enable/Disable

#### Backend — New routes in `server/routes/skills.ts`

```
POST /api/skills/custom/batch-enable   body: { paths: string[] }
POST /api/skills/custom/batch-disable  body: { paths: string[] }
```

Logic: Iterate over paths array, call `enableSkill`/`disableSkill` for each. Return `{ ok: true, succeeded: number, failed: Array<{path, error}> }`.

#### Frontend — `src/components/DirTree.tsx`

On each directory node (not skill leaf nodes), add two small text buttons: "全部启用" and "全部禁用".

Logic:
1. Recursively collect all skill paths under the directory
2. Call the batch API
3. Refresh the skill list on success
4. Show error summary on partial failure

Add API client functions:
```typescript
export const batchEnableSkills = (paths: string[]) =>
  apiFetch(`${BASE}/skills/custom/batch-enable`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ paths }),
  });

export const batchDisableSkills = (paths: string[]) =>
  apiFetch(`${BASE}/skills/custom/batch-disable`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ paths }),
  });
```

---

## File Change Summary

| File | Action | Description |
|---|---|---|
| `server/services/skill-manager.ts` | Modify | Fix path traversal in `resolveSkillDir` |
| `server/services/plugin-scanner.ts` | Modify | Fix path traversal in marketplace skill path resolution |
| `server/services/cache.ts` | Create | TTL-based in-memory cache |
| `server/services/hash-utils.ts` | Create | Shared hash computation and content collection |
| `server/services/skill-scanner.ts` | Modify | Use `hash-utils.ts`, remove duplicate code |
| `server/services/analyzer.ts` | Modify | Use `hash-utils.ts`, remove duplicate code |
| `server/routes/config.ts` | Modify | Add input validation |
| `server/routes/skills.ts` | Modify | Add cache, batch enable/disable routes |
| `server/routes/plugins.ts` | Modify | Add cache, plugin update check route |
| `server/routes/summary.ts` | Modify | Add cache |
| `src/api/client.ts` | Modify | Unified `apiFetch` wrapper, new API functions |
| `src/App.tsx` | Modify | Error state, loading state |
| `src/components/ConfigModal.tsx` | Modify | Error display on save failure |
| `src/components/PluginPanel.tsx` | Modify | Update check button and result display |
| `src/components/DirTree.tsx` | Modify | Batch enable/disable buttons on directory nodes |
