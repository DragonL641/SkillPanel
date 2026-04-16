import fs from 'fs';
import path from 'path';
import Anthropic from '@anthropic-ai/sdk';
import { loadClaudeApiConfig } from '../config.js';
import type { AppConfig } from '../config.js';
import { AnalysisError } from '../errors.js';
import { computeContentHash, collectSkillContent } from './hash-utils.js';
import { scanCustomSkills, type TreeNode } from './skill-scanner.js';
import { scanPlugins } from './plugin-scanner.js';
import { logger } from './logger.js';

export interface SkillAnalysis {
  name: string;
  hash: string;
  summary: string;
  analyzedAt: string;
  model: string;
}

function getCacheFilePath(config: AppConfig): string {
  const cacheDir = path.join(path.dirname(config.customSkillDir), '.skillpanel');
  return path.join(cacheDir, 'analysis-cache.json');
}

function loadCache(config: AppConfig): Record<string, SkillAnalysis> {
  const cacheFile = getCacheFilePath(config);
  try {
    if (fs.existsSync(cacheFile)) {
      const raw = fs.readFileSync(cacheFile, 'utf-8');
      return JSON.parse(raw);
    }
  } catch {
    // cache file corrupt, start fresh
  }
  return {};
}

const MAX_CACHE_ENTRIES = 500;
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function saveCache(config: AppConfig, cache: Record<string, SkillAnalysis>): void {
  // Evict expired entries (TTL)
  const now = Date.now();
  for (const [k, v] of Object.entries(cache)) {
    if (now - new Date(v.analyzedAt).getTime() > CACHE_TTL_MS) {
      delete cache[k];
    }
  }

  // Evict oldest entries when cache exceeds the limit
  const keys = Object.keys(cache);
  if (keys.length > MAX_CACHE_ENTRIES) {
    const sorted = keys.sort(
      (a, b) => cache[a].analyzedAt.localeCompare(cache[b].analyzedAt),
    );
    const toRemove = sorted.length - MAX_CACHE_ENTRIES;
    for (let i = 0; i < toRemove; i++) {
      delete cache[sorted[i]];
    }
  }

  const cacheFile = getCacheFilePath(config);
  const cacheDir = path.dirname(cacheFile);
  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
  }
  fs.writeFileSync(cacheFile, JSON.stringify(cache, null, 2), 'utf-8');
}

export function getCachedAnalysis(config: AppConfig, key: string): SkillAnalysis | null {
  const cache = loadCache(config);
  const entry = cache[key];
  if (!entry) return null;
  // Treat expired entries as cache misses
  if (Date.now() - new Date(entry.analyzedAt).getTime() > CACHE_TTL_MS) return null;
  return entry;
}

export async function analyzeSkill(config: AppConfig, skillDir: string, key: string, force = false, signal?: AbortSignal): Promise<SkillAnalysis> {
  const hash = computeContentHash(skillDir);
  const name = path.basename(skillDir);

  // Check cache first (skip when force=true)
  if (!force) {
    const cached = getCachedAnalysis(config, key);
    if (cached && cached.hash === hash) {
      return cached;
    }
  }

  // Cache miss or hash changed — call Claude API
  const apiConfig = loadClaudeApiConfig();
  if (!apiConfig) {
    throw new AnalysisError('未检测到 Claude Code API 配置，请确认 ~/.claude/settings.json 中包含 ANTHROPIC_AUTH_TOKEN');
  }

  const content = collectSkillContent(skillDir);
  const prompt = `分析以下 Claude Code skill 的执行步骤，用中文输出，仅列出该 skill 实际的执行步骤（步骤化），不要包含概述或依赖信息。

Skill 内容：
${content}`;

  const client = new Anthropic({ apiKey: apiConfig.apiKey, baseURL: apiConfig.baseURL });
  const response = await client.messages.create({
    model: apiConfig.model,
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  }, { signal });

  const textBlock = response.content.find((block) => block.type === 'text');
  const summary = textBlock && textBlock.type === 'text' ? textBlock.text : '';

  const analysis: SkillAnalysis = {
    name,
    hash,
    summary,
    analyzedAt: new Date().toISOString(),
    model: apiConfig.model,
  };

  // Save to cache
  const cache = loadCache(config);
  cache[key] = analysis;
  saveCache(config, cache);

  return analysis;
}

/**
 * Auto-analyze all skills on startup.
 * Iterates custom + plugin skills, skips those with matching cache hashes.
 * Runs sequentially to avoid overwhelming the API.
 */
export async function analyzeAllSkills(config: AppConfig, signal?: AbortSignal): Promise<void> {
  const collectFromTree = (nodes: TreeNode[]): Array<{ dir: string; key: string }> => {
    const result: Array<{ dir: string; key: string }> = [];
    for (const node of nodes) {
      if (node.type === 'skill' && node.skill) {
        result.push({
          dir: node.skill.absolutePath,
          key: `custom/${node.skill.name}`,
        });
      }
      if (node.children) result.push(...collectFromTree(node.children));
    }
    return result;
  };

  const allSkills = collectFromTree(scanCustomSkills(config));
  for (const plugin of scanPlugins(config)) {
    for (const skill of plugin.skills) {
      allSkills.push({ dir: skill.path, key: `plugin/${skill.name}` });
    }
  }

  if (allSkills.length === 0) return;

  logger.info('auto-analysis started', { count: allSkills.length });

  let analyzed = 0;
  for (const { dir, key } of allSkills) {
    if (signal?.aborted) {
      logger.info('auto-analysis aborted');
      return;
    }
    // Yield to the event loop between iterations to avoid blocking
    await new Promise<void>((resolve) => setImmediate(resolve));
    try {
      const hash = computeContentHash(dir);
      const cached = getCachedAnalysis(config, key);
      if (cached && cached.hash === hash) continue;
      await analyzeSkill(config, dir, key, false, signal);
      analyzed++;
    } catch (err) {
      logger.error('auto-analysis skill failed', { key, error: err instanceof Error ? err.message : String(err) });
    }
  }

  if (analyzed > 0) {
    logger.info('auto-analysis completed', { analyzed });
  }
}
