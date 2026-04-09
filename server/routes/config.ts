import { Router } from 'express';
import { loadConfig, saveConfig, loadClaudeApiConfig } from '../config.js';
import { invalidate } from '../services/cache.js';

const router = Router();

router.get('/config', (_req, res) => {
  const config = loadConfig();
  const apiConfig = loadClaudeApiConfig();
  res.json({
    claudeRootDir: config.claudeRootDir,
    customSkillDir: config.customSkillDir,
    port: config.port,
    apiConfigDetected: !!apiConfig,
    apiModel: apiConfig?.model || null,
  });
});

router.put('/config', (req, res) => {
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
  const updated = saveConfig(req.body);
  invalidate();
  const apiConfig = loadClaudeApiConfig();
  res.json({
    claudeRootDir: updated.claudeRootDir,
    customSkillDir: updated.customSkillDir,
    port: updated.port,
    apiConfigDetected: !!apiConfig,
    apiModel: apiConfig?.model || null,
  });
});

export default router;
