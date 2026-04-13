import fs from 'fs';
import path from 'path';
import { computeContentHash } from './hash-utils.js';
import { scanPlugins } from './plugin-scanner.js';
import matter from 'gray-matter';
import type { AppConfig } from '../config.js';

export interface SkillMeta {
  name: string;
  description: string;
  enabled: boolean;
  hash: string;
  hasAnalysis: boolean;
  absolutePath: string;
}

export interface TreeNode {
  type: 'dir' | 'skill';
  name: string;
  path: string; // relative to customSkillDir
  children?: TreeNode[];
  skill?: SkillMeta;
}

function isEnabled(config: AppConfig, skillDir: string, skillName: string): boolean {
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

function scanDirectory(config: AppConfig, dirPath: string, basePath: string): TreeNode[] {
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
          enabled: isEnabled(config, fullPath, entry),
          hash: computeContentHash(fullPath).slice(0, 12),
          hasAnalysis: false,
          absolutePath: fullPath,
        },
      });
    } else {
      // This is a container directory, recurse
      const children = scanDirectory(config, fullPath, basePath);
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

let cachedCustomTree: TreeNode[] | null = null;

export function scanCustomSkills(config: AppConfig): TreeNode[] {
  if (!fs.existsSync(config.customSkillDir)) {
    cachedCustomTree = [];
    return [];
  }
  cachedCustomTree = scanDirectory(config, config.customSkillDir, config.customSkillDir);
  return cachedCustomTree;
}

/**
 * Find the skill directory by source and name.
 * - "custom": recursively search in customSkillDir for a directory matching the name that contains SKILL.md
 * - "plugin": use scanPlugins() to find the skill path
 */
export interface SkillsSummary {
  customTotal: number;
  customEnabled: number;
  pluginTotal: number;
  grandTotal: number;
}

function countSkillsInTree(nodes: TreeNode[]): { total: number; enabled: number } {
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

export function getSkillsSummary(
  config: AppConfig,
  customTree: TreeNode[],
  plugins: import('./plugin-scanner.js').PluginInfo[],
): SkillsSummary {
  const custom = countSkillsInTree(customTree);
  const pluginTotal = plugins.reduce((sum, p) => sum + p.skills.length, 0);
  return {
    customTotal: custom.total,
    customEnabled: custom.enabled,
    pluginTotal,
    grandTotal: custom.total + pluginTotal,
  };
}

function findSkillInTree(nodes: TreeNode[], name: string): string | null {
  for (const node of nodes) {
    if (node.type === 'skill') {
      if (path.basename(node.path) === name || node.skill?.name === name) {
        return node.skill?.absolutePath ?? null;
      }
    }
    if (node.children) {
      const found = findSkillInTree(node.children, name);
      if (found) return found;
    }
  }
  return null;
}

export function findSkillDir(config: AppConfig, source: string, name: string): string | null {
  if (source === 'custom') {
    const tree = cachedCustomTree ?? scanCustomSkills(config);
    return findSkillInTree(tree, name);
  }

  if (source === 'plugin') {
    const plugins = scanPlugins(config);
    for (const plugin of plugins) {
      for (const skill of plugin.skills) {
        if (skill.name === name) {
          if (fs.existsSync(skill.path)) {
            return skill.path;
          }
        }
      }
    }
    return null;
  }

  return null;
}
