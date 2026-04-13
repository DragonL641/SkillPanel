import { Router } from 'express';
import { loadConfig } from '../config.js';
import { scanCustomSkills } from '../services/skill-scanner.js';
import { enableSkill, disableSkill, deleteSkill, batchToggleSkills } from '../services/skill-manager.js';
import { getOrCompute, invalidate } from '../services/cache.js';

const router = Router();

router.get('/skills/custom', (_req, res) => {
  try {
    const config = loadConfig();
    const tree = getOrCompute('custom-skills', () => scanCustomSkills(config));
    res.json({ tree });
  } catch (err: any) {
    console.error('Failed to scan custom skills:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/skills/custom/enable/{*skillPath}', (req, res) => {
  // Express 5 wildcard params return an array
  const raw = req.params.skillPath;
  const skillRelativePath = Array.isArray(raw) ? raw.join('/') : raw;
  if (!skillRelativePath) {
    res.status(400).json({ error: 'Skill path is required' });
    return;
  }

  try {
    const config = loadConfig();
    enableSkill(config, skillRelativePath);
    invalidate();
    res.json({ ok: true, path: skillRelativePath });
  } catch (err: any) {
    console.error('Failed to enable skill:', err);
    res.status(400).json({ error: err.message });
  }
});

router.post('/skills/custom/disable/{*skillPath}', (req, res) => {
  const raw = req.params.skillPath;
  const skillRelativePath = Array.isArray(raw) ? raw.join('/') : raw;
  if (!skillRelativePath) {
    res.status(400).json({ error: 'Skill path is required' });
    return;
  }

  try {
    const config = loadConfig();
    disableSkill(config, skillRelativePath);
    invalidate();
    res.json({ ok: true, path: skillRelativePath });
  } catch (err: any) {
    console.error('Failed to disable skill:', err);
    res.status(400).json({ error: err.message });
  }
});

router.post('/skills/custom/batch-enable', (req, res) => {
  const { paths } = req.body as { paths: string[] };
  if (!Array.isArray(paths) || paths.length === 0) {
    res.status(400).json({ error: 'paths must be a non-empty array' });
    return;
  }

  const config = loadConfig();
  const result = batchToggleSkills(config, paths, 'enable');
  invalidate();
  res.json(result);
});

router.post('/skills/custom/batch-disable', (req, res) => {
  const { paths } = req.body as { paths: string[] };
  if (!Array.isArray(paths) || paths.length === 0) {
    res.status(400).json({ error: 'paths must be a non-empty array' });
    return;
  }

  const config = loadConfig();
  const result = batchToggleSkills(config, paths, 'disable');
  invalidate();
  res.json(result);
});

router.delete('/skills/custom/delete/{*skillPath}', (req, res) => {
  const raw = req.params.skillPath;
  const skillRelativePath = Array.isArray(raw) ? raw.join('/') : raw;
  if (!skillRelativePath) {
    res.status(400).json({ error: 'Skill path is required' });
    return;
  }

  try {
    const config = loadConfig();
    deleteSkill(config, skillRelativePath);
    invalidate();
    res.json({ ok: true, path: skillRelativePath });
  } catch (err: any) {
    console.error('Failed to delete skill:', err);
    res.status(400).json({ error: err.message });
  }
});

export default router;
