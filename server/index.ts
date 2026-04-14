import express from 'express';
import viteExpress from 'vite-express';
import { loadConfig } from './config.js';
import { HttpError } from './errors.js';
import { getErrorMessage } from './utils.js';
import configRoutes from './routes/config.js';
import skillsRoutes from './routes/skills.js';
import summaryRoutes from './routes/summary.js';
import pluginsRoutes from './routes/plugins.js';
import analysisRoutes from './routes/analysis.js';
import { analyzeAllSkills } from './services/analyzer.js';

const app = express();
app.use(express.json());

app.use('/api', configRoutes);
app.use('/api', skillsRoutes);
app.use('/api', summaryRoutes);
app.use('/api', pluginsRoutes);
app.use('/api', analysisRoutes);
app.get('/api/health', (_req, res) => res.json({ ok: true }));

// Global error middleware — catches errors from all routes
app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const message = getErrorMessage(err);
  console.error('[Express]', message, err instanceof Error ? err.stack : '');

  if (err instanceof HttpError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }
  res.status(500).json({ error: message });
});

const config = loadConfig();

const abortController = new AbortController();

const server = app.listen(config.port, () => {
  console.log(`SkillPanel running at http://localhost:${config.port}`);

  // Auto-analyze all skills in background (non-blocking)
  // Set SKIP_AUTO_ANALYSIS=1 to skip startup analysis
  if (process.env.SKIP_AUTO_ANALYSIS !== '1') {
    analyzeAllSkills(config, abortController.signal).catch(err =>
      console.error('[Auto-analysis] Error:', err instanceof Error ? err.message : err),
    );
  } else {
    console.log('[Auto-analysis] Skipped (SKIP_AUTO_ANALYSIS=1)');
  }
});

viteExpress.bind(app, server);

// Graceful shutdown: abort background analysis + close server
let isShuttingDown = false;
function shutdown(signal: string) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log(`\n[Shutdown] ${signal} received, shutting down...`);
  abortController.abort();
  server.close(() => {
    console.log('[Shutdown] Server closed.');
    process.exit(0);
  });
  // Force exit after 3s if server won't close cleanly
  setTimeout(() => {
    console.log('[Shutdown] Force exit.');
    process.exit(0);
  }, 3000);
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
