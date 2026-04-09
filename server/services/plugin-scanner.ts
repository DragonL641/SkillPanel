import fs from 'fs';
import path from 'path';
import { loadConfig } from '../config.js';

export interface PluginSkill {
  name: string;
  description: string;
  pluginName: string;
}

export interface PluginInfo {
  name: string;
  path: string;
  skills: PluginSkill[];
}

export function scanPlugins(): PluginInfo[] {
  const config = loadConfig();
  if (!fs.existsSync(config.claudePluginsDir)) {
    return [];
  }

  const plugins: PluginInfo[] = [];
  const entries = fs.readdirSync(config.claudePluginsDir).sort();

  for (const entry of entries) {
    if (entry.startsWith('.') || entry === 'node_modules') continue;

    const fullPath = path.join(config.claudePluginsDir, entry);
    const stat = fs.statSync(fullPath);
    if (!stat.isDirectory()) continue;

    const skills = scanPluginSkills(fullPath, entry);
    plugins.push({
      name: entry,
      path: fullPath,
      skills,
    });
  }

  return plugins;
}

function scanPluginSkills(pluginDir: string, pluginName: string): PluginSkill[] {
  const skills: PluginSkill[] = [];
  const skillsDir = path.join(pluginDir, 'skills');

  if (!fs.existsSync(skillsDir) || !fs.statSync(skillsDir).isDirectory()) {
    return skills;
  }

  const entries = fs.readdirSync(skillsDir).sort();
  for (const entry of entries) {
    if (entry.startsWith('.')) continue;

    const skillDir = path.join(skillsDir, entry);
    if (!fs.statSync(skillDir).isDirectory()) continue;

    const skillMdPath = path.join(skillDir, 'SKILL.md');
    let name = entry;
    let description = '';

    if (fs.existsSync(skillMdPath)) {
      try {
        const content = fs.readFileSync(skillMdPath, 'utf-8');
        const yamlMatch = content.match(/^---\n([\s\S]*?)\n---/);
        if (yamlMatch) {
          const nameMatch = yamlMatch[1].match(/^name:\s*(.+)$/m);
          const descMatch = yamlMatch[1].match(/^description:\s*(.+)$/m);
          if (nameMatch) name = nameMatch[1].trim();
          if (descMatch) description = descMatch[1].trim();
        }
      } catch {
        // Fall back to directory name
      }
    }

    skills.push({
      name,
      description,
      pluginName,
    });
  }

  return skills;
}
