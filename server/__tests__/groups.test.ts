import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import request from 'supertest';
import { createApp } from './app.js';
import { invalidateByPrefix } from '../services/cache.js';

const CONFIG_FILE = path.join(process.cwd(), 'skillpanel.config.json');

function setupConfig() {
  const tmpRoot = path.join(os.tmpdir(), `skillpanel-groups-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const customSkillDir = path.join(tmpRoot, 'skills');
  const claudeRootDir = path.join(tmpRoot, 'claude');
  fs.mkdirSync(customSkillDir, { recursive: true });
  fs.mkdirSync(path.join(claudeRootDir, 'skills'), { recursive: true });

  // Create some skill directories with SKILL.md
  const skills = ['pdf', 'pptx', 'docx', 'blog-writer', 'article-review'];
  for (const s of skills) {
    const skillDir = path.join(customSkillDir, s);
    fs.mkdirSync(skillDir, { recursive: true });
    fs.writeFileSync(path.join(skillDir, 'SKILL.md'), `---\nname: ${s}\ndescription: Test skill ${s}\n---\nContent`);
  }

  fs.writeFileSync(
    CONFIG_FILE,
    JSON.stringify({
      claudeRootDir,
      customSkillDirs: [customSkillDir],
      port: 3210,
      projects: [],
      groups: [],
    }),
    'utf-8',
  );
  // Clear all caches thoroughly
  invalidateByPrefix('config');
  invalidateByPrefix('skills:');
  invalidateByPrefix('groups');
  return tmpRoot;
}

describe('Groups API', () => {
  let app: ReturnType<typeof createApp>;
  let tmpRoot: string;

  beforeEach(() => {
    tmpRoot = setupConfig();
    app = createApp();
  });

  afterEach(() => {
    invalidateByPrefix('config');
    invalidateByPrefix('skills:');
    invalidateByPrefix('groups');
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  });

  describe('GET /api/groups', () => {
    it('returns empty groups with all skills in Other', async () => {
      const res = await request(app).get('/api/groups');
      expect(res.status).toBe(200);
      expect(res.body.groups).toEqual([]);
      expect(res.body.other.name).toBe('Other');
      expect(res.body.other.skills.length).toBe(5);
    });
  });

  describe('POST /api/groups', () => {
    it('creates a new group', async () => {
      const res = await request(app)
        .post('/api/groups')
        .send({ name: 'Dev Tools', color: '#4A9FD8' });
      expect(res.status).toBe(201);
      expect(res.body.name).toBe('Dev Tools');
      expect(res.body.color).toBe('#4A9FD8');
      expect(res.body.id).toBe('dev-tools');
      expect(res.body.skills).toEqual([]);
    });

    it('rejects empty name', async () => {
      const res = await request(app)
        .post('/api/groups')
        .send({ name: '', color: '#4A9FD8' });
      expect(res.status).toBe(400);
    });

    it('rejects duplicate name', async () => {
      const r1 = await request(app).post('/api/groups').send({ name: 'Dev Tools', color: '#4A9FD8' });
      expect(r1.status).toBe(201);
      const res = await request(app)
        .post('/api/groups')
        .send({ name: 'Dev Tools', color: '#FF0000' });
      expect(res.status).toBe(409);
    });
  });

  describe('PUT /api/groups/:id', () => {
    it('renames a group', async () => {
      const r1 = await request(app).post('/api/groups').send({ name: 'Dev Tools', color: '#4A9FD8' });
      expect(r1.status).toBe(201);
      const res = await request(app)
        .put('/api/groups/dev-tools')
        .send({ name: 'Developer Tools' });
      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Developer Tools');
    });

    it('changes color', async () => {
      await request(app).post('/api/groups').send({ name: 'Dev Tools', color: '#4A9FD8' });
      const res = await request(app)
        .put('/api/groups/dev-tools')
        .send({ color: '#FF0000' });
      expect(res.status).toBe(200);
      expect(res.body.color).toBe('#FF0000');
    });

    it('returns 404 for non-existent group', async () => {
      const res = await request(app)
        .put('/api/groups/non-existent')
        .send({ name: 'Test' });
      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/groups/:id', () => {
    it('deletes a group', async () => {
      await request(app).post('/api/groups').send({ name: 'Dev Tools', color: '#4A9FD8' });
      const res = await request(app).delete('/api/groups/dev-tools');
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
    });

    it('returns 404 for non-existent group', async () => {
      const res = await request(app).delete('/api/groups/non-existent');
      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/groups/:groupId/skills', () => {
    it('adds skills to a group', async () => {
      await request(app).post('/api/groups').send({ name: 'Dev Tools', color: '#4A9FD8' });
      const res = await request(app)
        .post('/api/groups/dev-tools/skills')
        .send({ skillPaths: ['pdf', 'pptx'] });
      expect(res.status).toBe(200);
      expect(res.body.skills).toContain('pdf');
      expect(res.body.skills).toContain('pptx');
    });

    it('moves skills from another group (single-group constraint)', async () => {
      await request(app).post('/api/groups').send({ name: 'Dev Tools', color: '#4A9FD8' });
      await request(app).post('/api/groups').send({ name: 'Content', color: '#F59E0B' });

      // Add pdf to Dev Tools
      await request(app)
        .post('/api/groups/dev-tools/skills')
        .send({ skillPaths: ['pdf'] });

      // Move pdf to Content
      const res = await request(app)
        .post('/api/groups/content/skills')
        .send({ skillPaths: ['pdf'] });

      expect(res.status).toBe(200);
      expect(res.body.skills).toContain('pdf');

      // Verify pdf removed from Dev Tools
      const groupsRes = await request(app).get('/api/groups');
      const devTools = groupsRes.body.groups.find((g: any) => g.id === 'dev-tools');
      expect(devTools.skills).not.toContain('pdf');
    });
  });

  describe('DELETE /api/groups/:groupId/skills', () => {
    it('removes skills from a group', async () => {
      await request(app).post('/api/groups').send({ name: 'Dev Tools', color: '#4A9FD8' });
      await request(app)
        .post('/api/groups/dev-tools/skills')
        .send({ skillPaths: ['pdf', 'pptx'] });

      const res = await request(app)
        .delete('/api/groups/dev-tools/skills')
        .send({ skillPaths: ['pdf'] });
      expect(res.status).toBe(200);
      expect(res.body.skills).not.toContain('pdf');
      expect(res.body.skills).toContain('pptx');
    });
  });
});
