import { execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import type { AppConfig } from '../config.js';

const execFileAsync = promisify(execFile);

export interface PluginSkill {
  name: string;
  description: string;
  path: string;
}

export interface PluginInfo {
  name: string;
  displayName: string;
  installPath: string;
  version: string;
  lastUpdated: string;
  skills: PluginSkill[];
}

interface InstalledPluginEntry {
  scope: string;
  installPath: string;
  version: string;
  installedAt: string;
  lastUpdated: string;
  gitCommitSha?: string;
}

interface MarketplacePluginEntry {
  name: string;
  description?: string;
  source?: string;
  skills?: string[];
}

function parseSkillMd(skillMdPath: string): { name: string; description: string } {
  const content = fs.readFileSync(skillMdPath, 'utf-8');
  let parsedData: Record<string, any> = {};
  try {
    parsedData = matter(content).data || {};
  } catch {
    // YAML parse error, fall back
    parsedData = {};
  }
  return {
    name: parsedData.name || path.basename(path.dirname(skillMdPath)),
    description: parsedData.description || '',
  };
}

function getSkillsFromMarketplace(
  installPath: string,
): PluginSkill[] {
  const marketplacePath = path.join(installPath, '.claude-plugin', 'marketplace.json');
  if (!fs.existsSync(marketplacePath)) return [];

  try {
    const raw = fs.readFileSync(marketplacePath, 'utf-8');
    const marketplace = JSON.parse(raw);
    const plugins: MarketplacePluginEntry[] = marketplace.plugins || [];

    // Collect skills from ALL plugin entries in marketplace.json
    const skills: PluginSkill[] = [];
    for (const pluginEntry of plugins) {
      if (!pluginEntry.skills) continue;
      for (const skillRelPath of pluginEntry.skills) {
        const skillAbsPath = path.resolve(installPath, skillRelPath);
        const resolvedInstall = path.resolve(installPath);
        if (!skillAbsPath.startsWith(resolvedInstall + path.sep)) continue;
        const skillMdPath = path.join(skillAbsPath, 'SKILL.md');
        if (fs.existsSync(skillMdPath)) {
          const parsed = parseSkillMd(skillMdPath);
          skills.push({
            name: parsed.name,
            description: parsed.description,
            path: skillAbsPath,
          });
        }
      }
    }
    return skills;
  } catch {
    return [];
  }
}

function scanSkillsDirectory(installPath: string): PluginSkill[] {
  const skillsDir = path.join(installPath, 'skills');
  if (!fs.existsSync(skillsDir) || !fs.statSync(skillsDir).isDirectory()) return [];

  const skills: PluginSkill[] = [];
  const entries = fs.readdirSync(skillsDir).sort();

  for (const entry of entries) {
    if (entry.startsWith('.') || entry === 'node_modules') continue;
    const skillDir = path.join(skillsDir, entry);
    if (!fs.statSync(skillDir).isDirectory()) continue;

    const skillMdPath = path.join(skillDir, 'SKILL.md');
    if (fs.existsSync(skillMdPath)) {
      const parsed = parseSkillMd(skillMdPath);
      skills.push({
        name: parsed.name,
        description: parsed.description,
        path: path.resolve(skillsDir, entry),
      });
    }
  }
  return skills;
}

export function scanPlugins(config: AppConfig): PluginInfo[] {
  const pluginsFile = path.join(config.claudePluginsDir, 'installed_plugins.json');
  if (!fs.existsSync(pluginsFile)) return [];

  let installed: Record<string, InstalledPluginEntry[]>;
  try {
    const raw = fs.readFileSync(pluginsFile, 'utf-8');
    installed = JSON.parse(raw).plugins || {};
  } catch {
    return [];
  }

  const plugins: PluginInfo[] = [];

  for (const [key, entries] of Object.entries(installed)) {
    // key format: "pluginName@marketName"
    const pluginName = key.split('@')[0];
    // Use the first (most recent) entry
    const entry = entries[0];
    if (!entry) continue;

    const installPath = entry.installPath;
    if (!fs.existsSync(installPath)) continue;

    // Read displayName from plugin.json
    let displayName = pluginName;
    const pluginJsonPath = path.join(installPath, '.claude-plugin', 'plugin.json');
    if (fs.existsSync(pluginJsonPath)) {
      try {
        const pluginJson = JSON.parse(fs.readFileSync(pluginJsonPath, 'utf-8'));
        if (pluginJson.name) displayName = pluginJson.name;
      } catch {
        // fall back to key-derived name
      }
    }

    // Try marketplace.json first, then fall back to scanning skills/ directory
    let skills = getSkillsFromMarketplace(installPath);
    if (skills.length === 0) {
      skills = scanSkillsDirectory(installPath);
    }

    // Skip plugins with 0 skills (like LSP plugins)
    if (skills.length === 0) continue;

    plugins.push({
      name: pluginName,
      displayName,
      installPath,
      version: entry.version,
      lastUpdated: entry.lastUpdated,
      skills,
    });
  }

  // Sort by displayName
  plugins.sort((a, b) => a.displayName.localeCompare(b.displayName));

  return plugins;
}

export interface CheckUpdateResult {
  hasUpdate: boolean;
  error?: string;
  isGitRepo: boolean;
  behindBy?: number;
  currentCommit?: string;
}

/**
 * Resolve installPath for a plugin by name from installed_plugins.json.
 */
export function resolvePluginInstallPath(config: AppConfig, pluginName: string): string | null {
  const pluginsFile = path.join(config.claudePluginsDir, 'installed_plugins.json');
  if (!fs.existsSync(pluginsFile)) return null;

  try {
    const raw = fs.readFileSync(pluginsFile, 'utf-8');
    const installed = JSON.parse(raw).plugins || {};

    for (const [key, entries] of Object.entries(installed)) {
      const name = key.split('@')[0];
      if (name === pluginName && (entries as any[])[0]) {
        return (entries as any[])[0].installPath;
      }
    }
  } catch {
    // parse error
  }
  return null;
}

/**
 * Check if a git-based plugin has updates available on origin, by plugin name.
 */
export async function checkPluginUpdateByName(config: AppConfig, pluginName: string): Promise<CheckUpdateResult> {
  const installPath = resolvePluginInstallPath(config, pluginName);
  if (!installPath) {
    return { hasUpdate: false, error: 'Plugin not found', isGitRepo: false };
  }
  return checkPluginUpdate(installPath);
}

/**
 * Check if a git-based plugin has updates available on origin.
 */
export async function checkPluginUpdate(installPath: string): Promise<CheckUpdateResult> {
  if (!fs.existsSync(installPath)) {
    return { hasUpdate: false, error: 'Plugin not found', isGitRepo: false };
  }

  const gitDir = path.join(installPath, '.git');
  if (!fs.existsSync(gitDir)) {
    return { hasUpdate: false, isGitRepo: false };
  }

  // Get current commit
  let currentCommit = '';
  try {
    currentCommit = (await execFileAsync('git', ['rev-parse', '--short', 'HEAD'], {
      cwd: installPath,
      encoding: 'utf-8',
      timeout: 5000,
    })).stdout.trim();
  } catch {
    return { hasUpdate: false, error: 'Not a git repository', isGitRepo: false };
  }

  // Fetch from origin
  try {
    await execFileAsync('git', ['fetch', 'origin'], {
      cwd: installPath,
      encoding: 'utf-8',
      timeout: 30000,
    });
  } catch {
    return { hasUpdate: false, error: 'Network error', currentCommit, isGitRepo: true };
  }

  // Check commits behind (try main first, then master)
  let behindBy = 0;
  try {
    const count = (await execFileAsync('git', ['rev-list', '--count', 'HEAD..origin/main'], {
      cwd: installPath,
      encoding: 'utf-8',
      timeout: 5000,
    })).stdout.trim();
    behindBy = parseInt(count, 10) || 0;
  } catch {
    try {
      const count = (await execFileAsync('git', ['rev-list', '--count', 'HEAD..origin/master'], {
        cwd: installPath,
        encoding: 'utf-8',
        timeout: 5000,
      })).stdout.trim();
      behindBy = parseInt(count, 10) || 0;
    } catch {
      // Can't determine, report no update found
    }
  }

  return { hasUpdate: behindBy > 0, behindBy, currentCommit, isGitRepo: true };
}
