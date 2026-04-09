import fs from 'fs';
import path from 'path';
import { loadConfig } from '../config.js';

function resolveSkillDir(skillRelativePath: string): string {
  const config = loadConfig();
  // Sanitize: prevent path traversal
  const normalized = path.normalize(skillRelativePath).replace(/^(\.\.[/\\])+/, '');
  return path.join(config.customSkillDir, normalized);
}

function getSymlinkPath(skillDirName: string): string {
  const config = loadConfig();
  return path.join(config.claudeSkillsDir, skillDirName);
}

export function enableSkill(skillRelativePath: string): void {
  const config = loadConfig();
  const skillDir = resolveSkillDir(skillRelativePath);
  const skillBasename = path.basename(skillDir);

  // Verify the skill directory exists and contains SKILL.md
  const skillMdPath = path.join(skillDir, 'SKILL.md');
  if (!fs.existsSync(skillMdPath)) {
    throw new Error(`Not a valid skill directory: ${skillRelativePath}`);
  }

  // Ensure claude skills directory exists
  if (!fs.existsSync(config.claudeSkillsDir)) {
    fs.mkdirSync(config.claudeSkillsDir, { recursive: true });
  }

  const symlinkPath = getSymlinkPath(skillBasename);

  // If symlink already exists and points to the right target, skip
  try {
    const stat = fs.lstatSync(symlinkPath);
    if (stat.isSymbolicLink()) {
      const target = fs.readlinkSync(symlinkPath);
      const resolved = path.resolve(config.claudeSkillsDir, target);
      if (resolved === path.resolve(skillDir)) {
        return; // Already enabled
      }
      // Points elsewhere, remove it
      fs.unlinkSync(symlinkPath);
    } else {
      // Not a symlink, don't touch it for safety
      throw new Error(
        `Cannot enable skill: ${symlinkPath} exists but is not a symlink`
      );
    }
  } catch (err: any) {
    if (err.code !== 'ENOENT') throw err;
    // ENOENT is fine, symlink doesn't exist yet
  }

  fs.symlinkSync(skillDir, symlinkPath);
}

export function disableSkill(skillRelativePath: string): void {
  const skillDir = resolveSkillDir(skillRelativePath);
  const skillBasename = path.basename(skillDir);
  const symlinkPath = getSymlinkPath(skillBasename);

  try {
    const stat = fs.lstatSync(symlinkPath);
    if (!stat.isSymbolicLink()) {
      throw new Error(
        `Cannot disable skill: ${symlinkPath} is not a symlink (safety check failed)`
      );
    }
    fs.unlinkSync(symlinkPath);
  } catch (err: any) {
    if (err.code === 'ENOENT') {
      return; // Already disabled / doesn't exist
    }
    throw err;
  }
}
