import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import viteExpress from 'vite-express';
import { loadConfig, loadClaudeApiConfig } from './config.js';
import { HttpError } from './errors.js';
import { getErrorMessage } from './utils.js';
import { cacheSize } from './services/cache.js';
import { logger } from './services/logger.js';
import configRoutes from './routes/config.js';
import skillsRoutes from './routes/skills.js';
import summaryRoutes from './routes/summary.js';
import pluginsRoutes from './routes/plugins.js';
import analysisRoutes from './routes/analysis.js';
import searchRoutes from './routes/search.js';
import { analyzeAllSkills } from './services/analyzer.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pkg = createRequire(import.meta.url)('../package.json') as { version: string };
const startTime = Date.now();

const app = express();
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    logger.info('request', { method: req.method, url: req.url, status: res.statusCode, duration: Date.now() - start });
  });
  next();
});

app.use('/api', configRoutes);
app.use('/api', skillsRoutes);
app.use('/api', summaryRoutes);
app.use('/api', pluginsRoutes);
app.use('/api', analysisRoutes);
app.use('/api', searchRoutes);

app.get('/api/health', (_req, res) => {
  const config = loadConfig();
  const apiConfig = loadClaudeApiConfig();
  res.json({
    ok: true,
    uptime: Math.floor((Date.now() - startTime) / 1000),
    version: pkg.version,
    api: { configured: !!apiConfig, model: apiConfig?.model ?? null },
    cache: { size: cacheSize() },
    directories: {
      claudeRoot: fs.existsSync(config.claudeRootDir),
      customSkillDir: fs.existsSync(config.customSkillDir),
      claudeSkillsDir: fs.existsSync(config.claudeSkillsDir),
    },
  });
});

// Global error middleware — catches errors from all routes
app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const message = getErrorMessage(err);
  logger.error('unhandled error', { message, stack: err instanceof Error ? err.stack : undefined });

  if (err instanceof HttpError) {
    res.status(err.statusCode).json({ error: { code: err.code, message: err.message } });
    return;
  }
  res.status(500).json({ error: { code: 'INTERNAL_ERROR', message } });
});

const config = loadConfig();

const abortController = new AbortController();

const server = app.listen(config.port, () => {
  logger.info('server started', { port: config.port });

  // Auto-analyze all skills in background (non-blocking)
  // Set SKIP_AUTO_ANALYSIS=1 to skip startup analysis
  if (process.env.SKIP_AUTO_ANALYSIS !== '1') {
    analyzeAllSkills(config, abortController.signal).catch(err =>
      logger.error('auto-analysis error', { error: err instanceof Error ? err.message : String(err) }),
    );
  } else {
    logger.info('auto-analysis skipped', { reason: 'SKIP_AUTO_ANALYSIS=1' });
  }
});

viteExpress.bind(app, server);

// Graceful shutdown: abort background analysis + close server
let isShuttingDown = false;
function shutdown(signal: string) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  logger.info('shutdown signal received', { signal });
  abortController.abort();
  server.close(() => {
    logger.info('server closed');
    process.exit(0);
  });
  // Force exit after 3s if server won't close cleanly
  setTimeout(() => {
    logger.info('force exit');
    process.exit(0);
  }, 3000);
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
