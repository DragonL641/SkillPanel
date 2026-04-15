import { Router } from 'express';
import { loadConfig } from '../config.js';
import { scanCustomSkills, getSkillsSummary } from '../services/skill-scanner.js';
import { scanPlugins } from '../services/plugin-scanner.js';
import { getOrCompute } from '../services/cache.js';

const router = Router();

router.get('/skills/summary', (_req, res) => {
  const config = loadConfig();
  const tree = getOrCompute('skills:custom', () => scanCustomSkills(config));
  const plugins = getOrCompute('skills:plugins', () => scanPlugins(config));
  const summary = getSkillsSummary(config, tree, plugins);
  res.json(summary);
});

export default router;
