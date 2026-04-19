import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { loadConfig } from '../config.js';
import { scanCustomSkills } from '../services/skill-scanner.js';
import { enableSkill, disableSkill, deleteSkill, batchToggleSkills } from '../services/skill-manager.js';
import { getOrCompute, invalidateByPrefix } from '../services/cache.js';

const router = Router();

router.get('/skills/custom', (_req, res) => {
  const config = loadConfig();
  const tree = getOrCompute('skills:custom', () => scanCustomSkills(config));
  res.json({ tree });
});

router.post('/skills/custom/enable/{*skillPath}', (req, res) => {
  // Express 5 wildcard params return an array
  const raw = req.params.skillPath;
  const skillRelativePath = Array.isArray(raw) ? raw.join('/') : raw;
  if (!skillRelativePath) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Skill path is required' } });
    return;
  }

  const config = loadConfig();
  enableSkill(config, skillRelativePath);
  invalidateByPrefix('skills:');
  res.json({ ok: true, path: skillRelativePath });
});

router.post('/skills/custom/disable/{*skillPath}', (req, res) => {
  const raw = req.params.skillPath;
  const skillRelativePath = Array.isArray(raw) ? raw.join('/') : raw;
  if (!skillRelativePath) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Skill path is required' } });
    return;
  }

  const config = loadConfig();
  disableSkill(config, skillRelativePath);
  invalidateByPrefix('skills:');
  res.json({ ok: true, path: skillRelativePath });
});

router.post('/skills/custom/batch-enable', (req, res) => {
  const { paths } = req.body as { paths: string[] };
  if (!Array.isArray(paths) || paths.length === 0) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'paths must be a non-empty array' } });
    return;
  }

  const config = loadConfig();
  const result = batchToggleSkills(config, paths, 'enable');
  invalidateByPrefix('skills:');
  res.json(result);
});

router.post('/skills/custom/batch-disable', (req, res) => {
  const { paths } = req.body as { paths: string[] };
  if (!Array.isArray(paths) || paths.length === 0) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'paths must be a non-empty array' } });
    return;
  }

  const config = loadConfig();
  const result = batchToggleSkills(config, paths, 'disable');
  invalidateByPrefix('skills:');
  res.json(result);
});

router.delete('/skills/custom/delete/{*skillPath}', (req, res) => {
  const raw = req.params.skillPath;
  const skillRelativePath = Array.isArray(raw) ? raw.join('/') : raw;
  if (!skillRelativePath) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Skill path is required' } });
    return;
  }

  const config = loadConfig();
  deleteSkill(config, skillRelativePath);
  invalidateByPrefix('skills:');
  res.json({ ok: true, path: skillRelativePath });
});

router.get('/skills/custom/content/{*skillPath}', (req, res) => {
  const raw = req.params.skillPath;
  const skillRelativePath = Array.isArray(raw) ? raw.join('/') : raw;
  if (!skillRelativePath) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Skill path is required' } });
    return;
  }

  const config = loadConfig();
  // Try each customSkillDir to find the skill
  for (const dir of config.customSkillDirs) {
    const skillDir = path.join(dir, skillRelativePath);
    const skillMdPath = path.join(skillDir, 'SKILL.md');
    if (fs.existsSync(skillMdPath)) {
      const content = fs.readFileSync(skillMdPath, 'utf-8');
      res.json({ content, path: skillRelativePath });
      return;
    }
  }

  res.status(404).json({ error: { code: 'NOT_FOUND', message: `SKILL.md not found for: ${skillRelativePath}` } });
});

export default router;
