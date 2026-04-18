import fs from 'fs';
import path from 'path';
import type { AppConfig, ProjectConfig } from '../config.js';
import type { TreeNode } from './skill-scanner.js';

export interface ProjectSkillInfo {
  name: string;
  description: string;
  path: string;           // relative path like "superpowers/brainstorming"
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

/** List symlink targets in a directory */
function listSymlinkTargets(dir: string): string[] {
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

/** Check if a skill is enabled in a skillsDir */
function isSkillInDir(skillsDir: string, skillAbsoluteDir: string): boolean {
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

/** Build project info with stats */
export function buildProjectInfo(
  config: AppConfig,
  project: ProjectConfig,
  allSkillAbsolutePaths: string[],
): ProjectInfo {
  const skillsDir = getProjectSkillsDir(project);

  let projectEnabledCount = 0;
  let globalEnabledCount = 0;
  for (const absPath of allSkillAbsolutePaths) {
    if (isSkillInDir(config.claudeSkillsDir, absPath)) globalEnabledCount++;
    if (isSkillInDir(skillsDir, absPath)) projectEnabledCount++;
  }

  return {
    name: project.name,
    path: project.path,
    skillsDir,
    globalEnabledCount,
    projectEnabledCount,
  };
}

/** Flatten skill tree to get all skills with their absolute paths */
export function flattenSkillTree(nodes: TreeNode[]): Array<{ name: string; description: string; relativePath: string; absolutePath: string }> {
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
      result.push(...flattenSkillTree(node.children));
    }
  }
  return result;
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
    const globallyEnabled = isSkillInDir(config.claudeSkillsDir, skill.absolutePath);
    const projectEnabled = isSkillInDir(projectSkillsDir, skill.absolutePath);

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
    }
  }

  return { globalSkills, projectSkills };
}
