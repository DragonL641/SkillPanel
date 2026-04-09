#!/usr/bin/env node
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverPath = path.join(__dirname, 'server', 'index.ts');

try {
  execFileSync('npx', ['tsx', serverPath], { stdio: 'inherit' });
} catch (e) {
  process.exit(e.status || 1);
}
