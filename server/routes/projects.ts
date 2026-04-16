import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { loadConfig, saveConfig } from '../config.js';
import { enableSkill, disableSkill, batchToggleSkills } from '../services/skill-manager.js';
import { buildProjectInfo, getProjectSkills, getProjectSkillsDir, flattenSkillTree } from '../services/project-scanner.js';
import { scanCustomSkills } from '../services/skill-scanner.js';
import { invalidateByPrefix } from '../services/cache.js';

const router = Router();

// GET /api/projects
router.get('/projects', (_req, res) => {
  const config = loadConfig();
  const tree = scanCustomSkills(config);
  const allSkillPaths = flattenSkillTree(tree).map(s => s.absolutePath);
  const projects = (config.projects || []).map(p =>
    buildProjectInfo(config, p, allSkillPaths)
  );
  res.json({ projects });
});

// POST /api/projects — register new project
router.post('/projects', async (req, res) => {
  const { path: projectPath } = req.body as { path?: string };
  if (!projectPath || typeof projectPath !== 'string' || !projectPath.trim()) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'path is required' } });
    return;
  }
  const resolved = path.resolve(projectPath);
  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isDirectory()) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Path does not exist or is not a directory' } });
    return;
  }
  const name = path.basename(resolved);
  const config = loadConfig();
  const projects = config.projects || [];
  if (projects.some(p => p.name === name)) {
    res.status(409).json({ error: { code: 'CONFLICT', message: `Project "${name}" already registered` } });
    return;
  }
  projects.push({ name, path: resolved });
  await saveConfig({ customSkillDirs: config.customSkillDirs, projects });
  invalidateByPrefix('config');
  res.json({ ok: true, project: { name, path: resolved } });
});

// DELETE /api/projects/:name
router.delete('/projects/:name', async (req, res) => {
  const { name } = req.params;
  const config = loadConfig();
  const projects = config.projects || [];
  const idx = projects.findIndex(p => p.name === name);
  if (idx === -1) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: `Project "${name}" not found` } });
    return;
  }
  projects.splice(idx, 1);
  await saveConfig({ customSkillDirs: config.customSkillDirs, projects });
  invalidateByPrefix('config');
  res.json({ ok: true });
});

// GET /api/projects/:name/skills
router.get('/projects/:name/skills', (req, res) => {
  const { name } = req.params;
  const config = loadConfig();
  const project = (config.projects || []).find(p => p.name === name);
  if (!project) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: `Project "${name}" not found` } });
    return;
  }
  const tree = scanCustomSkills(config);
  const allSkills = flattenSkillTree(tree);
  const result = getProjectSkills(config, project, allSkills);
  res.json(result);
});

// POST /api/projects/:name/skills/enable/{*skillPath}
router.post('/projects/:name/skills/enable/{*skillPath}', (req, res) => {
  const { name } = req.params;
  const raw = req.params.skillPath;
  const skillRelativePath = Array.isArray(raw) ? raw.join('/') : raw;
  if (!skillRelativePath) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Skill path is required' } });
    return;
  }
  const config = loadConfig();
  const project = (config.projects || []).find(p => p.name === name);
  if (!project) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: `Project "${name}" not found` } });
    return;
  }
  const targetDir = getProjectSkillsDir(project);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }
  enableSkill(config, skillRelativePath, targetDir);
  invalidateByPrefix('skills:');
  res.json({ ok: true, path: skillRelativePath });
});

// POST /api/projects/:name/skills/disable/{*skillPath}
router.post('/projects/:name/skills/disable/{*skillPath}', (req, res) => {
  const { name } = req.params;
  const raw = req.params.skillPath;
  const skillRelativePath = Array.isArray(raw) ? raw.join('/') : raw;
  if (!skillRelativePath) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Skill path is required' } });
    return;
  }
  const config = loadConfig();
  const project = (config.projects || []).find(p => p.name === name);
  if (!project) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: `Project "${name}" not found` } });
    return;
  }
  const targetDir = getProjectSkillsDir(project);
  disableSkill(config, skillRelativePath, targetDir);
  invalidateByPrefix('skills:');
  res.json({ ok: true, path: skillRelativePath });
});

// POST /api/projects/:name/skills/batch-enable
router.post('/projects/:name/skills/batch-enable', (req, res) => {
  const { name } = req.params;
  const { paths } = req.body as { paths: string[] };
  if (!Array.isArray(paths) || paths.length === 0) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'paths must be a non-empty array' } });
    return;
  }
  const config = loadConfig();
  const project = (config.projects || []).find(p => p.name === name);
  if (!project) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: `Project "${name}" not found` } });
    return;
  }
  const targetDir = getProjectSkillsDir(project);
  if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
  const result = batchToggleSkills(config, paths, 'enable', targetDir);
  invalidateByPrefix('skills:');
  res.json(result);
});

// POST /api/projects/:name/skills/batch-disable
router.post('/projects/:name/skills/batch-disable', (req, res) => {
  const { name } = req.params;
  const { paths } = req.body as { paths: string[] };
  if (!Array.isArray(paths) || paths.length === 0) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'paths must be a non-empty array' } });
    return;
  }
  const config = loadConfig();
  const project = (config.projects || []).find(p => p.name === name);
  if (!project) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: `Project "${name}" not found` } });
    return;
  }
  const targetDir = getProjectSkillsDir(project);
  const result = batchToggleSkills(config, paths, 'disable', targetDir);
  invalidateByPrefix('skills:');
  res.json(result);
});

export default router;
