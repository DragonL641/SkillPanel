import { Router } from 'express';
import { scanCustomSkills } from '../services/skill-scanner.js';
import { scanPlugins } from '../services/plugin-scanner.js';
import { getOrCompute } from '../services/cache.js';

const router = Router();

function countSkillsInTree(nodes: any[]): { total: number; enabled: number } {
  let total = 0;
  let enabled = 0;
  for (const node of nodes) {
    if (node.type === 'skill') {
      total++;
      if (node.skill?.enabled) enabled++;
    } else if (node.children) {
      const sub = countSkillsInTree(node.children);
      total += sub.total;
      enabled += sub.enabled;
    }
  }
  return { total, enabled };
}

router.get('/skills/summary', (_req, res) => {
  const tree = getOrCompute('custom-skills', () => scanCustomSkills());
  const plugins = getOrCompute('plugin-skills', () => scanPlugins());
  const custom = countSkillsInTree(tree);
  const pluginTotal = plugins.reduce((sum, p) => sum + p.skills.length, 0);

  res.json({
    customTotal: custom.total,
    customEnabled: custom.enabled,
    pluginTotal,
    grandTotal: custom.total + pluginTotal,
  });
});

export default router;
