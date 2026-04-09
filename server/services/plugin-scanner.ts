import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { loadConfig } from '../config.js';

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
        const skillAbsPath = path.join(installPath, skillRelPath);
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
        path: `skills/${entry}`,
      });
    }
  }
  return skills;
}

export function scanPlugins(): PluginInfo[] {
  const config = loadConfig();
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
      skills,
    });
  }

  // Sort by displayName
  plugins.sort((a, b) => a.displayName.localeCompare(b.displayName));

  return plugins;
}
