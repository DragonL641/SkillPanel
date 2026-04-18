import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import { getOrCompute, invalidateByPrefix } from './services/cache.js';
import { logger } from './services/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');
const CONFIG_FILE = path.join(PROJECT_ROOT, 'skillpanel.config.json');

export interface ProjectConfig {
  name: string;
  path: string;
}

export interface AppConfig {
  claudeRootDir: string;
  customSkillDir: string;       // kept for backward compat, derived from customSkillDirs[0]
  customSkillDirs: string[];    // NEW
  port: number;
  projects: ProjectConfig[];    // NEW
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
  customSkillDir: '',
  port: 3210,
};

let saveQueue: Promise<AppConfig> = Promise.resolve({} as AppConfig);

function buildConfig(): AppConfig {
  let raw: any = {};
  if (fs.existsSync(CONFIG_FILE)) {
    raw = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
  }
  const claudeRootDir = raw.claudeRootDir || DEFAULT_CONFIG.claudeRootDir;

  // Migrate customSkillDir -> customSkillDirs (backward compat)
  let customSkillDirs: string[];
  if (raw.customSkillDirs && Array.isArray(raw.customSkillDirs) && raw.customSkillDirs.length > 0) {
    customSkillDirs = raw.customSkillDirs;
  } else if (raw.customSkillDir) {
    customSkillDirs = [raw.customSkillDir];
  } else {
    customSkillDirs = [];
  }

  return {
    claudeRootDir,
    customSkillDir: customSkillDirs[0] || '',
    customSkillDirs,
    port: raw.port || DEFAULT_CONFIG.port,
    projects: Array.isArray(raw.projects) ? raw.projects : [],
    claudeSkillsDir: path.join(claudeRootDir, 'skills'),
    claudePluginsDir: path.join(claudeRootDir, 'plugins'),
  };
}

export function loadConfig(): AppConfig {
  return getOrCompute('config', buildConfig);
}

export function saveConfig(config: Record<string, any>): Promise<AppConfig> {
  saveQueue = saveQueue.then(async () => {
    const current = loadConfig();
    const merged = {
      claudeRootDir: config.claudeRootDir ?? current.claudeRootDir,
      customSkillDir: config.customSkillDir ?? current.customSkillDir,
      customSkillDirs: config.customSkillDirs ?? current.customSkillDirs,
      port: config.port ?? current.port,
      projects: config.projects ?? current.projects,
    };
    // Only persist user-configurable fields, not derived ones
    // Write to temp file then rename for atomic replacement
    const tmpFile = CONFIG_FILE + '.tmp';
    await fs.promises.writeFile(tmpFile, JSON.stringify(merged, null, 2), 'utf-8');
    await fs.promises.rename(tmpFile, CONFIG_FILE);
    invalidateByPrefix('config');
    return buildConfig();
  });
  return saveQueue;
}

export interface ConfigResponse {
  claudeRootDir: string;
  customSkillDir: string;
  customSkillDirs: string[];
  port: number;
  projects: ProjectConfig[];
  apiConfigDetected: boolean;
  apiModel: string | null;
}

export function buildConfigResponse(config: AppConfig): ConfigResponse {
  const apiConfig = loadClaudeApiConfig();
  return {
    claudeRootDir: config.claudeRootDir,
    customSkillDir: config.customSkillDir,
    customSkillDirs: config.customSkillDirs,
    port: config.port,
    projects: config.projects,
    apiConfigDetected: !!apiConfig,
    apiModel: apiConfig?.model || null,
  };
}

export function loadClaudeApiConfig(): ClaudeApiConfig | null {
  const config = loadConfig();
  const settingsPath = path.join(config.claudeRootDir, 'settings.json');

  try {
    const raw = fs.readFileSync(settingsPath, 'utf-8');
    const settings = JSON.parse(raw);
    const env = settings.env || {};
    const apiKey = env.ANTHROPIC_AUTH_TOKEN || env.ANTHROPIC_API_KEY;
    if (!apiKey) return null;
    return {
      apiKey,
      baseURL: env.ANTHROPIC_BASE_URL || undefined,
      model: env.ANTHROPIC_DEFAULT_SONNET_MODEL || 'claude-sonnet-4-6',
    };
  } catch (err) {
    if (err instanceof Error && 'code' in err && (err as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }
    logger.warn('failed to load Claude API config', { error: String(err) });
    return null;
  }
}
