import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { ValidationError } from '../errors.js';

const router = Router();

const HOME = os.homedir();

router.get('/fs/browse', (req, res) => {
  const rawPath = req.query.path as string || HOME;
  // Resolve ~ to home directory
  const resolved = rawPath.startsWith('~')
    ? path.join(HOME, rawPath.slice(1))
    : path.resolve(rawPath);

  // Security: only allow browsing under home directory
  if (!resolved.startsWith(HOME)) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Only directories under your home folder are accessible' } });
    return;
  }

  // Check it exists and is a directory
  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isDirectory()) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Directory not found' } });
    return;
  }

  const entries: { name: string; type: 'dir' }[] = [];
  try {
    const items = fs.readdirSync(resolved);
    for (const item of items) {
      // Skip hidden and node_modules
      if (item.startsWith('.') || item === 'node_modules') continue;
      const fullPath = path.join(resolved, item);
      try {
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          entries.push({ name: item, type: 'dir' });
        }
      } catch {
        // permission denied, skip
      }
    }
  } catch {
    // permission denied on the dir itself
  }

  entries.sort((a, b) => a.name.localeCompare(b.name));

  const parent = path.dirname(resolved);

  res.json({
    path: resolved,
    parent: parent.startsWith(HOME) ? parent : null,
    entries,
  });
});

export default router;
