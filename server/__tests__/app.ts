import express from 'express';
import fs from 'fs';
import { HttpError } from '../errors.js';
import { getErrorMessage } from '../utils.js';
import { cacheSize } from '../services/cache.js';
import { loadConfig, loadClaudeApiConfig } from '../config.js';
import configRoutes from '../routes/config.js';
import skillsRoutes from '../routes/skills.js';
import summaryRoutes from '../routes/summary.js';
import pluginsRoutes from '../routes/plugins.js';
import analysisRoutes from '../routes/analysis.js';
import searchRoutes from '../routes/search.js';

/**
 * Create an Express app for testing, without listen() or vite-express binding.
 */
export function createApp() {
  const app = express();
  app.use(express.json());

  app.use('/api', configRoutes);
  app.use('/api', skillsRoutes);
  app.use('/api', summaryRoutes);
  app.use('/api', pluginsRoutes);
  app.use('/api', analysisRoutes);
  app.use('/api', searchRoutes);

  // Health route — mirrors server/index.ts
  app.get('/api/health', (_req, res) => {
    const config = loadConfig();
    const apiConfig = loadClaudeApiConfig();
    res.json({
      ok: true,
      uptime: 0,
      version: '0.0.0-test',
      api: { configured: !!apiConfig, model: apiConfig?.model ?? null },
      cache: { size: cacheSize() },
      directories: {
        claudeRoot: fs.existsSync(config.claudeRootDir),
        customSkillDir: fs.existsSync(config.customSkillDir),
        claudeSkillsDir: fs.existsSync(config.claudeSkillsDir),
      },
    });
  });

  // Global error middleware — same as production
  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const message = getErrorMessage(err);
    if (err instanceof HttpError) {
      res.status(err.statusCode).json({ error: { code: err.code, message: err.message } });
      return;
    }
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message } });
  });

  return app;
}
