import { Router } from 'express';
import { loadConfig } from '../config.js';
import { scanCustomSkills } from '../services/skill-scanner.js';
import { getOrCompute, invalidateByPrefix } from '../services/cache.js';
import {
  createGroup,
  updateGroup,
  deleteGroup,
  addSkills,
  removeSkills,
  getGroupedSkills,
} from '../services/group-manager.js';

const router = Router();

// Flatten tree to get all skill paths
function flattenSkillPaths(tree: any[]): string[] {
  const paths: string[] = [];
  function walk(nodes: any[]) {
    for (const node of nodes) {
      if (node.type === 'skill') {
        paths.push(node.path);
      } else if (node.children) {
        walk(node.children);
      }
    }
  }
  walk(tree);
  return paths;
}

// GET /api/groups
router.get('/groups', (_req, res) => {
  const config = loadConfig();
  const tree = getOrCompute('skills:custom', () => scanCustomSkills(config));
  const allPaths = flattenSkillPaths(tree);
  const result = getGroupedSkills(allPaths);
  res.json(result);
});

// POST /api/groups
router.post('/groups', async (req, res, next) => {
  try {
    const { name, color } = req.body;
    const group = await createGroup(name, color);
    invalidateByPrefix('skills:');
    res.status(201).json(group);
  } catch (err) {
    next(err);
  }
});

// PUT /api/groups/:id
router.put('/groups/:id', async (req, res, next) => {
  try {
    const group = await updateGroup(req.params.id, req.body);
    res.json(group);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/groups/:id
router.delete('/groups/:id', async (req, res, next) => {
  try {
    await deleteGroup(req.params.id);
    invalidateByPrefix('skills:');
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// POST /api/groups/:id/skills
router.post('/groups/:groupId/skills', async (req, res, next) => {
  try {
    const { skillPaths } = req.body;
    const group = await addSkills(req.params.groupId, skillPaths);
    invalidateByPrefix('skills:');
    res.json(group);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/groups/:groupId/skills
router.delete('/groups/:groupId/skills', async (req, res, next) => {
  try {
    const { skillPaths } = req.body;
    const group = await removeSkills(req.params.groupId, skillPaths);
    invalidateByPrefix('skills:');
    res.json(group);
  } catch (err) {
    next(err);
  }
});

export default router;
