# SkillPanel UI Improvements Design

Date: 2026-04-09

## Overview

Six targeted improvements to SkillPanel: simplify analysis output, rename plugin tab to plugin management, fix plugin update check bug, add skill delete functionality, show absolute paths on skill cards, and add green border for enabled skills.

## 1. Analysis Panel Simplification

**Problem**: Analysis output is too verbose (overview + steps + dependencies).

**Solution**: Modify the analyzer prompt to only output step-by-step execution flow.

**Changes**:
- `server/services/analyzer.ts`: Change prompt from 3-section format to steps-only format:
  ```
  "分析以下 Claude Code skill 的执行步骤，用中文输出，仅列出该 skill 实际的执行步骤（步骤化），不要包含概述或依赖信息。\n\nSkill 内容：\n${content}"
  ```
- Existing cached analyses remain valid (keyed by content hash, will naturally update on re-analysis)

## 2. Plugin Tab Rename & Management Enhancement

**Problem**: Tab labeled "插件 Skills" but plugins are read-only; update check fails for non-git plugins.

**Solution**: Rename to "插件管理", enhance with version/install info, fix update check.

**Changes**:
- `src/components/TabSwitch.tsx`: Change label from `'插件 Skills'` to `'插件管理'`
- `server/services/plugin-scanner.ts`: Add `lastUpdated` field to `PluginInfo` return type
- `src/components/PluginPanel.tsx`:
  - Remove "只读" label from `PluginHeader`
  - Add version and last-updated display in header
- `server/routes/plugins.ts`:
  - `check-update` route: detect if `installPath` has `.git`, return `{ isGitRepo: false }` for non-git plugins
- `src/components/PluginPanel.tsx`:
  - Only show "检查更新" button when plugin directory is a git repo
  - Display `version` and `lastUpdated` info from `PluginInfo`

**Update check bug root cause**: Most plugin install paths (e.g., `frontend-design/unknown`) are NOT git repositories. Only `superpowers` has a `.git` directory. The `git rev-parse` command fails for non-git plugins.

**Fix**: Backend returns `isGitRepo: false` for non-git plugins. Frontend hides the update check button when `isGitRepo` is false.

## 3. Custom Skill Delete

**Problem**: No way to delete custom skills from the UI.

**Solution**: Add delete button with confirmation dialog.

**Changes**:
- `src/api/client.ts`: Add `deleteSkill(skillPath: string)` function → `DELETE /api/skills/custom/delete/:skillPath`
- `src/components/SkillCard.tsx`: Add red "删除" button (only for `source="custom"`)
- `src/components/SkillCard.tsx`: On click, show `window.confirm('确定删除该 Skill？此操作不可撤销。')` dialog
- `server/routes/skills.ts`: Add `DELETE /skills/custom/delete/*skillPath` route:
  1. Call `disableSkill()` to remove symlink
  2. `fs.rmSync(resolvedDir, { recursive: true, force: true })` to delete directory
  3. Invalidate cache
  4. Return `{ ok: true }`
- Security: Use existing `resolveSkillDir()` path-traversal guard to ensure only directories within `customSkillDir` can be deleted
- `src/App.tsx` or `src/components/DirTree.tsx`: After successful delete, refresh the skill tree

## 4. Skill Card Absolute Path Display

**Problem**: Skill cards don't show where the skill is on disk.

**Solution**: Show absolute path in small gray text below description.

**Changes**:
- `server/services/skill-scanner.ts`: Add `absolutePath` field to `SkillMeta` type and populate it during scan
- `src/components/DirTree.tsx`: Update `SkillMeta` interface to include `absolutePath`
- `src/components/SkillCard.tsx`: Display `skill.absolutePath` in small gray text below description

## 5. Enabled Skill Card Green Border

**Problem**: No visual distinction for enabled vs disabled skills.

**Solution**: Add green border to enabled skill cards.

**Changes**:
- `src/components/SkillCard.tsx`: When `skill.enabled === true && source === 'custom'`:
  - Change border class from `border-gray-200` to `border-green-500`
  - Add `border-2` for emphasis

## File Change Summary

| File | Changes |
|------|---------|
| `server/services/analyzer.ts` | Simplify prompt to steps-only |
| `src/components/TabSwitch.tsx` | Rename tab label |
| `server/services/plugin-scanner.ts` | Add `lastUpdated` to PluginInfo |
| `src/components/PluginPanel.tsx` | Remove "只读", add version/date, conditional update button |
| `server/routes/plugins.ts` | Return `isGitRepo` flag in update check |
| `src/api/client.ts` | Add `deleteSkill()` function |
| `src/components/SkillCard.tsx` | Add delete button, show absolute path, green border |
| `server/routes/skills.ts` | Add DELETE route for skill deletion |
| `server/services/skill-scanner.ts` | Add `absolutePath` to SkillMeta |
| `src/components/DirTree.tsx` | Update SkillMeta interface |
| `src/App.tsx` | Wire delete callback and refresh |
