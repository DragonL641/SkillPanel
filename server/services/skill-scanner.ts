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
  path: string; // relative to customSkillDir
  children?: TreeNode[];
  skill?: SkillMeta;
}

function computeHash(skillDir: string): string {
  const hash = crypto.createHash('md5');

  // Hash SKILL.md content
  const skillMdPath = path.join(skillDir, 'SKILL.md');
  if (fs.existsSync(skillMdPath)) {
    hash.update(fs.readFileSync(skillMdPath));
  }

  // Hash all files in scripts/ directory recursively
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

  return hash.digest('hex').slice(0, 12);
}

function isEnabled(skillDir: string, skillName: string): boolean {
  const config = loadConfig();
  const symlinkPath = path.join(config.claudeSkillsDir, skillName);
  try {
    const stat = fs.lstatSync(symlinkPath);
    if (stat.isSymbolicLink()) {
      const target = fs.readlinkSync(symlinkPath);
      const resolved = path.resolve(config.claudeSkillsDir, target);
      return resolved === path.resolve(skillDir);
    }
  } catch {
    // symlink doesn't exist or can't be read
  }
  return false;
}

function scanDirectory(dirPath: string, basePath: string): TreeNode[] {
  const entries = fs.readdirSync(dirPath);
  const dirs: TreeNode[] = [];
  const skills: TreeNode[] = [];

  for (const entry of entries) {
    // Skip hidden dirs and node_modules
    if (entry.startsWith('.') || entry === 'node_modules') continue;

    const fullPath = path.join(dirPath, entry);
    const stat = fs.statSync(fullPath);
    if (!stat.isDirectory()) continue;

    const relativePath = path.relative(basePath, fullPath);
    const skillMdPath = path.join(fullPath, 'SKILL.md');

    if (fs.existsSync(skillMdPath)) {
      // This is a skill node
      const content = fs.readFileSync(skillMdPath, 'utf-8');
      let parsedData: Record<string, any> = {};
      try {
        parsedData = matter(content).data || {};
      } catch {
        // YAML parse error (e.g. unquoted colons in description), fall back
        parsedData = {};
      }
      const skillName = parsedData.name || entry;

      skills.push({
        type: 'skill',
        name: skillName,
        path: relativePath,
        skill: {
          name: skillName,
          description: parsedData.description || '',
          enabled: isEnabled(fullPath, entry),
          hash: computeHash(fullPath),
          hasAnalysis: false,
        },
      });
    } else {
      // This is a container directory, recurse
      const children = scanDirectory(fullPath, basePath);
      if (children.length > 0) {
        dirs.push({
          type: 'dir',
          name: entry,
          path: relativePath,
          children,
        });
      }
    }
  }

  // Sort: dirs first, then skills, both alphabetical by name
  dirs.sort((a, b) => a.name.localeCompare(b.name));
  skills.sort((a, b) => a.name.localeCompare(b.name));

  return [...dirs, ...skills];
}

export function scanCustomSkills(): TreeNode[] {
  const config = loadConfig();
  if (!fs.existsSync(config.customSkillDir)) {
    return [];
  }
  return scanDirectory(config.customSkillDir, config.customSkillDir);
}
