import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');
const CONFIG_FILE = path.join(PROJECT_ROOT, 'skillpanel.config.json');

export interface AppConfig {
  claudeRootDir: string;
  customSkillDir: string;
  port: number;
  // Auto-derived from claudeRootDir
  claudeSkillsDir: string;
  claudePluginsDir: string;
}

export interface ClaudeApiConfig {
  apiKey: string;
  baseURL?: string;
  model: string;
}

const DEFAULT_CONFIG = {
  claudeRootDir: path.join(os.homedir(), '.claude'),
  customSkillDir: path.join(os.homedir(), 'Projects', 'myskill'),
  port: 3210,
};

let cachedConfig: AppConfig | null = null;
let saveQueue: Promise<AppConfig> = Promise.resolve({} as AppConfig);

export function loadConfig(): AppConfig {
  if (cachedConfig) return cachedConfig;
  let raw: any = {};
  if (fs.existsSync(CONFIG_FILE)) {
    raw = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
  }
  const claudeRootDir = raw.claudeRootDir || DEFAULT_CONFIG.claudeRootDir;
  cachedConfig = {
    claudeRootDir,
    customSkillDir: raw.customSkillDir || DEFAULT_CONFIG.customSkillDir,
    port: raw.port || DEFAULT_CONFIG.port,
    claudeSkillsDir: path.join(claudeRootDir, 'skills'),
    claudePluginsDir: path.join(claudeRootDir, 'plugins'),
  };
  return cachedConfig;
}

export function saveConfig(config: Record<string, any>): Promise<AppConfig> {
  saveQueue = saveQueue.then(() => {
    const current = loadConfig();
    const merged = {
      claudeRootDir: config.claudeRootDir ?? current.claudeRootDir,
      customSkillDir: config.customSkillDir ?? current.customSkillDir,
      port: config.port ?? current.port,
    };
    // Only persist user-configurable fields, not derived ones
    // Write to temp file then rename for atomic replacement
    const tmpFile = CONFIG_FILE + '.tmp';
    fs.writeFileSync(tmpFile, JSON.stringify(merged, null, 2), 'utf-8');
    fs.renameSync(tmpFile, CONFIG_FILE);
    cachedConfig = null;
    return loadConfig();
  });
  return saveQueue;
}

export function invalidateConfig(): void {
  cachedConfig = null;
}

export function loadClaudeApiConfig(): ClaudeApiConfig | null {
  const config = loadConfig();
  const settingsPath = path.join(config.claudeRootDir, 'settings.json');
  if (!fs.existsSync(settingsPath)) return null;

  try {
    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
    const env = settings.env || {};
    const apiKey = env.ANTHROPIC_AUTH_TOKEN || env.ANTHROPIC_API_KEY;
    if (!apiKey) return null;
    return {
      apiKey,
      baseURL: env.ANTHROPIC_BASE_URL || undefined,
      model: env.ANTHROPIC_DEFAULT_SONNET_MODEL || 'claude-sonnet-4-6',
    };
  } catch (err) {
    // Distinguish "file not found" (normal, no warning) from "file exists but parse failed" (warn)
    if (err instanceof Error && 'code' in err && (err as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }
    console.warn('[Config] Failed to load Claude API config:', err);
    return null;
  }
}
