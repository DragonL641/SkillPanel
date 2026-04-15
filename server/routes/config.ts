import { Router } from 'express';
import { loadConfig, saveConfig, buildConfigResponse } from '../config.js';
import { invalidateByPrefix } from '../services/cache.js';

const router = Router();

router.get('/config', (_req, res) => {
  const config = loadConfig();
  res.json(buildConfigResponse(config));
});

router.put('/config', async (req, res) => {
  const { claudeRootDir, customSkillDir, port } = req.body;
  if (port !== undefined) {
    const p = Number(port);
    if (!Number.isInteger(p) || p < 1024 || p > 65535) {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Port must be an integer between 1024 and 65535' } });
      return;
    }
  }
  if (claudeRootDir !== undefined && (typeof claudeRootDir !== 'string' || !claudeRootDir.trim())) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Claude root directory must be a non-empty string' } });
    return;
  }
  if (customSkillDir !== undefined && (typeof customSkillDir !== 'string' || !customSkillDir.trim())) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Custom skill directory must be a non-empty string' } });
    return;
  }
  const updated = await saveConfig(req.body);
  invalidateByPrefix('config');
  invalidateByPrefix('skills:');
  res.json(buildConfigResponse(updated));
});

export default router;
