import express from 'express';
import { HttpError } from '../errors.js';
import { getErrorMessage } from '../utils.js';
import configRoutes from '../routes/config.js';
import skillsRoutes from '../routes/skills.js';
import summaryRoutes from '../routes/summary.js';
import pluginsRoutes from '../routes/plugins.js';
import analysisRoutes from '../routes/analysis.js';

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
  app.get('/api/health', (_req, res) => res.json({ ok: true }));

  // Global error middleware — same as production
  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const message = getErrorMessage(err);
    if (err instanceof HttpError) {
      res.status(err.statusCode).json({ error: err.message });
      return;
    }
    res.status(500).json({ error: message });
  });

  return app;
}
