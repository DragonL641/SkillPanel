import { Router } from 'express';
import { loadConfig, saveConfig, loadClaudeApiConfig } from '../config.js';

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
  const updated = saveConfig(req.body);
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
