import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export function computeContentHash(skillDir: string): string {
  const hash = crypto.createHash('md5');

  const skillMdPath = path.join(skillDir, 'SKILL.md');
  if (fs.existsSync(skillMdPath)) {
    hash.update(fs.readFileSync(skillMdPath));
  }

  const scriptsDir = path.join(skillDir, 'scripts');
  if (fs.existsSync(scriptsDir)) {
    const walkDir = (dir: string) => {
      const entries = fs.readdirSync(dir).sort();
      for (const entry of entries) {
        const fullPath = path.join(dir, entry);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          walkDir(fullPath);
        } else {
          hash.update(fs.readFileSync(fullPath));
        }
      }
    };
    walkDir(scriptsDir);
  }

  return hash.digest('hex');
}

export function collectSkillContent(skillDir: string): string {
  const parts: string[] = [];

  const skillMdPath = path.join(skillDir, 'SKILL.md');
  if (fs.existsSync(skillMdPath)) {
    parts.push(fs.readFileSync(skillMdPath, 'utf-8'));
  }

  const scriptsDir = path.join(skillDir, 'scripts');
  if (fs.existsSync(scriptsDir)) {
    const walkDir = (dir: string) => {
      const entries = fs.readdirSync(dir).sort();
      for (const entry of entries) {
        const fullPath = path.join(dir, entry);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          walkDir(fullPath);
        } else {
          const relPath = path.relative(scriptsDir, fullPath);
          const content = fs.readFileSync(fullPath, 'utf-8');
          parts.push(`\n--- ${relPath} ---\n${content}`);
        }
      }
    };
    walkDir(scriptsDir);
  }

  return parts.join('\n');
}
