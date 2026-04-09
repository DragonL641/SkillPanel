import fs from 'fs';
import path from 'path';
import { Router } from 'express';
import { loadConfig } from '../config.js';
import { scanPlugins } from '../services/plugin-scanner.js';
import { getCachedAnalysis, analyzeSkill } from '../services/analyzer.js';

const router = Router();

/**
 * Find the skill directory by source and name.
 * - "custom": recursively search in customSkillDir for a directory matching the name that contains SKILL.md
 * - "plugin": use scanPlugins() to find the skill path
 */
function findSkillDir(source: string, name: string): string | null {
  const config = loadConfig();

  if (source === 'custom') {
    const root = config.customSkillDir;
    if (!fs.existsSync(root)) return null;

    const search = (dir: string): string | null => {
      const entries = fs.readdirSync(dir);
      for (const entry of entries) {
        if (entry.startsWith('.') || entry === 'node_modules') continue;
        const fullPath = path.join(dir, entry);
        if (!fs.statSync(fullPath).isDirectory()) continue;

        if (entry === name && fs.existsSync(path.join(fullPath, 'SKILL.md'))) {
          return fullPath;
        }
        // Recurse into subdirectories
        const found = search(fullPath);
        if (found) return found;
      }
      return null;
    };

    return search(root);
  }

  if (source === 'plugin') {
    const plugins = scanPlugins();
    for (const plugin of plugins) {
      for (const skill of plugin.skills) {
        if (skill.name === name) {
          if (fs.existsSync(skill.path)) {
            return skill.path;
          }
        }
      }
    }
    return null;
  }

  return null;
}

// GET /api/analysis/:source/:name — get cached analysis
router.get('/analysis/:source/:name', (req, res) => {
  const { source, name } = req.params;
  const key = `${source}/${name}`;
  const cached = getCachedAnalysis(key);

  res.json({
    name,
    source,
    summary: cached?.summary ?? null,
    hash: cached?.hash ?? null,
    analyzedAt: cached?.analyzedAt ?? null,
    model: cached?.model ?? null,
  });
});

// POST /api/analysis/:source/:name — trigger (re)analysis
router.post('/analysis/:source/:name', async (req, res) => {
  const { source, name } = req.params;
  const key = `${source}/${name}`;

  try {
    const skillDir = findSkillDir(source, name);
    if (!skillDir) {
      res.status(404).json({ error: `Skill not found: ${source}/${name}` });
      return;
    }

    const analysis = await analyzeSkill(skillDir, key);
    res.json({
      name: analysis.name,
      source,
      summary: analysis.summary,
      hash: analysis.hash,
      analyzedAt: analysis.analyzedAt,
      model: analysis.model,
    });
  } catch (err: any) {
    console.error('Failed to analyze skill:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
