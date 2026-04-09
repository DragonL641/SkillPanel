import express from 'express';
import viteExpress from 'vite-express';
import { loadConfig } from './config.js';
import configRoutes from './routes/config.js';
import skillsRoutes from './routes/skills.js';
import summaryRoutes from './routes/summary.js';
import pluginsRoutes from './routes/plugins.js';
import analysisRoutes from './routes/analysis.js';

const app = express();
app.use(express.json());

app.use('/api', configRoutes);
app.use('/api', skillsRoutes);
app.use('/api', summaryRoutes);
app.use('/api', pluginsRoutes);
app.use('/api', analysisRoutes);
app.get('/api/health', (_req, res) => res.json({ ok: true }));

const config = loadConfig();

const server = app.listen(config.port, () => {
  console.log(`SkillPanel running at http://localhost:${config.port}`);
});

viteExpress.bind(app, server);
