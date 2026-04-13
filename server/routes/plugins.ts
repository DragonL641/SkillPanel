import { Router } from 'express';
import { loadConfig } from '../config.js';
import { getOrCompute } from '../services/cache.js';
import { scanPlugins, checkPluginUpdateByName } from '../services/plugin-scanner.js';
import { getErrorMessage } from '../utils.js';

const router = Router();

router.get('/skills/plugin', async (_req, res) => {
  const config = loadConfig();
  const plugins = getOrCompute('plugin-skills', () => scanPlugins(config));
  res.json({ plugins });
});

router.post('/plugins/check-update/:pluginName', async (req, res) => {
  const { pluginName } = req.params;
  if (!pluginName) {
    res.status(400).json({ error: 'Plugin name is required' });
    return;
  }

  try {
    const config = loadConfig();
    const result = await checkPluginUpdateByName(config, pluginName);
    res.json(result);
  } catch (err: unknown) {
    res.json({ hasUpdate: false, error: getErrorMessage(err), isGitRepo: false });
  }
});

export default router;
