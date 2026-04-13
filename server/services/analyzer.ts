import fs from 'fs';
import path from 'path';
import Anthropic from '@anthropic-ai/sdk';
import { loadConfig, loadClaudeApiConfig } from '../config.js';
import { computeContentHash, collectSkillContent } from './hash-utils.js';
import { scanCustomSkills, type TreeNode } from './skill-scanner.js';
import { scanPlugins } from './plugin-scanner.js';

export interface SkillAnalysis {
  name: string;
  hash: string;
  summary: string;
  analyzedAt: string;
  model: string;
}

function getCacheFilePath(): string {
  const config = loadConfig();
  const cacheDir = path.join(path.dirname(config.customSkillDir), '.skillpanel');
  return path.join(cacheDir, 'analysis-cache.json');
}

function loadCache(): Record<string, SkillAnalysis> {
  const cacheFile = getCacheFilePath();
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

function saveCache(cache: Record<string, SkillAnalysis>): void {
  const cacheFile = getCacheFilePath();
  const cacheDir = path.dirname(cacheFile);
  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
  }
  fs.writeFileSync(cacheFile, JSON.stringify(cache, null, 2), 'utf-8');
}

export function getCachedAnalysis(key: string): SkillAnalysis | null {
  const cache = loadCache();
  return cache[key] ?? null;
}

export async function analyzeSkill(skillDir: string, key: string, force = false): Promise<SkillAnalysis> {
  const config = loadConfig();
  const hash = computeContentHash(skillDir);
  const name = path.basename(skillDir);

  // Check cache first (skip when force=true)
  if (!force) {
    const cached = getCachedAnalysis(key);
    if (cached && cached.hash === hash) {
      return cached;
    }
  }

  // Cache miss or hash changed — call Claude API
  const apiConfig = loadClaudeApiConfig();
  if (!apiConfig) {
    throw new Error('未检测到 Claude Code API 配置，请确认 ~/.claude/settings.json 中包含 ANTHROPIC_AUTH_TOKEN');
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
  });

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
  const cache = loadCache();
  cache[key] = analysis;
  saveCache(cache);

  return analysis;
}

/**
 * Auto-analyze all skills on startup.
 * Iterates custom + plugin skills, skips those with matching cache hashes.
 * Runs sequentially to avoid overwhelming the API.
 */
export async function analyzeAllSkills(): Promise<void> {
  const config = loadConfig();

  const collectFromTree = (nodes: TreeNode[]): Array<{ dir: string; key: string }> => {
    const result: Array<{ dir: string; key: string }> = [];
    for (const node of nodes) {
      if (node.type === 'skill' && node.skill) {
        result.push({
          dir: path.join(config.customSkillDir, node.path),
          key: `custom/${node.skill.name}`,
        });
      }
      if (node.children) result.push(...collectFromTree(node.children));
    }
    return result;
  };

  const allSkills = collectFromTree(scanCustomSkills());
  for (const plugin of scanPlugins()) {
    for (const skill of plugin.skills) {
      allSkills.push({ dir: skill.path, key: `plugin/${skill.name}` });
    }
  }

  if (allSkills.length === 0) return;

  console.log(`[Auto-analysis] Checking ${allSkills.length} skill(s)...`);

  let analyzed = 0;
  for (const { dir, key } of allSkills) {
    // Yield to the event loop between iterations to avoid blocking
    await new Promise<void>((resolve) => setImmediate(resolve));
    try {
      const hash = computeContentHash(dir);
      const cached = getCachedAnalysis(key);
      if (cached && cached.hash === hash) continue;
      await analyzeSkill(dir, key);
      analyzed++;
    } catch (err) {
      console.error(`[Auto-analysis] Failed: ${key}`, err instanceof Error ? err.message : err);
    }
  }

  if (analyzed > 0) {
    console.log(`[Auto-analysis] Analyzed ${analyzed} skill(s).`);
  }
}
