import fs from 'fs';
import path from 'path';
import Anthropic from '@anthropic-ai/sdk';
import { loadConfig, loadClaudeApiConfig } from '../config.js';
import { computeContentHash, collectSkillContent } from './hash-utils.js';

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

export async function analyzeSkill(skillDir: string, key: string): Promise<SkillAnalysis> {
  const config = loadConfig();
  const hash = computeContentHash(skillDir);
  const name = path.basename(skillDir);

  // Check cache first
  const cached = getCachedAnalysis(key);
  if (cached && cached.hash === hash) {
    return cached;
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
