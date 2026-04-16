# Project-Level Skill Configuration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add multi-directory custom skill support and per-project skill enable/disable management to SkillPanel.

**Architecture:** Extend the existing config model from single `customSkillDir` to `customSkillDirs[]`, add `projects[]` for registered projects. Parameterize the skill-manager symlink functions to accept a target directory. New project routes reuse existing skill-manager logic with project-specific paths. Frontend adds a third tab "项目级 Skill 管理" with sidebar + content layout.

**Tech Stack:** TypeScript, Express 5, React 19, Tailwind CSS 4, vitest + supertest

**Spec:** `docs/superpowers/specs/2026-04-17-project-level-skill-config-design.md`

---

## File Structure

### New files
| File | Responsibility |
|------|---------------|
| `server/routes/projects.ts` | Project CRUD + project-skill enable/disable API routes |
| `server/services/project-scanner.ts` | Scan project's `.claude/skills/` for enabled skills, build project skill list |
| `src/components/ProjectSidebar.tsx` | Left sidebar: project list with add/remove |
| `src/components/ProjectSkillView.tsx` | Right content: global (read-only) + project skills (editable) |
| `src/components/AddSkillModal.tsx` | Modal to pick skills to add at project level |
| `src/hooks/useProjects.ts` | Hook for project data fetching and mutations |

### Modified files
| File | Change |
|------|--------|
| `server/config.ts` | `customSkillDirs: string[]`, `projects: ProjectConfig[]`, backward compat |
| `server/services/skill-manager.ts` | Parameterize `enableSkill`/`disableSkill` with `targetSkillsDir` |
| `server/services/skill-scanner.ts` | Multi-dir scanning, return tree grouped by source directory |
| `server/index.ts` | Mount `/api` project routes |
| `server/__tests__/app.ts` | Mount project routes in test app |
| `server/__tests__/api-routes.test.ts` | Update config helper for `customSkillDirs`, add project tests |
| `src/types.ts` | Add `ProjectConfig`, `ProjectInfo`, `ProjectSkill` types |
| `src/api/client.ts` | Add project API functions |
| `src/App.tsx` | Add `project` tab, integrate new components |
| `src/components/TabSwitch.tsx` | Three tabs: `global`, `project`, `plugin` |
| `src/components/ConfigModal.tsx` | Multi-directory input list |
| `server/routes/config.ts` | Accept `customSkillDirs` and `projects` in PUT |
| `server/routes/summary.ts` | May need project-aware summary |

---

## Task 1: Config Model — Multi-Dir + Projects

**Files:**
- Modify: `server/config.ts`
- Modify: `server/routes/config.ts`
- Test: `server/__tests__/api-routes.test.ts`

- [ ] **Step 1: Update `AppConfig` interface in `server/config.ts`**

Add `customSkillDirs` and `projects` to the interface. Keep `customSkillDir` for backward compat (migration). Add `ProjectConfig` interface.

In `server/config.ts`, change the interface and `buildConfig`:

```typescript
export interface ProjectConfig {
  name: string;
  path: string;
}

export interface AppConfig {
  claudeRootDir: string;
  customSkillDir: string;      // kept for migration, derived from customSkillDirs[0]
  customSkillDirs: string[];   // NEW: multiple directories
  port: number;
  projects: ProjectConfig[];   // NEW: registered projects
  // Auto-derived
  claudeSkillsDir: string;
  claudePluginsDir: string;
}
```

Update `buildConfig()` to:
- Read `customSkillDirs` from config file
- If `customSkillDir` exists but `customSkillDirs` doesn't, migrate: `customSkillDirs = [customSkillDir]`
- Read `projects` array (default `[]`)
- Derive `customSkillDir` from `customSkillDirs[0] || ''` for backward compat

- [ ] **Step 2: Update `saveConfig()` to persist new fields**

In `server/config.ts`, update `saveConfig()` to merge and persist `customSkillDirs` and `projects`.

- [ ] **Step 3: Update config route validation**

In `server/routes/config.ts`, update PUT handler to accept:
- `customSkillDirs`: optional string array (validate each is non-empty string)
- `projects`: optional array of `{ name, path }` objects

- [ ] **Step 4: Update `buildConfigResponse()` to include new fields**

Add `customSkillDirs`, `projects`, and `configured` (true if `customSkillDirs.length > 0` and all exist).

- [ ] **Step 5: Update `isConfigured()` to check `customSkillDirs`**

Change from `!!config.customSkillDir` to `config.customSkillDirs.length > 0`.

- [ ] **Step 6: Update existing tests in `api-routes.test.ts`**

In `setupConfig()`, write `customSkillDirs` array instead of single `customSkillDir`. Update assertions for new config response shape. Ensure all existing tests still pass.

- [ ] **Step 7: Run tests to verify**

Run: `npx vitest --run server/__tests__/`
Expected: All existing tests pass with new config shape.

- [ ] **Step 8: Commit**

```bash
git add server/config.ts server/routes/config.ts server/__tests__/api-routes.test.ts
git commit -m "feat(config): support multiple skill directories and project registration"
```

---

## Task 2: Skill Manager — Parameterize Target Directory

**Files:**
- Modify: `server/services/skill-manager.ts`
- Test: `server/services/__tests__/skill-manager.test.ts`

- [ ] **Step 1: Add `targetSkillsDir` parameter to `enableSkill`**

In `server/services/skill-manager.ts`, change signature:

```typescript
export function enableSkill(
  config: AppConfig,
  skillRelativePath: string,
  targetSkillsDir?: string,  // defaults to config.claudeSkillsDir
): void {
```

Inside, use `targetSkillsDir ?? config.claudeSkillsDir` instead of `config.claudeSkillsDir`. Update `getSymlinkPath` call similarly. The `resolveSkillDir` still resolves against `config.customSkillDirs` (or the first one).

- [ ] **Step 2: Add `targetSkillsDir` parameter to `disableSkill`**

Same pattern — add optional `targetSkillsDir` parameter, default to `config.claudeSkillsDir`.

- [ ] **Step 3: Update `batchToggleSkills` to pass through `targetSkillsDir`**

```typescript
export function batchToggleSkills(
  config: AppConfig,
  paths: string[],
  action: 'enable' | 'disable',
  targetSkillsDir?: string,
): BatchToggleResult {
```

- [ ] **Step 4: Update `resolveSkillDir` to search all `customSkillDirs`**

Currently resolves against `config.customSkillDir`. Change to search through `config.customSkillDirs`:

```typescript
export function resolveSkillDir(config: AppConfig, skillRelativePath: string): string {
  for (const dir of config.customSkillDirs) {
    const resolved = path.resolve(dir, skillRelativePath);
    const base = path.resolve(dir);
    if (resolved.startsWith(base + path.sep) && fs.existsSync(resolved)) {
      return resolved;
    }
  }
  // Fallback to first dir for error messages / new paths
  const resolved = path.resolve(config.customSkillDirs[0] || config.customSkillDir, skillRelativePath);
  const base = path.resolve(config.customSkillDirs[0] || config.customSkillDir);
  if (!resolved.startsWith(base + path.sep) && resolved !== base) {
    throw new ValidationError('Invalid skill path: path traversal detected');
  }
  return resolved;
}
```

- [ ] **Step 5: Update existing skill-manager tests**

Ensure `skill-manager.test.ts` still passes. If it uses `customSkillDir`, update setup to use `customSkillDirs`.

- [ ] **Step 6: Run tests**

Run: `npx vitest --run server/services/__tests__/skill-manager.test.ts`
Expected: All tests pass.

- [ ] **Step 7: Commit**

```bash
git add server/services/skill-manager.ts server/services/__tests__/skill-manager.test.ts
git commit -m "refactor(skill-manager): parameterize target skills directory"
```

---

## Task 3: Skill Scanner — Multi-Directory Support

**Files:**
- Modify: `server/services/skill-scanner.ts`

- [ ] **Step 1: Update `scanCustomSkills` to iterate `customSkillDirs`**

Change `scanCustomSkills` to iterate all directories in `config.customSkillDirs`. Each directory becomes a top-level `TreeNode` of type `'dir'` (representing the source directory), with its children being the skills found inside.

```typescript
export function scanCustomSkills(config: AppConfig): TreeNode[] {
  const roots: TreeNode[] = [];
  for (const dir of config.customSkillDirs) {
    if (!fs.existsSync(dir)) continue;
    const dirName = path.basename(dir);
    const children = scanDirectory(config, dir, dir);
    if (children.length > 0) {
      roots.push({
        type: 'dir',
        name: dirName,
        path: dirName,
        children,
      });
    }
  }
  return roots;
}
```

This wraps each source directory as a top-level group, matching the UI design where skills are shown grouped by source directory.

- [ ] **Step 2: Update `isEnabled` to accept explicit skillsDir**

The `isEnabled` function currently uses `config.claudeSkillsDir`. Add optional parameter:

```typescript
function isEnabled(skillsDir: string, skillDir: string, skillName: string): boolean {
```

Callers pass `config.claudeSkillsDir` for global checks.

- [ ] **Step 3: Update `findSkillDir` to search all `customSkillDirs`**

When `source === 'custom'`, search across all directories in `config.customSkillDirs`.

- [ ] **Step 4: Update `getSkillsSummary` to count across all dirs**

The summary should count all skills from all custom directories.

- [ ] **Step 5: Run existing tests**

Run: `npx vitest --run`
Expected: All pass. The scanner now returns skills grouped by source directory.

- [ ] **Step 6: Commit**

```bash
git add server/services/skill-scanner.ts
git commit -m "feat(scanner): support multiple custom skill directories"
```

---

## Task 4: Project Scanner Service

**Files:**
- Create: `server/services/project-scanner.ts`

- [ ] **Step 1: Create project scanner**

```typescript
// server/services/project-scanner.ts
import fs from 'fs';
import path from 'path';
import type { AppConfig, ProjectConfig } from '../config.js';

export interface ProjectSkillInfo {
  name: string;
  description: string;
  path: string;           // relative to customSkillDir, e.g. "superpowers/brainstorming"
  source: 'global' | 'project';
  enabled: boolean;
}

export interface ProjectInfo {
  name: string;
  path: string;
  skillsDir: string;
  globalEnabledCount: number;
  projectEnabledCount: number;
}

/** Get the .claude/skills directory for a project */
export function getProjectSkillsDir(project: ProjectConfig): string {
  return path.join(project.path, '.claude', 'skills');
}

/** List symlinks in a directory, return target paths */
function listSymlinks(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const targets: string[] = [];
  for (const entry of fs.readdirSync(dir)) {
    const linkPath = path.join(dir, entry);
    try {
      const stat = fs.lstatSync(linkPath);
      if (stat.isSymbolicLink()) {
        targets.push(fs.readlinkSync(linkPath));
      }
    } catch { /* skip */ }
  }
  return targets;
}

/** Check if a skill is enabled at project level */
export function isProjectSkillEnabled(projectSkillsDir: string, skillAbsoluteDir: string): boolean {
  const skillName = path.basename(skillAbsoluteDir);
  const linkPath = path.join(projectSkillsDir, skillName);
  try {
    const stat = fs.lstatSync(linkPath);
    if (stat.isSymbolicLink()) {
      const target = fs.readlinkSync(linkPath);
      return path.resolve(path.dirname(linkPath), target) === path.resolve(skillAbsoluteDir);
    }
  } catch { /* */ }
  return false;
}

/** Build project info with stats */
export function buildProjectInfo(
  config: AppConfig,
  project: ProjectConfig,
  allSkillDirs: string[],  // absolute paths to all custom skill directories
): ProjectInfo {
  const skillsDir = getProjectSkillsDir(project);
  const projectLinks = listSymlinks(skillsDir);
  const globalLinks = listSymlinks(config.claudeSkillsDir);

  // Count project-level enabled (links in project dir that point to our skill dirs)
  let projectEnabledCount = 0;
  for (const link of projectLinks) {
    const resolved = path.resolve(skillsDir, link);
    if (allSkillDirs.some(d => resolved.startsWith(path.resolve(d)))) {
      projectEnabledCount++;
    }
  }

  return {
    name: project.name,
    path: project.path,
    skillsDir,
    globalEnabledCount: globalLinks.length,
    projectEnabledCount,
  };
}

/** Get all effective skills for a project */
export function getProjectSkills(
  config: AppConfig,
  project: ProjectConfig,
  allSkills: Array<{ name: string; description: string; relativePath: string; absolutePath: string }>,
): {
  globalSkills: ProjectSkillInfo[];
  projectSkills: ProjectSkillInfo[];
} {
  const projectSkillsDir = getProjectSkillsDir(project);
  const globalSkills: ProjectSkillInfo[] = [];
  const projectSkills: ProjectSkillInfo[] = [];

  for (const skill of allSkills) {
    const globallyEnabled = isSkillInSymlinks(config.claudeSkillsDir, skill.absolutePath);
    const projectEnabled = isSkillInSymlinks(projectSkillsDir, skill.absolutePath);

    if (globallyEnabled) {
      globalSkills.push({
        name: skill.name,
        description: skill.description,
        path: skill.relativePath,
        source: 'global',
        enabled: true,
      });
    }

    if (projectEnabled && !globallyEnabled) {
      projectSkills.push({
        name: skill.name,
        description: skill.description,
        path: skill.relativePath,
        source: 'project',
        enabled: true,
      });
    } else if (projectEnabled && globallyEnabled) {
      // Also enabled at project level but global takes precedence in display
      // Show in global section only
    }

    // Skills not enabled at any level: available to add
  }

  return { globalSkills, projectSkills };
}

function isSkillInSymlinks(skillsDir: string, skillAbsoluteDir: string): boolean {
  const skillName = path.basename(skillAbsoluteDir);
  const linkPath = path.join(skillsDir, skillName);
  try {
    const stat = fs.lstatSync(linkPath);
    if (stat.isSymbolicLink()) {
      const target = fs.readlinkSync(linkPath);
      return path.resolve(path.dirname(linkPath), target) === path.resolve(skillAbsoluteDir);
    }
  } catch { /* */ }
  return false;
}
```

- [ ] **Step 2: Commit**

```bash
git add server/services/project-scanner.ts
git commit -m "feat(project-scanner): scan project-level skill configuration"
```

---

## Task 5: Project API Routes

**Files:**
- Create: `server/routes/projects.ts`
- Modify: `server/index.ts` — mount project routes
- Modify: `server/__tests__/app.ts` — mount project routes

- [ ] **Step 1: Create project routes**

```typescript
// server/routes/projects.ts
import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { loadConfig } from '../config.js';
import { enableSkill, disableSkill, batchToggleSkills, resolveSkillDir } from '../services/skill-manager.js';
import { buildProjectInfo, getProjectSkills, getProjectSkillsDir } from '../services/project-scanner.js';
import { scanCustomSkills, findSkillDir } from '../services/skill-scanner.js';
import { invalidateByPrefix } from '../services/cache.js';
import { ValidationError, NotFoundError, ConflictError } from '../errors.js';

const router = Router();

// GET /api/projects — list registered projects
router.get('/projects', (_req, res) => {
  const config = loadConfig();
  const allSkillDirs = config.customSkillDirs.filter(d => fs.existsSync(d));
  const projects = (config.projects || []).map(p =>
    buildProjectInfo(config, p, allSkillDirs)
  );
  res.json({ projects });
});

// POST /api/projects — register a new project
router.post('/projects', (req, res) => {
  const { path: projectPath } = req.body as { path?: string };
  if (!projectPath || typeof projectPath !== 'string' || !projectPath.trim()) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'path is required' } });
    return;
  }
  const resolved = path.resolve(projectPath);
  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isDirectory()) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Path does not exist or is not a directory' } });
    return;
  }
  const name = path.basename(resolved);
  const config = loadConfig();
  const projects = config.projects || [];
  if (projects.some(p => p.name === name)) {
    res.status(409).json({ error: { code: 'CONFLICT', message: `Project "${name}" already registered` } });
    return;
  }
  projects.push({ name, path: resolved });
  // Save via the config save mechanism
  // ... (use saveConfig or direct file write)
  invalidateByPrefix('config');
  res.json({ ok: true, project: { name, path: resolved } });
});

// DELETE /api/projects/:name — unregister project
router.delete('/projects/:name', (req, res) => {
  const { name } = req.params;
  const config = loadConfig();
  const projects = config.projects || [];
  const idx = projects.findIndex(p => p.name === name);
  if (idx === -1) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: `Project "${name}" not found` } });
    return;
  }
  projects.splice(idx, 1);
  // Save updated projects list
  invalidateByPrefix('config');
  res.json({ ok: true });
});

// GET /api/projects/:name/skills — get project's effective skills
router.get('/projects/:name/skills', (req, res) => {
  const { name } = req.params;
  const config = loadConfig();
  const project = (config.projects || []).find(p => p.name === name);
  if (!project) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: `Project "${name}" not found` } });
    return;
  }
  // Scan all custom skills to build flat list
  const tree = scanCustomSkills(config);
  const allSkills = flattenSkills(tree, config.customSkillDirs);
  const result = getProjectSkills(config, project, allSkills);
  res.json(result);
});

// POST /api/projects/:name/skills/enable/*skillPath
router.post('/api/projects/:name/skills/enable/{*skillPath}', (req, res) => {
  const { name } = req.params;
  const raw = req.params.skillPath;
  const skillRelativePath = Array.isArray(raw) ? raw.join('/') : raw;
  if (!skillRelativePath) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Skill path is required' } });
    return;
  }
  const config = loadConfig();
  const project = (config.projects || []).find(p => p.name === name);
  if (!project) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: `Project "${name}" not found` } });
    return;
  }
  const targetDir = getProjectSkillsDir(project);
  // Ensure project .claude/skills exists
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }
  enableSkill(config, skillRelativePath, targetDir);
  invalidateByPrefix('skills:');
  res.json({ ok: true, path: skillRelativePath });
});

// POST /api/projects/:name/skills/disable/*skillPath
router.post('/api/projects/:name/skills/disable/{*skillPath}', (req, res) => {
  const { name } = req.params;
  const raw = req.params.skillPath;
  const skillRelativePath = Array.isArray(raw) ? raw.join('/') : raw;
  if (!skillRelativePath) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Skill path is required' } });
    return;
  }
  const config = loadConfig();
  const project = (config.projects || []).find(p => p.name === name);
  if (!project) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: `Project "${name}" not found` } });
    return;
  }
  const targetDir = getProjectSkillsDir(project);
  disableSkill(config, skillRelativePath, targetDir);
  invalidateByPrefix('skills:');
  res.json({ ok: true, path: skillRelativePath });
});

// Batch enable/disable for project
router.post('/api/projects/:name/skills/batch-enable', (req, res) => {
  const { name } = req.params;
  const { paths } = req.body as { paths: string[] };
  if (!Array.isArray(paths) || paths.length === 0) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'paths must be a non-empty array' } });
    return;
  }
  const config = loadConfig();
  const project = (config.projects || []).find(p => p.name === name);
  if (!project) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: `Project "${name}" not found` } });
    return;
  }
  const targetDir = getProjectSkillsDir(project);
  if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
  const result = batchToggleSkills(config, paths, 'enable', targetDir);
  invalidateByPrefix('skills:');
  res.json(result);
});

router.post('/api/projects/:name/skills/batch-disable', (req, res) => {
  const { name } = req.params;
  const { paths } = req.body as { paths: string[] };
  if (!Array.isArray(paths) || paths.length === 0) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'paths must be a non-empty array' } });
    return;
  }
  const config = loadConfig();
  const project = (config.projects || []).find(p => p.name === name);
  if (!project) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: `Project "${name}" not found` } });
    return;
  }
  const targetDir = getProjectSkillsDir(project);
  const result = batchToggleSkills(config, paths, 'disable', targetDir);
  invalidateByPrefix('skills:');
  res.json(result);
});

/** Flatten tree to skill list */
function flattenSkills(
  nodes: Array<{ type: string; name: string; path: string; skill?: any; children?: any[] }>,
  customSkillDirs: string[],
): Array<{ name: string; description: string; relativePath: string; absolutePath: string }> {
  const result: Array<{ name: string; description: string; relativePath: string; absolutePath: string }> = [];
  for (const node of nodes) {
    if (node.type === 'skill' && node.skill) {
      result.push({
        name: node.skill.name,
        description: node.skill.description,
        relativePath: node.path,
        absolutePath: node.skill.absolutePath,
      });
    }
    if (node.children) {
      result.push(...flattenSkills(node.children, customSkillDirs));
    }
  }
  return result;
}

export default router;
```

- [ ] **Step 2: Mount project routes in `server/index.ts`**

Add import and mount:
```typescript
import projectsRoutes from './routes/projects.js';
// ...
app.use('/api', projectsRoutes);
```

- [ ] **Step 3: Mount project routes in `server/__tests__/app.ts`**

Add import and mount:
```typescript
import projectsRoutes from '../routes/projects.js';
// ...
app.use('/api', projectsRoutes);
```

- [ ] **Step 4: Run all tests**

Run: `npx vitest --run`
Expected: All existing tests pass. New routes return 404 for missing projects (no project registered yet).

- [ ] **Step 5: Commit**

```bash
git add server/routes/projects.ts server/index.ts server/__tests__/app.ts
git commit -m "feat(projects): add project CRUD and project-skill API routes"
```

---

## Task 6: Backend Integration Tests for Projects

**Files:**
- Modify: `server/__tests__/api-routes.test.ts`

- [ ] **Step 1: Add project test helpers**

In `api-routes.test.ts`, add helper to create a project-like directory:

```typescript
function createProjectDir(tmpRoot: string, name: string): string {
  const projectDir = path.join(tmpRoot, name);
  fs.mkdirSync(projectDir, { recursive: true });
  fs.mkdirSync(path.join(projectDir, '.claude'), { recursive: true });
  return projectDir;
}
```

- [ ] **Step 2: Add tests for POST /api/projects**

Test registering a project, duplicate name rejection, invalid path rejection.

- [ ] **Step 3: Add tests for GET /api/projects**

Test listing registered projects with stats.

- [ ] **Step 4: Add tests for project skill enable/disable**

Test enabling/disabling a skill for a project, verify symlink created in `<project>/.claude/skills/`.

- [ ] **Step 5: Add tests for DELETE /api/projects/:name**

Test unregistering a project, verify symlinks left intact.

- [ ] **Step 6: Run all tests**

Run: `npx vitest --run`
Expected: All pass.

- [ ] **Step 7: Commit**

```bash
git add server/__tests__/api-routes.test.ts
git commit -m "test(projects): integration tests for project API routes"
```

---

## Task 7: Frontend Types & API Client

**Files:**
- Modify: `src/types.ts`
- Modify: `src/api/client.ts`

- [ ] **Step 1: Add project-related types to `src/types.ts`**

```typescript
/** A registered project */
export interface ProjectInfo {
  name: string;
  path: string;
  skillsDir: string;
  globalEnabledCount: number;
  projectEnabledCount: number;
}

/** A skill in project context */
export interface ProjectSkill {
  name: string;
  description: string;
  path: string;
  source: 'global' | 'project';
  enabled: boolean;
}

/** Response from GET /api/projects/:name/skills */
export interface ProjectSkillsResponse {
  globalSkills: ProjectSkill[];
  projectSkills: ProjectSkill[];
}

/** Update AppConfig to include new fields */
export interface AppConfig {
  claudeRootDir?: string;
  customSkillDir?: string;
  customSkillDirs?: string[];
  port?: number;
  projects?: Array<{ name: string; path: string }>;
}
```

- [ ] **Step 2: Add project API functions to `src/api/client.ts`**

```typescript
export const fetchProjects = () =>
  apiFetch<{ projects: ProjectInfo[] }>(`${BASE}/projects`);

export const registerProject = (projectPath: string) =>
  apiFetch<{ ok: boolean; project: { name: string; path: string } }>(`${BASE}/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: projectPath }),
  });

export const unregisterProject = (name: string) =>
  apiFetch<{ ok: boolean }>(`${BASE}/projects/${name}`, { method: 'DELETE' });

export const fetchProjectSkills = (name: string) =>
  apiFetch<ProjectSkillsResponse>(`${BASE}/projects/${name}/skills`);

export const enableProjectSkill = (projectName: string, skillPath: string) =>
  apiFetch<{ ok: boolean; path: string }>(`${BASE}/projects/${projectName}/skills/enable/${skillPath}`, { method: 'POST' });

export const disableProjectSkill = (projectName: string, skillPath: string) =>
  apiFetch<{ ok: boolean; path: string }>(`${BASE}/projects/${projectName}/skills/disable/${skillPath}`, { method: 'POST' });

export const batchEnableProjectSkills = (projectName: string, paths: string[]) =>
  apiFetch<{ ok: boolean; succeeded: number; failed: Array<{ path: string; error: string }> }>(
    `${BASE}/projects/${projectName}/skills/batch-enable`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ paths }) },
  );

export const batchDisableProjectSkills = (projectName: string, paths: string[]) =>
  apiFetch<{ ok: boolean; succeeded: number; failed: Array<{ path: string; error: string }> }>(
    `${BASE}/projects/${projectName}/skills/batch-disable`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ paths }) },
  );
```

- [ ] **Step 3: Commit**

```bash
git add src/types.ts src/api/client.ts
git commit -m "feat(frontend): add project types and API client functions"
```

---

## Task 8: TabSwitch — Three Tabs

**Files:**
- Modify: `src/components/TabSwitch.tsx`

- [ ] **Step 1: Update TabSwitch to support three tabs**

```typescript
import { FolderCode, FolderTree, Puzzle } from 'lucide-react';

type TabKey = 'global' | 'project' | 'plugin';

interface Props {
  active: TabKey;
  onChange: (tab: TabKey) => void;
}

const tabs: { key: TabKey; label: string; icon: typeof FolderCode }[] = [
  { key: 'global', label: '全局 Skill 管理', icon: FolderCode },
  { key: 'project', label: '项目级 Skill 管理', icon: FolderTree },
  { key: 'plugin', label: '插件技能管理', icon: Puzzle },
];

export default function TabSwitch({ active, onChange }: Props) {
  return (
    <div className="flex gap-1 p-1 bg-surface-tertiary rounded-[var(--radius-md)]">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = active === tab.key;
        return (
          <button
            key={tab.key}
            onClick={() => onChange(tab.key)}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-[var(--radius-sm)] transition-all ${
              isActive
                ? 'bg-surface-primary text-fg-primary shadow-[0_1px_2px_rgba(0,0,0,0.04)]'
                : 'text-fg-secondary hover:text-fg-primary'
            }`}
          >
            <Icon size={14} />
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/TabSwitch.tsx
git commit -m "feat(tabs): update to three-tab layout with new names"
```

---

## Task 9: ConfigModal — Multi-Directory Support

**Files:**
- Modify: `src/components/ConfigModal.tsx`

- [ ] **Step 1: Update config state to use `customSkillDirs` array**

Replace single `customSkillDir` with `customSkillDirs: string[]`. On load, convert from API response. On save, send array.

- [ ] **Step 2: Add directory list UI**

Replace the single input with a list of directories, each with:
- Path display (monospace)
- Delete button (X icon)
- "添加目录" button at bottom using `DirPicker` component

- [ ] **Step 3: Integrate DirPicker for adding directories**

Use the existing `DirPicker` component (used in `SetupWizard`) for directory selection.

- [ ] **Step 4: Commit**

```bash
git add src/components/ConfigModal.tsx
git commit -m "feat(config-modal): support multiple custom skill directories"
```

---

## Task 10: ProjectSidebar Component

**Files:**
- Create: `src/components/ProjectSidebar.tsx`

- [ ] **Step 1: Create ProjectSidebar**

Component with:
- Title "项目列表" + add button
- List of project cards (name, path, stats)
- Selected state styling (accent border + light bg)
- Delete button per card
- Uses `DirPicker` for adding new projects

Props: `projects: ProjectInfo[]`, `selected: string | null`, `onSelect: (name: string) => void`, `onAdd: (path: string) => void`, `onRemove: (name: string) => void`

- [ ] **Step 2: Commit**

```bash
git add src/components/ProjectSidebar.tsx
git commit -m "feat(project-sidebar): project list sidebar component"
```

---

## Task 11: ProjectSkillView + AddSkillModal

**Files:**
- Create: `src/components/ProjectSkillView.tsx`
- Create: `src/components/AddSkillModal.tsx`
- Create: `src/hooks/useProjects.ts`

- [ ] **Step 1: Create `useProjects` hook**

```typescript
// src/hooks/useProjects.ts
import { useState, useCallback } from 'react';
import { fetchProjects, registerProject, unregisterProject, fetchProjectSkills, enableProjectSkill, disableProjectSkill } from '../api/client';
import type { ProjectInfo, ProjectSkillsResponse } from '../types';

export function useProjects() {
  const [projects, setProjects] = useState<ProjectInfo[]>([]);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [projectSkills, setProjectSkills] = useState<ProjectSkillsResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const loadProjects = useCallback(async () => {
    const data = await fetchProjects();
    setProjects(data.projects);
  }, []);

  const loadProjectSkills = useCallback(async (name: string) => {
    setLoading(true);
    try {
      const data = await fetchProjectSkills(name);
      setProjectSkills(data);
    } finally {
      setLoading(false);
    }
  }, []);

  const addProject = useCallback(async (projectPath: string) => {
    await registerProject(projectPath);
    await loadProjects();
  }, [loadProjects]);

  const removeProject = useCallback(async (name: string) => {
    await unregisterProject(name);
    if (selectedProject === name) {
      setSelectedProject(null);
      setProjectSkills(null);
    }
    await loadProjects();
  }, [selectedProject, loadProjects]);

  const toggleProjectSkill = useCallback(async (skillPath: string, enable: boolean) => {
    if (!selectedProject) return;
    const fn = enable ? enableProjectSkill : disableProjectSkill;
    await fn(selectedProject, skillPath);
    await loadProjectSkills(selectedProject);
  }, [selectedProject, loadProjectSkills]);

  return {
    projects, selectedProject, projectSkills, loading,
    loadProjects, loadProjectSkills, setSelectedProject,
    addProject, removeProject, toggleProjectSkill,
  };
}
```

- [ ] **Step 2: Create `ProjectSkillView`**

Component with two sections:
- Global skills (read-only cards with green "全局" badge)
- Project skills (editable cards with toggle + delete)

Props: `skills: ProjectSkillsResponse`, `projectName: string`, `onToggle: (path: string, enable: boolean) => void`, `onAddClick: () => void`

- [ ] **Step 3: Create `AddSkillModal`**

Modal that shows all custom skills (fetched via `fetchCustomSkills()`), grouped by directory. Global-enabled skills show "全局" badge. User can toggle skills to add at project level.

- [ ] **Step 4: Commit**

```bash
git add src/components/ProjectSkillView.tsx src/components/AddSkillModal.tsx src/hooks/useProjects.ts
git commit -m "feat(project-ui): project skill view, add-skill modal, and useProjects hook"
```

---

## Task 12: App.tsx Integration

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Update App.tsx to use three-tab layout**

Key changes:
- Change `tab` state from `'custom' | 'plugin'` to `'global' | 'project' | 'plugin'`
- Import and use `useProjects` hook
- Render `ProjectSidebar` + `ProjectSkillView` when `tab === 'project'`
- Rename existing `'custom'` tab to `'global'`
- Pass `onToggle`, `onBatchToggle` to project view

- [ ] **Step 2: Wire up data loading per tab**

```typescript
useEffect(() => {
  if (tab === 'global') loadCustomSkills(false);
  else if (tab === 'plugin') loadPlugins(false);
  else if (tab === 'project') loadProjects();
}, [tab]);
```

- [ ] **Step 3: Verify full flow manually**

Run: `npm run dev`
Expected: Three tabs visible, global tab works as before, project tab shows sidebar with add button, settings modal has multi-dir input.

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx
git commit -m "feat(app): integrate three-tab layout with project management"
```

---

## Task 13: Final Integration Test & Cleanup

**Files:**
- All modified files

- [ ] **Step 1: Run full test suite**

Run: `npx vitest --run`
Expected: All tests pass.

- [ ] **Step 2: Run dev server and verify all flows**

Run: `npm run dev`

Verify:
1. Settings modal: add/remove directories
2. Global tab: skills grouped by directory, enable/disable
3. Project tab: register project, see skills, enable/disable at project level
4. Plugin tab: unchanged
5. Config persists across server restart

- [ ] **Step 3: Fix any issues found during manual testing**

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: integration fixes and cleanup"
```
