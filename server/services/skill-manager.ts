import fs from 'fs';
import path from 'path';
import type { AppConfig } from '../config.js';
import { ValidationError, NotFoundError, ConflictError } from '../errors.js';
import { getErrorMessage } from '../utils.js';

export function resolveSkillDir(config: AppConfig, skillRelativePath: string): string {
  // Try each custom skill directory
  for (const dir of config.customSkillDirs) {
    const resolved = path.resolve(dir, skillRelativePath);
    const base = path.resolve(dir);
    if (resolved.startsWith(base + path.sep) && fs.existsSync(resolved)) {
      return resolved;
    }
  }
  // Fallback to first dir for validation/error messages
  const fallbackDir = config.customSkillDirs[0] || config.customSkillDir;
  const resolved = path.resolve(fallbackDir, skillRelativePath);
  const base = path.resolve(fallbackDir);
  if (!resolved.startsWith(base + path.sep) && resolved !== base) {
    throw new ValidationError('Invalid skill path: path traversal detected');
  }
  return resolved;
}

function getSymlinkPath(skillsDir: string, skillDirName: string): string {
  return path.join(skillsDir, skillDirName);
}

export function enableSkill(config: AppConfig, skillRelativePath: string, targetSkillsDir?: string): void {
  const skillsDir = targetSkillsDir ?? config.claudeSkillsDir;
  const skillDir = resolveSkillDir(config, skillRelativePath);
  const skillBasename = path.basename(skillDir);

  // Verify the skill directory exists and contains SKILL.md
  const skillMdPath = path.join(skillDir, 'SKILL.md');
  if (!fs.existsSync(skillMdPath)) {
    throw new NotFoundError(`Not a valid skill directory: ${skillRelativePath}`);
  }

  // Ensure claude skills directory exists
  if (!fs.existsSync(skillsDir)) {
    fs.mkdirSync(skillsDir, { recursive: true });
  }

  const symlinkPath = getSymlinkPath(skillsDir, skillBasename);

  // If symlink already exists and points to the right target, skip
  try {
    const stat = fs.lstatSync(symlinkPath);
    if (stat.isSymbolicLink()) {
      const target = fs.readlinkSync(symlinkPath);
      const resolved = path.resolve(skillsDir, target);
      if (resolved === path.resolve(skillDir)) {
        return; // Already enabled
      }
      // Points elsewhere, remove it
      fs.unlinkSync(symlinkPath);
    } else {
      // Not a symlink, don't touch it for safety
      throw new ConflictError(
        `Cannot enable skill: ${symlinkPath} exists but is not a symlink`
      );
    }
  } catch (err: unknown) {
    if (!(err instanceof Error) || (err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
    // ENOENT is fine, symlink doesn't exist yet
  }

  fs.symlinkSync(skillDir, symlinkPath);
}

export function disableSkill(config: AppConfig, skillRelativePath: string, targetSkillsDir?: string): void {
  const skillsDir = targetSkillsDir ?? config.claudeSkillsDir;
  const skillDir = resolveSkillDir(config, skillRelativePath);
  const skillBasename = path.basename(skillDir);
  const symlinkPath = getSymlinkPath(skillsDir, skillBasename);

  try {
    const stat = fs.lstatSync(symlinkPath);
    if (!stat.isSymbolicLink()) {
      throw new ConflictError(
        `Cannot disable skill: ${symlinkPath} is not a symlink (safety check failed)`
      );
    }
    fs.unlinkSync(symlinkPath);
  } catch (err: unknown) {
    if ((err instanceof Error) && (err as NodeJS.ErrnoException).code === 'ENOENT') {
      return; // Already disabled / doesn't exist
    }
    throw err;
  }
}

export interface BatchToggleResult {
  ok: boolean;
  succeeded: number;
  failed: Array<{ path: string; error: string }>;
}

export function batchToggleSkills(
  config: AppConfig,
  paths: string[],
  action: 'enable' | 'disable',
  targetSkillsDir?: string,
): BatchToggleResult {
  const toggleFn = action === 'enable' ? enableSkill : disableSkill;
  const failed: Array<{ path: string; error: string }> = [];
  for (const p of paths) {
    try {
      toggleFn(config, p, targetSkillsDir);
    } catch (err: unknown) {
      failed.push({ path: p, error: getErrorMessage(err) });
    }
  }
  return { ok: true, succeeded: paths.length - failed.length, failed };
}

export function deleteSkill(config: AppConfig, skillRelativePath: string): void {
  const skillDir = resolveSkillDir(config, skillRelativePath);

  if (!fs.existsSync(skillDir)) {
    throw new NotFoundError(`Skill directory not found: ${skillRelativePath}`);
  }

  // Verify this is actually a skill directory before deleting
  const skillMdPath = path.join(skillDir, 'SKILL.md');
  if (!fs.existsSync(skillMdPath)) {
    throw new NotFoundError(`Not a valid skill directory: ${skillRelativePath}`);
  }

  // Remove symlink first (ignore errors if not linked)
  try {
    disableSkill(config, skillRelativePath);
  } catch {
    // Symlink may not exist, that's fine
  }

  fs.rmSync(skillDir, { recursive: true, force: true });
}
