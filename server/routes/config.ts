import { Router } from 'express';
import { loadConfig, saveConfig } from '../config.js';

const router = Router();

router.get('/config', (_req, res) => {
  const config = loadConfig();
  res.json({
    ...config,
    anthropicApiKey: config.anthropicApiKey ? '****' + config.anthropicApiKey.slice(-4) : '',
  });
});

router.put('/config', (req, res) => {
  const updated = saveConfig(req.body);
  res.json({
    ...updated,
    anthropicApiKey: updated.anthropicApiKey ? '****' + updated.anthropicApiKey.slice(-4) : '',
  });
});

export default router;
