# Project-Level Skill Configuration Design

**Date:** 2026-04-17
**Status:** Draft

## Background

SkillPanel currently manages skill enable/disable at the global level only — symlinks in `~/.claude/skills/`. Claude Code also supports per-project skill directories at `<project>/.claude/skills/`. This design adds project-level skill management and multi-directory support for global skills.

## Requirements

1. **Multiple custom skill directories**: Users can add multiple directories containing skills (via FilePicker in settings), replacing the current single `customSkillDir`
2. **Global skill management**: Enable/disable skills that apply to all projects (symlinks in `~/.claude/skills/`)
3. **Project-level skill management**: Register Git projects, manage per-project skills (symlinks in `<project>/.claude/skills/`)
4. **Coexistence**: Global and project-level skills are independent. Project view shows both, global skills are read-only in project context

## UI Design

Design files: `design.pen` — frames "全局 Skill 管理", "项目级 Skill 管理", updated "Config Modal"

### Tab Structure (3 tabs)

| Tab | Name | Purpose |
|-----|------|---------|
| 1 | 全局 Skill 管理 | Browse all custom skills grouped by directory, enable/disable globally |
| 2 | 项目级 Skill 管理 | Register projects, manage per-project skill configuration |
| 3 | 插件技能管理 | View plugin skills (existing, read-only) |

### Tab 1: Global Skill Management

- Skills displayed grouped by their source directory (e.g. "superpowers", "document-skills")
- Each directory section has: folder icon + name + skill count + batch enable/disable
- Skill cards show: name, description, toggle switch, analysis button, delete button
- Enabling a skill creates symlink in `~/.claude/skills/<skillName>`
- Disabling removes the symlink

### Tab 2: Project-Level Skill Management

**Left sidebar (260px):**
- Project list with add button
- Each project card: folder icon, name, path, skill count ("N project-level + M global")
- Selected project highlighted with accent color
- Delete button per project (unregister only, does not delete `.claude/skills/` contents)

**Right content area:**
- Header: project name badge + "已生效技能" title + count + "添加技能" button
- Two sections:

**Section 1 — Global Skills (read-only):**
- Globe icon + "全局技能（只读）" header
- Green-bordered cards with "全局" badge
- No toggle or action buttons (display only)

**Section 2 — Project Skills (editable):**
- Folder icon + "项目级技能" header
- Accent-bordered cards with toggle switch and delete button
- Enabling creates symlink in `<project>/.claude/skills/<skillName>`
- Disabling removes the symlink

**Add Skill Modal:**
- Triggered by "添加技能" button
- Shows all custom skills from all directories (same layout as global management)
- Global-enabled skills marked with "全局" badge
- User can select skills to add at project level

### Settings Modal (Config)

Updated to support multiple directories:
- **Claude Code directory**: single path (unchanged)
- **Custom skill directories**: list of paths, each with folder icon + path + delete button, plus "添加目录" button (FilePicker)
- **Port**: unchanged
- **API status**: unchanged

## Data Model

### Config Changes

`skillpanel.config.json`:

```json
{
  "claudeRootDir": "~/.claude",
  "customSkillDirs": [
    "~/Projects/superpowers-skills",
    "~/Projects/document-skills"
  ],
  "port": 3210,
  "projects": [
    {
      "name": "SkillPanel",
      "path": "/Users/user/Projects/SkillPanel"
    }
  ]
}
```

Key changes from current:
- `customSkillDir` (string) → `customSkillDirs` (string array)
- New `projects` array with `name` and `path` fields
- `skillsDir` for each project is derived as `path + "/.claude/skills"` (not stored)

### Backward Compatibility

On load, if `customSkillDir` exists and `customSkillDirs` does not, migrate automatically: `customSkillDirs = [customSkillDir]`.

## API Design

### Config

| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/config` | Current config (including projects list) |
| PUT | `/api/config` | Update config (customSkillDirs, projects) |

### Global Skills (existing, updated for multi-dir)

| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/skills/custom` | All skills grouped by directory |
| POST | `/api/skills/custom/enable/*skillPath` | Enable globally |
| POST | `/api/skills/custom/disable/*skillPath` | Disable globally |
| POST | `/api/skills/custom/batch-enable` | Batch enable |
| POST | `/api/skills/custom/batch-disable` | Batch disable |

### Projects

| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/projects` | List registered projects with stats |
| POST | `/api/projects` | Register project (body: `{ path }`) |
| DELETE | `/api/projects/:projectName` | Unregister project |
| GET | `/api/projects/:projectName/skills` | Project's effective skills (global + project-level) |
| POST | `/api/projects/:projectName/skills/enable/*skillPath` | Enable for project |
| POST | `/api/projects/:projectName/skills/disable/*skillPath` | Disable for project |
| POST | `/api/projects/:projectName/skills/batch-enable` | Batch enable for project |
| POST | `/api/projects/:projectName/skills/batch-disable` | Batch disable for project |

### Response Shapes

**GET /api/projects response:**
```json
{
  "projects": [
    {
      "name": "SkillPanel",
      "path": "/Users/user/Projects/SkillPanel",
      "skillsDir": "/Users/user/Projects/SkillPanel/.claude/skills",
      "globalEnabledCount": 5,
      "projectEnabledCount": 3,
      "totalCustomSkills": 24
    }
  ]
}
```

**GET /api/projects/:name/skills response:**
```json
{
  "globalSkills": [
    { "name": "brainstorming", "description": "...", "path": "superpowers/brainstorming", "enabled": true, "source": "global" }
  ],
  "projectSkills": [
    { "name": "pdf", "description": "...", "path": "document-skills/pdf", "enabled": true, "source": "project" }
  ],
  "availableToAdd": ["document-skills/mcp-builder", "superpowers/writing-plans"]
}
```

## Backend Architecture

### Config Module (`config.ts`)

- `AppConfig.customSkillDirs: string[]` replaces `customSkillDir: string`
- `AppConfig.projects: ProjectConfig[]` — registered projects
- Backward migration: `customSkillDir` → `customSkillDirs` on first load

### Skill Scanner (`skill-scanner.ts`)

- `scanCustomSkills` iterates over `customSkillDirs`, returns tree grouped by directory
- New `scanProjectSkills(config, project)` — scans project's `.claude/skills/` to find project-level enabled skills
- `isEnabled` checks symlinks in either global or project skillsDir

### Skill Manager (`skill-manager.ts`)

- Refactor `enableSkill` / `disableSkill` to accept a `targetSkillsDir` parameter
- Global calls pass `config.claudeSkillsDir`
- Project calls pass `project.skillsDir`
- Core symlink logic unchanged, just parameterized

### New Routes (`routes/projects.ts`)

- Project CRUD operations
- Project skill enable/disable delegating to skill-manager with project-specific skillsDir
- Auto-create `<project>/.claude/skills/` directory on first enable if needed

## Frontend Architecture

### Tab Structure

Rename existing tabs and add new one:
- Tab 1: "全局 Skill 管理" — existing `CustomSkillsView` updated for multi-directory
- Tab 2: "项目级 Skill 管理" — new `ProjectSkillsView`
- Tab 3: "插件技能管理" — existing, renamed

### New Components

**`ProjectSidebar.tsx`**
- Project list with add/remove
- Selected state management
- Displays skill counts per project

**`ProjectSkillView.tsx`**
- Two-section layout: global (read-only) + project (editable)
- "添加技能" button triggers modal

**`AddSkillModal.tsx`**
- Modal showing all custom skills (grouped by directory)
- Global-enabled skills marked with badge
- Checkbox/toggle to select skills to add

**Updated `ConfigModal.tsx`**
- Multiple directory inputs with add/remove
- FilePicker integration for directory selection

### State Management

- `App.tsx` manages active tab, selected project
- Fetches project list on mount
- Cache invalidation on skill toggle operations

## Error Handling

- Project path must exist and be a directory (validated on registration)
- Skill directory must contain `SKILL.md` (existing validation, reused)
- Project name derived from directory basename, conflicts rejected with suggestion
- If `<project>/.claude/skills/` creation fails (permissions), return clear error
- If project is unregistered but `.claude/skills/` contents exist, they are left intact

## Out of Scope

- Plugin skills at project level (plugins are global-only)
- Nested project discovery (user must explicitly register each project)
- Skill versioning or dependency management
- Bulk project operations
