import { Router } from 'express';
import { loadConfig } from '../config.js';
import { findSkillDir } from '../services/skill-scanner.js';
import { getCachedAnalysis, analyzeSkill } from '../services/analyzer.js';

const router = Router();

// GET /api/analysis/:source/:name — get cached analysis
router.get('/analysis/:source/:name', (req, res) => {
  const { source, name } = req.params;
  const key = `${source}/${name}`;
  const config = loadConfig();
  const cached = getCachedAnalysis(config, key);

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
    const config = loadConfig();
    const skillDir = findSkillDir(config, source, name);
    if (!skillDir) {
      res.status(404).json({ error: `Skill not found: ${source}/${name}` });
      return;
    }

    const analysis = await analyzeSkill(config, skillDir, key, true);
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
