import { Router } from 'express';
import { scanCustomSkills } from '../services/skill-scanner.js';
import { enableSkill, disableSkill, deleteSkill } from '../services/skill-manager.js';
import { getOrCompute, invalidate } from '../services/cache.js';

const router = Router();

router.get('/skills/custom', (_req, res) => {
  try {
    const tree = getOrCompute('custom-skills', () => scanCustomSkills());
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
    enableSkill(skillRelativePath);
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
    disableSkill(skillRelativePath);
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

  const failed: Array<{ path: string; error: string }> = [];
  for (const p of paths) {
    try {
      enableSkill(p);
    } catch (err: any) {
      failed.push({ path: p, error: err.message });
    }
  }
  invalidate();
  res.json({ ok: true, succeeded: paths.length - failed.length, failed });
});

router.post('/skills/custom/batch-disable', (req, res) => {
  const { paths } = req.body as { paths: string[] };
  if (!Array.isArray(paths) || paths.length === 0) {
    res.status(400).json({ error: 'paths must be a non-empty array' });
    return;
  }

  const failed: Array<{ path: string; error: string }> = [];
  for (const p of paths) {
    try {
      disableSkill(p);
    } catch (err: any) {
      failed.push({ path: p, error: err.message });
    }
  }
  invalidate();
  res.json({ ok: true, succeeded: paths.length - failed.length, failed });
});

router.delete('/skills/custom/delete/{*skillPath}', (req, res) => {
  const raw = req.params.skillPath;
  const skillRelativePath = Array.isArray(raw) ? raw.join('/') : raw;
  if (!skillRelativePath) {
    res.status(400).json({ error: 'Skill path is required' });
    return;
  }

  try {
    deleteSkill(skillRelativePath);
    invalidate();
    res.json({ ok: true, path: skillRelativePath });
  } catch (err: any) {
    console.error('Failed to delete skill:', err);
    res.status(400).json({ error: err.message });
  }
});

export default router;
