import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { Router } from 'express';
import { loadConfig } from '../config.js';
import { getOrCompute, invalidate } from '../services/cache.js';
import { scanPlugins } from '../services/plugin-scanner.js';

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

router.post('/plugins/check-update/:pluginName', (req, res) => {
  const { pluginName } = req.params;
  const config = loadConfig();
  const pluginsFile = path.join(config.claudePluginsDir, 'installed_plugins.json');

  if (!fs.existsSync(pluginsFile)) {
    res.json({ hasUpdate: false, error: 'No installed plugins file', isGitRepo: false });
    return;
  }

  try {
    const raw = fs.readFileSync(pluginsFile, 'utf-8');
    const installed = JSON.parse(raw).plugins || {};

    let installPath: string | null = null;
    for (const [key, entries] of Object.entries(installed)) {
      const name = key.split('@')[0];
      if (name === pluginName && (entries as any[])[0]) {
        installPath = (entries as any[])[0].installPath;
        break;
      }
    }

    if (!installPath || !fs.existsSync(installPath)) {
      res.json({ hasUpdate: false, error: 'Plugin not found', isGitRepo: false });
      return;
    }

    // Check if installPath is a git repository
    const gitDir = path.join(installPath, '.git');
    if (!fs.existsSync(gitDir)) {
      res.json({ hasUpdate: false, isGitRepo: false });
      return;
    }

    // Get current commit
    let currentCommit = '';
    try {
      currentCommit = execFileSync('git', ['rev-parse', '--short', 'HEAD'], {
        cwd: installPath,
        encoding: 'utf-8',
        timeout: 5000,
      }).trim();
    } catch {
      res.json({ hasUpdate: false, error: 'Not a git repository', isGitRepo: false });
      return;
    }

    // Fetch from origin
    try {
      execFileSync('git', ['fetch', 'origin'], {
        cwd: installPath,
        encoding: 'utf-8',
        timeout: 30000,
      });
    } catch {
      res.json({ hasUpdate: false, error: 'Network error', currentCommit, isGitRepo: true });
      return;
    }

    // Check commits behind
    let behindBy = 0;
    try {
      const count = execFileSync('git', ['rev-list', '--count', 'HEAD..origin/main'], {
        cwd: installPath,
        encoding: 'utf-8',
        timeout: 5000,
      }).trim();
      behindBy = parseInt(count, 10) || 0;
    } catch {
      try {
        const count = execFileSync('git', ['rev-list', '--count', 'HEAD..origin/master'], {
          cwd: installPath,
          encoding: 'utf-8',
          timeout: 5000,
        }).trim();
        behindBy = parseInt(count, 10) || 0;
      } catch {
        // Can't determine, report no update found
      }
    }

    res.json({ hasUpdate: behindBy > 0, behindBy, currentCommit, isGitRepo: true });
  } catch (err: any) {
    res.json({ hasUpdate: false, error: err.message, isGitRepo: false });
  }
});

export default router;
