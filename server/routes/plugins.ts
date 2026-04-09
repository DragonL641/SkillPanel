import { Router } from 'express';
import { scanPlugins } from '../services/plugin-scanner.js';
import { getOrCompute } from '../services/cache.js';

const router = Router();

router.get('/skills/plugin', (_req, res) => {
  try {
    const plugins = getOrCompute('plugin-skills', () => scanPlugins());
    res.json({ plugins });
  } catch (err: any) {
    console.error('Failed to scan plugins:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
