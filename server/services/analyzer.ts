import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import Anthropic from '@anthropic-ai/sdk';
import { loadConfig } from '../config.js';

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

function computeContentHash(skillDir: string): string {
  const hash = crypto.createHash('md5');

  // Hash SKILL.md content
  const skillMdPath = path.join(skillDir, 'SKILL.md');
  if (fs.existsSync(skillMdPath)) {
    hash.update(fs.readFileSync(skillMdPath));
  }

  // Hash all files in scripts/ directory recursively
  const scriptsDir = path.join(skillDir, 'scripts');
  if (fs.existsSync(scriptsDir)) {
    const walkDir = (dir: string) => {
      const entries = fs.readdirSync(dir).sort();
      for (const entry of entries) {
        const fullPath = path.join(dir, entry);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          walkDir(fullPath);
        } else {
          hash.update(fs.readFileSync(fullPath));
        }
      }
    };
    walkDir(scriptsDir);
  }

  return hash.digest('hex');
}

function collectSkillContent(skillDir: string): string {
  const parts: string[] = [];

  const skillMdPath = path.join(skillDir, 'SKILL.md');
  if (fs.existsSync(skillMdPath)) {
    parts.push(fs.readFileSync(skillMdPath, 'utf-8'));
  }

  const scriptsDir = path.join(skillDir, 'scripts');
  if (fs.existsSync(scriptsDir)) {
    const walkDir = (dir: string) => {
      const entries = fs.readdirSync(dir).sort();
      for (const entry of entries) {
        const fullPath = path.join(dir, entry);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          walkDir(fullPath);
        } else {
          const relPath = path.relative(scriptsDir, fullPath);
          const content = fs.readFileSync(fullPath, 'utf-8');
          parts.push(`\n--- ${relPath} ---\n${content}`);
        }
      }
    };
    walkDir(scriptsDir);
  }

  return parts.join('\n');
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
  const apiKey = config.anthropicApiKey || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('未配置 Anthropic API Key，请在配置页面设置后再使用分析功能');
  }

  const content = collectSkillContent(skillDir);
  const prompt = `分析以下 Claude Code skill 的工作原理，用中文输出，包含：
1. 一句话概述
2. 核心工作流程（步骤化）
3. 关键依赖（API、工具、库等）

Skill 内容：
${content}`;

  const client = new Anthropic({ apiKey });
  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
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
    model: response.model,
  };

  // Save to cache
  const cache = loadCache();
  cache[key] = analysis;
  saveCache(cache);

  return analysis;
}
