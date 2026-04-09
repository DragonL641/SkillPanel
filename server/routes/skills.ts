import { Router } from 'express';
import { scanCustomSkills } from '../services/skill-scanner.js';
import { enableSkill, disableSkill } from '../services/skill-manager.js';

const router = Router();

router.get('/skills/custom', (_req, res) => {
  try {
    const tree = scanCustomSkills();
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
    res.json({ ok: true, path: skillRelativePath });
  } catch (err: any) {
    console.error('Failed to disable skill:', err);
    res.status(400).json({ error: err.message });
  }
});

export default router;
