import { Router } from 'express';
import { loadConfig, saveConfig, buildConfigResponse } from '../config.js';
import { invalidateByPrefix } from '../services/cache.js';

const router = Router();

router.get('/config', (req, res) => {
  const config = loadConfig();
  const detectDir = typeof req.query.detectDir === 'string' && req.query.detectDir.trim() ? req.query.detectDir : undefined;
  res.json(buildConfigResponse(config, detectDir));
});

router.put('/config', async (req, res) => {
  const { claudeRootDir, customSkillDir, customSkillDirs, projects, port } = req.body;
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
  if (customSkillDir !== undefined) {
    if (typeof customSkillDir !== 'string') {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Custom skill directory must be a string' } });
      return;
    }
    if (customSkillDir.length > 0 && !customSkillDir.trim()) {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Custom skill directory must not be whitespace-only' } });
      return;
    }
  }
  if (customSkillDirs !== undefined) {
    if (!Array.isArray(customSkillDirs) || customSkillDirs.some((d: any) => typeof d !== 'string' || !d.trim())) {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'customSkillDirs must be an array of non-empty strings' } });
      return;
    }
  }
  if (projects !== undefined) {
    if (!Array.isArray(projects) || projects.some((p: any) => typeof p !== 'object' || !p || typeof p.name !== 'string' || typeof p.path !== 'string')) {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'projects must be an array of { name: string, path: string }' } });
      return;
    }
  }
  const updated = await saveConfig(req.body);
  invalidateByPrefix('config');
  invalidateByPrefix('skills:');
  res.json(buildConfigResponse(updated));
});

export default router;
