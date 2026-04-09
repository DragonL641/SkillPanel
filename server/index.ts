import express from 'express';
import viteExpress from 'vite-express';
import { loadConfig } from './config.js';
import configRoutes from './routes/config.js';

const app = express();
app.use(express.json());

app.use('/api', configRoutes);
app.get('/api/health', (_req, res) => res.json({ ok: true }));

const config = loadConfig();

const server = app.listen(config.port, () => {
  console.log(`SkillPanel running at http://localhost:${config.port}`);
});

viteExpress.bind(app, server);
