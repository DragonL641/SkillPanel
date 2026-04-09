import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');
const CONFIG_FILE = path.join(PROJECT_ROOT, 'skillpanel.config.json');

export interface AppConfig {
  customSkillDir: string;
  claudeSkillsDir: string;
  claudePluginsDir: string;
  port: number;
  anthropicApiKey?: string;
}

const DEFAULT_CONFIG: AppConfig = {
  customSkillDir: path.join(os.homedir(), 'Projects', 'myskill'),
  claudeSkillsDir: path.join(os.homedir(), '.claude', 'skills'),
  claudePluginsDir: path.join(os.homedir(), '.claude', 'plugins'),
  port: 3210,
};

export function loadConfig(): AppConfig {
  if (fs.existsSync(CONFIG_FILE)) {
    const raw = fs.readFileSync(CONFIG_FILE, 'utf-8');
    return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  }
  return { ...DEFAULT_CONFIG };
}

export function saveConfig(config: Partial<AppConfig>): AppConfig {
  const current = loadConfig();
  const merged = { ...current, ...config };
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(merged, null, 2), 'utf-8');
  return merged;
}
