import fs from 'fs';
import path from 'path';
import os from 'os';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { createApp } from './app.js';
import { loadConfig } from '../config.js';
import { invalidate, invalidateByPrefix } from '../services/cache.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'sp-test-'));
}

/**
 * Create a minimal valid config that points at temp directories.
 * Writes a skillpanel.config.json so loadConfig() picks it up.
 */
function setupConfig(tmpRoot: string) {
  const customSkillDir = path.join(tmpRoot, 'custom-skills');
  const claudeRootDir = path.join(tmpRoot, 'claude');
  fs.mkdirSync(customSkillDir, { recursive: true });
  fs.mkdirSync(path.join(claudeRootDir, 'skills'), { recursive: true });
  fs.mkdirSync(path.join(claudeRootDir, 'plugins'), { recursive: true });

  // Write config file so loadConfig() resolves to our temp dirs
  const configFile = path.join(process.cwd(), 'skillpanel.config.json');
  fs.writeFileSync(
    configFile,
    JSON.stringify({
      claudeRootDir,
      customSkillDirs: [customSkillDir],
      port: 3210,
      projects: [],
      groups: [],
    }),
    'utf-8',
  );
  invalidateByPrefix('config');
  return { customSkillDir, claudeRootDir, configFile };
}

function cleanupConfig(configFile: string) {
  if (fs.existsSync(configFile)) fs.unlinkSync(configFile);
  invalidateByPrefix('config');
}

/** Create a project directory with .claude subdirectory */
function createProjectDir(tmpRoot: string, name: string): string {
  const projectDir = path.join(tmpRoot, name);
  fs.mkdirSync(projectDir, { recursive: true });
  fs.mkdirSync(path.join(projectDir, '.claude'), { recursive: true });
  return projectDir;
}

/** Create a skill directory with a SKILL.md inside customSkillDir */
function createSkill(customSkillDir: string, name: string, description = 'A test skill') {
  const skillDir = path.join(customSkillDir, name);
  fs.mkdirSync(skillDir, { recursive: true });
  fs.writeFileSync(
    path.join(skillDir, 'SKILL.md'),
    `---\nname: ${name}\ndescription: ${description}\n---\n# ${name}\nTest skill content.`,
    'utf-8',
  );
  return skillDir;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('API Routes — Integration Tests', () => {
  let tmpRoot: string;
  let customSkillDir: string;
  let claudeRootDir: string;
  let configFile: string;

  beforeEach(() => {
    invalidate(); // Clear getOrCompute cache before each test
    tmpRoot = makeTmpDir();
    const setup = setupConfig(tmpRoot);
    customSkillDir = setup.customSkillDir;
    claudeRootDir = setup.claudeRootDir;
    configFile = setup.configFile;
  });

  afterEach(() => {
    cleanupConfig(configFile);
    invalidate();
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  });

  // -----------------------------------------------------------------------
  // GET /api/health
  // -----------------------------------------------------------------------
  describe('GET /api/health', () => {
    it('returns ok: true', async () => {
      const app = createApp();
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(typeof res.body.uptime).toBe('number');
      expect(typeof res.body.version).toBe('string');
      expect(typeof res.body.api).toBe('object');
      expect(typeof res.body.cache).toBe('object');
      expect(typeof res.body.directories).toBe('object');
    });
  });

  // -----------------------------------------------------------------------
  // GET /api/config
  // -----------------------------------------------------------------------
  describe('GET /api/config', () => {
    it('returns config with expected fields', async () => {
      const app = createApp();
      const res = await request(app).get('/api/config');
      expect(res.status).toBe(200);
      expect(res.body.claudeRootDir).toBe(claudeRootDir);
      expect(res.body.customSkillDir).toBe(customSkillDir);
      expect(res.body.customSkillDirs).toEqual([customSkillDir]);
      expect(res.body.port).toBe(3210);
      expect(res.body.projects).toEqual([]);
      expect(typeof res.body.apiConfigDetected).toBe('boolean');
    });
  });

  // -----------------------------------------------------------------------
  // PUT /api/config
  // -----------------------------------------------------------------------
  describe('PUT /api/config', () => {
    it('updates port', async () => {
      const app = createApp();
      const res = await request(app)
        .put('/api/config')
        .send({ port: 4000 });
      expect(res.status).toBe(200);
      expect(res.body.port).toBe(4000);
    });

    it('rejects invalid port', async () => {
      const app = createApp();
      const res = await request(app)
        .put('/api/config')
        .send({ port: 80 });
      expect(res.status).toBe(400);
      expect(res.body.error.message).toMatch(/port/i);
    });

    it('rejects non-integer port', async () => {
      const app = createApp();
      const res = await request(app)
        .put('/api/config')
        .send({ port: 3.5 });
      expect(res.status).toBe(400);
    });

    it('rejects empty claudeRootDir', async () => {
      const app = createApp();
      const res = await request(app)
        .put('/api/config')
        .send({ claudeRootDir: '' });
      expect(res.status).toBe(400);
    });

    it('rejects empty customSkillDir', async () => {
      const app = createApp();
      const res = await request(app)
        .put('/api/config')
        .send({ customSkillDir: '  ' });
      expect(res.status).toBe(400);
    });

    it('accepts customSkillDirs array', async () => {
      const app = createApp();
      const res = await request(app)
        .put('/api/config')
        .send({ customSkillDirs: [customSkillDir] });
      expect(res.status).toBe(200);
      expect(res.body.customSkillDirs).toEqual([customSkillDir]);
    });

    it('rejects customSkillDirs with empty strings', async () => {
      const app = createApp();
      const res = await request(app)
        .put('/api/config')
        .send({ customSkillDirs: ['valid-path', ''] });
      expect(res.status).toBe(400);
    });

    it('accepts projects array', async () => {
      const app = createApp();
      const res = await request(app)
        .put('/api/config')
        .send({ projects: [{ name: 'my-project', path: '/tmp/my-project' }] });
      expect(res.status).toBe(200);
      expect(res.body.projects).toEqual([{ name: 'my-project', path: '/tmp/my-project' }]);
    });

    it('rejects invalid projects array', async () => {
      const app = createApp();
      const res = await request(app)
        .put('/api/config')
        .send({ projects: [{ name: 'missing-path' }] });
      expect(res.status).toBe(400);
    });
  });

  // -----------------------------------------------------------------------
  // GET /api/skills/custom
  // -----------------------------------------------------------------------
  describe('GET /api/skills/custom', () => {
    it('returns empty tree when no skills', async () => {
      const app = createApp();
      const res = await request(app).get('/api/skills/custom');
      expect(res.status).toBe(200);
      expect(res.body.tree).toEqual([]);
    });

    it('returns skill nodes for existing skills', async () => {
      createSkill(customSkillDir, 'my-skill');
      const app = createApp();
      const res = await request(app).get('/api/skills/custom');
      expect(res.status).toBe(200);
      expect(res.body.tree).toHaveLength(1);
      // Top-level node is a dir group (basename of customSkillDir)
      expect(res.body.tree[0].type).toBe('dir');
      expect(res.body.tree[0].children).toHaveLength(1);
      expect(res.body.tree[0].children[0].type).toBe('skill');
      expect(res.body.tree[0].children[0].name).toBe('my-skill');
    });

    it('groups skills in nested directories', async () => {
      const subDir = path.join(customSkillDir, 'category');
      fs.mkdirSync(subDir, { recursive: true });
      // Skill inside subdirectory
      const skillDir = path.join(subDir, 'nested-skill');
      fs.mkdirSync(skillDir, { recursive: true });
      fs.writeFileSync(
        path.join(skillDir, 'SKILL.md'),
        '---\nname: nested-skill\n---\nContent',
        'utf-8',
      );

      const app = createApp();
      const res = await request(app).get('/api/skills/custom');
      expect(res.status).toBe(200);
      // Top-level is the source dir group
      expect(res.body.tree).toHaveLength(1);
      expect(res.body.tree[0].type).toBe('dir');
      // Inside the source group: 'category' dir
      expect(res.body.tree[0].children).toHaveLength(1);
      expect(res.body.tree[0].children[0].type).toBe('dir');
      expect(res.body.tree[0].children[0].name).toBe('category');
      expect(res.body.tree[0].children[0].children).toHaveLength(1);
      expect(res.body.tree[0].children[0].children[0].name).toBe('nested-skill');
    });
  });

  // -----------------------------------------------------------------------
  // POST /api/skills/custom/enable/*
  // -----------------------------------------------------------------------
  describe('POST /api/skills/custom/enable/*', () => {
    it('enables a skill by creating symlink', async () => {
      createSkill(customSkillDir, 'my-skill');
      const app = createApp();
      const res = await request(app).post('/api/skills/custom/enable/my-skill');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ ok: true, path: 'my-skill' });

      // Verify symlink exists
      const symlinkPath = path.join(claudeRootDir, 'skills', 'my-skill');
      expect(fs.lstatSync(symlinkPath).isSymbolicLink()).toBe(true);
    });

    it('returns 400 for empty path', async () => {
      const app = createApp();
      const res = await request(app).post('/api/skills/custom/enable/');
      // Express 5 treats empty wildcard as 404 or no match; check status
      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    it('returns 400 for path traversal', async () => {
      const app = createApp();
      const res = await request(app).post('/api/skills/custom/enable/..%2Fetc');
      expect(res.status).toBe(400);
      expect(res.body.error.message).toMatch(/path traversal/i);
    });

    it('returns 404 for non-existent skill', async () => {
      const app = createApp();
      const res = await request(app).post('/api/skills/custom/enable/nonexistent');
      expect(res.status).toBe(404);
    });

    it('idempotent — enabling twice succeeds', async () => {
      createSkill(customSkillDir, 'my-skill');
      const app = createApp();
      const res1 = await request(app).post('/api/skills/custom/enable/my-skill');
      expect(res1.status).toBe(200);
      const res2 = await request(app).post('/api/skills/custom/enable/my-skill');
      expect(res2.status).toBe(200);
    });
  });

  // -----------------------------------------------------------------------
  // POST /api/skills/custom/disable/*
  // -----------------------------------------------------------------------
  describe('POST /api/skills/custom/disable/*', () => {
    it('disables an enabled skill by removing symlink', async () => {
      createSkill(customSkillDir, 'my-skill');
      const app = createApp();
      // Enable first
      await request(app).post('/api/skills/custom/enable/my-skill');
      // Then disable
      const res = await request(app).post('/api/skills/custom/disable/my-skill');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ ok: true, path: 'my-skill' });

      // Verify symlink removed
      const symlinkPath = path.join(claudeRootDir, 'skills', 'my-skill');
      expect(fs.existsSync(symlinkPath)).toBe(false);
    });

    it('idempotent — disabling a non-enabled skill succeeds', async () => {
      createSkill(customSkillDir, 'my-skill');
      const app = createApp();
      const res = await request(app).post('/api/skills/custom/disable/my-skill');
      expect(res.status).toBe(200);
    });

    it('returns 400 for path traversal', async () => {
      const app = createApp();
      const res = await request(app).post('/api/skills/custom/disable/..%2Fsecret');
      expect(res.status).toBe(400);
    });
  });

  // -----------------------------------------------------------------------
  // POST /api/skills/custom/batch-enable
  // -----------------------------------------------------------------------
  describe('POST /api/skills/custom/batch-enable', () => {
    it('enables multiple skills', async () => {
      createSkill(customSkillDir, 'skill-a');
      createSkill(customSkillDir, 'skill-b');
      const app = createApp();
      const res = await request(app)
        .post('/api/skills/custom/batch-enable')
        .send({ paths: ['skill-a', 'skill-b'] });
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.succeeded).toBe(2);
      expect(res.body.failed).toHaveLength(0);
    });

    it('reports partial failures', async () => {
      createSkill(customSkillDir, 'skill-a');
      const app = createApp();
      const res = await request(app)
        .post('/api/skills/custom/batch-enable')
        .send({ paths: ['skill-a', 'nonexistent'] });
      expect(res.status).toBe(200);
      expect(res.body.succeeded).toBe(1);
      expect(res.body.failed).toHaveLength(1);
      expect(res.body.failed[0].path).toBe('nonexistent');
    });

    it('rejects non-array paths', async () => {
      const app = createApp();
      const res = await request(app)
        .post('/api/skills/custom/batch-enable')
        .send({ paths: 'not-an-array' });
      expect(res.status).toBe(400);
    });

    it('rejects empty array', async () => {
      const app = createApp();
      const res = await request(app)
        .post('/api/skills/custom/batch-enable')
        .send({ paths: [] });
      expect(res.status).toBe(400);
    });
  });

  // -----------------------------------------------------------------------
  // POST /api/skills/custom/batch-disable
  // -----------------------------------------------------------------------
  describe('POST /api/skills/custom/batch-disable', () => {
    it('disables multiple skills', async () => {
      createSkill(customSkillDir, 'skill-a');
      createSkill(customSkillDir, 'skill-b');
      const app = createApp();
      // Enable both first
      await request(app)
        .post('/api/skills/custom/batch-enable')
        .send({ paths: ['skill-a', 'skill-b'] });
      // Disable both
      const res = await request(app)
        .post('/api/skills/custom/batch-disable')
        .send({ paths: ['skill-a', 'skill-b'] });
      expect(res.status).toBe(200);
      expect(res.body.succeeded).toBe(2);
      expect(res.body.failed).toHaveLength(0);
    });
  });

  // -----------------------------------------------------------------------
  // DELETE /api/skills/custom/delete/*
  // -----------------------------------------------------------------------
  describe('DELETE /api/skills/custom/delete/*', () => {
    it('deletes a skill directory', async () => {
      createSkill(customSkillDir, 'doomed-skill');
      const skillPath = path.join(customSkillDir, 'doomed-skill');
      expect(fs.existsSync(skillPath)).toBe(true);

      const app = createApp();
      const res = await request(app).delete('/api/skills/custom/delete/doomed-skill');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ ok: true, path: 'doomed-skill' });
      expect(fs.existsSync(skillPath)).toBe(false);
    });

    it('returns 404 for non-existent skill', async () => {
      const app = createApp();
      const res = await request(app).delete('/api/skills/custom/delete/nonexistent');
      expect(res.status).toBe(404);
    });

    it('returns 400 for path traversal', async () => {
      const app = createApp();
      const res = await request(app).delete('/api/skills/custom/delete/..%2Fetc');
      expect(res.status).toBe(400);
    });
  });

  // -----------------------------------------------------------------------
  // GET /api/skills/summary
  // -----------------------------------------------------------------------
  describe('GET /api/skills/summary', () => {
    it('returns zero counts when no skills', async () => {
      const app = createApp();
      const res = await request(app).get('/api/skills/summary');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        customTotal: 0,
        customEnabled: 0,
        pluginTotal: 0,
        grandTotal: 0,
      });
    });

    it('counts custom skills and enabled state', async () => {
      createSkill(customSkillDir, 'skill-a');
      createSkill(customSkillDir, 'skill-b');
      const app = createApp();
      // Enable one skill
      await request(app).post('/api/skills/custom/enable/skill-a');

      const res = await request(app).get('/api/skills/summary');
      expect(res.status).toBe(200);
      expect(res.body.customTotal).toBe(2);
      expect(res.body.customEnabled).toBe(1);
      expect(res.body.grandTotal).toBe(2);
    });
  });

  // -----------------------------------------------------------------------
  // GET /api/analysis/:source/:name
  // -----------------------------------------------------------------------
  describe('GET /api/analysis/:source/:name', () => {
    it('returns null fields when no cached analysis', async () => {
      const app = createApp();
      const res = await request(app).get('/api/analysis/custom/my-skill');
      expect(res.status).toBe(200);
      expect(res.body.name).toBe('my-skill');
      expect(res.body.source).toBe('custom');
      expect(res.body.summary).toBeNull();
      expect(res.body.hash).toBeNull();
      expect(res.body.analyzedAt).toBeNull();
      expect(res.body.model).toBeNull();
    });

    it('returns cached analysis when available', async () => {
      // Write a cache file directly (cache is stored in ~/.skillpanel/)
      createSkill(customSkillDir, 'cached-skill');
      const cacheDir = path.join(os.homedir(), '.skillpanel');
      fs.mkdirSync(cacheDir, { recursive: true });
      const cacheData = {
        'custom/cached-skill:zh': {
          name: 'cached-skill',
          hash: 'abc123',
          summary: 'Test analysis summary',
          analyzedAt: new Date().toISOString(),
          model: 'test-model',
        },
      };
      fs.writeFileSync(
        path.join(cacheDir, 'analysis-cache.json'),
        JSON.stringify(cacheData),
        'utf-8',
      );

      const app = createApp();
      const res = await request(app).get('/api/analysis/custom/cached-skill');
      expect(res.status).toBe(200);
      expect(res.body.summary).toBe('Test analysis summary');
      expect(res.body.hash).toBe('abc123');
      expect(res.body.model).toBe('test-model');
    });
  });

  // -----------------------------------------------------------------------
  // Project API
  // -----------------------------------------------------------------------
  describe('Project API', () => {
    it('POST /api/projects — registers a project', async () => {
      const projectDir = createProjectDir(tmpRoot, 'test-project');
      const app = createApp();
      const res = await request(app)
        .post('/api/projects')
        .send({ path: projectDir });
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.project.name).toBe('test-project');
      expect(res.body.project.path).toBe(path.resolve(projectDir));
    });

    it('POST /api/projects — rejects invalid path', async () => {
      const app = createApp();
      const res = await request(app)
        .post('/api/projects')
        .send({ path: '' });
      expect(res.status).toBe(400);
    });

    it('POST /api/projects — rejects non-existent path', async () => {
      const app = createApp();
      const res = await request(app)
        .post('/api/projects')
        .send({ path: '/nonexistent/path' });
      expect(res.status).toBe(400);
    });

    it('POST /api/projects — rejects duplicate name', async () => {
      const projectDir = createProjectDir(tmpRoot, 'test-project');
      const app = createApp();
      await request(app).post('/api/projects').send({ path: projectDir });
      const res = await request(app)
        .post('/api/projects')
        .send({ path: projectDir });
      expect(res.status).toBe(409);
    });

    it('GET /api/projects — lists registered projects', async () => {
      const projectDir = createProjectDir(tmpRoot, 'test-project');
      const app = createApp();
      await request(app).post('/api/projects').send({ path: projectDir });
      const res = await request(app).get('/api/projects');
      expect(res.status).toBe(200);
      expect(res.body.projects).toHaveLength(1);
      expect(res.body.projects[0].name).toBe('test-project');
      expect(res.body.projects[0].path).toBe(path.resolve(projectDir));
      expect(typeof res.body.projects[0].globalEnabledCount).toBe('number');
      expect(typeof res.body.projects[0].projectEnabledCount).toBe('number');
    });

    it('DELETE /api/projects/:name — unregisters a project', async () => {
      const projectDir = createProjectDir(tmpRoot, 'test-project');
      const app = createApp();
      await request(app).post('/api/projects').send({ path: projectDir });
      const delRes = await request(app).delete('/api/projects/test-project');
      expect(delRes.status).toBe(200);
      // Verify project is gone
      const listRes = await request(app).get('/api/projects');
      expect(listRes.body.projects).toHaveLength(0);
    });

    it('DELETE /api/projects/:name — returns 404 for unknown', async () => {
      const app = createApp();
      const res = await request(app).delete('/api/projects/unknown');
      expect(res.status).toBe(404);
    });

    it('POST /api/projects/:name/skills/enable — enables skill for project', async () => {
      createSkill(customSkillDir, 'my-skill');
      const projectDir = createProjectDir(tmpRoot, 'test-project');
      const app = createApp();
      await request(app).post('/api/projects').send({ path: projectDir });
      const res = await request(app)
        .post('/api/projects/test-project/skills/enable/my-skill');
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      // Verify symlink exists in project's .claude/skills/
      const symlinkPath = path.join(projectDir, '.claude', 'skills', 'my-skill');
      expect(fs.lstatSync(symlinkPath).isSymbolicLink()).toBe(true);
    });

    it('POST /api/projects/:name/skills/disable — disables skill for project', async () => {
      createSkill(customSkillDir, 'my-skill');
      const projectDir = createProjectDir(tmpRoot, 'test-project');
      const app = createApp();
      await request(app).post('/api/projects').send({ path: projectDir });
      // Enable first
      await request(app).post('/api/projects/test-project/skills/enable/my-skill');
      // Then disable
      const res = await request(app)
        .post('/api/projects/test-project/skills/disable/my-skill');
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      // Verify symlink removed
      const symlinkPath = path.join(projectDir, '.claude', 'skills', 'my-skill');
      expect(fs.existsSync(symlinkPath)).toBe(false);
    });

    it('GET /api/projects/:name/skills — returns global and project skills', async () => {
      createSkill(customSkillDir, 'global-skill');
      createSkill(customSkillDir, 'project-skill');
      const projectDir = createProjectDir(tmpRoot, 'test-project');
      const app = createApp();
      await request(app).post('/api/projects').send({ path: projectDir });
      // Enable globally
      await request(app).post('/api/skills/custom/enable/global-skill');
      // Enable for project
      await request(app).post('/api/projects/test-project/skills/enable/project-skill');
      const res = await request(app).get('/api/projects/test-project/skills');
      expect(res.status).toBe(200);
      expect(res.body.globalSkills).toHaveLength(1);
      expect(res.body.globalSkills[0].name).toBe('global-skill');
      expect(res.body.projectSkills).toHaveLength(1);
      expect(res.body.projectSkills[0].name).toBe('project-skill');
    });

    it('GET /api/projects/:name/skills — returns 404 for unknown project', async () => {
      const app = createApp();
      const res = await request(app).get('/api/projects/unknown/skills');
      expect(res.status).toBe(404);
    });
  });

  // -----------------------------------------------------------------------
  // Global error middleware
  // -----------------------------------------------------------------------
  describe('Global error middleware', () => {
    it('returns 500 for unhandled errors', async () => {
      const app = createApp();
      // Force an unhandled error by requesting a skill enable with path traversal
      const res = await request(app).post('/api/skills/custom/enable/..%2F..%2F..%2Fetc%2Fpasswd');
      expect(res.status).toBe(400);
      expect(res.body.error.message).toMatch(/path traversal/i);
    });
  });
});
