import { Router } from 'express';
import { loadConfig, saveConfig, buildConfigResponse } from '../config.js';
import { invalidate } from '../services/cache.js';

const router = Router();

router.get('/config', (_req, res) => {
  try {
    const config = loadConfig();
    res.json(buildConfigResponse(config));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[Config] GET /api/config failed:', err);
    res.status(500).json({ error: message });
  }
});

router.put('/config', async (req, res) => {
  const { claudeRootDir, customSkillDir, port } = req.body;
  if (port !== undefined) {
    const p = Number(port);
    if (!Number.isInteger(p) || p < 1024 || p > 65535) {
      res.status(400).json({ error: 'Port must be an integer between 1024 and 65535' });
      return;
    }
  }
  if (claudeRootDir !== undefined && (typeof claudeRootDir !== 'string' || !claudeRootDir.trim())) {
    res.status(400).json({ error: 'Claude root directory must be a non-empty string' });
    return;
  }
  if (customSkillDir !== undefined && (typeof customSkillDir !== 'string' || !customSkillDir.trim())) {
    res.status(400).json({ error: 'Custom skill directory must be a non-empty string' });
    return;
  }
  const updated = await saveConfig(req.body);
  invalidate();
  res.json(buildConfigResponse(updated));
});

export default router;
