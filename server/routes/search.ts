import { Router } from 'express';
import { loadConfig } from '../config.js';
import { scanCustomSkills } from '../services/skill-scanner.js';
import { scanPlugins } from '../services/plugin-scanner.js';
import { getOrCompute } from '../services/cache.js';

const router = Router();

interface FlatSkill {
  name: string;
  source: 'custom' | 'plugin';
  description: string;
  enabled: boolean;
  path: string;
  hash: string;
}

function flattenTree(nodes: import('../services/skill-scanner.js').TreeNode[]): FlatSkill[] {
  const result: FlatSkill[] = [];
  for (const node of nodes) {
    if (node.type === 'skill' && node.skill) {
      result.push({
        name: node.skill.name,
        source: 'custom',
        description: node.skill.description,
        enabled: node.skill.enabled,
        path: node.path,
        hash: node.skill.hash,
      });
    }
    if (node.children) result.push(...flattenTree(node.children));
  }
  return result;
}

function flattenPlugins(plugins: import('../services/plugin-scanner.js').PluginInfo[]): FlatSkill[] {
  const result: FlatSkill[] = [];
  for (const plugin of plugins) {
    for (const skill of plugin.skills) {
      result.push({
        name: skill.name,
        source: 'plugin',
        description: skill.description,
        enabled: true,
        path: skill.path,
        hash: '',
      });
    }
  }
  return result;
}

router.get('/skills/search', (req, res) => {
  const config = loadConfig();
  const tree = getOrCompute('skills:custom', () => scanCustomSkills(config));
  const plugins = getOrCompute('skills:plugins', () => scanPlugins(config));

  const source = req.query.source as string | undefined;
  const q = (req.query.q as string || '').toLowerCase().trim();
  const enabledParam = req.query.enabled as string | undefined;

  let skills: FlatSkill[] = [];

  if (!source || source === 'all' || source === 'custom') {
    skills.push(...flattenTree(tree));
  }
  if (!source || source === 'all' || source === 'plugin') {
    skills.push(...flattenPlugins(plugins));
  }

  // Filter by keyword
  if (q) {
    skills = skills.filter(s =>
      s.name.toLowerCase().includes(q) ||
      s.description.toLowerCase().includes(q) ||
      s.path.toLowerCase().includes(q)
    );
  }

  // Filter by enabled status
  if (enabledParam === 'true') {
    skills = skills.filter(s => s.enabled);
  } else if (enabledParam === 'false') {
    skills = skills.filter(s => !s.enabled);
  }

  res.json({ results: skills, total: skills.length, query: { q: q || null, source: source || null, enabled: enabledParam || null } });
});

export default router;
