#!/usr/bin/env node
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverPath = path.join(__dirname, 'server', 'index.ts');

// Resolve tsx from the package's own node_modules (not system PATH)
const tsxBin = path.join(__dirname, 'node_modules', '.bin', 'tsx');

const child = spawn(tsxBin, [serverPath], {
  stdio: 'inherit',
  env: { ...process.env },
  shell: process.platform === 'win32',
});

child.on('error', (err) => {
  console.error('Failed to start server:', err.message);
  process.exit(1);
});

child.on('exit', (code) => {
  process.exit(code ?? 1);
});

// Forward terminal signals to the server process
function relay(signal) {
  return () => child.kill(signal);
}
process.on('SIGINT', relay('SIGINT'));
process.on('SIGTERM', relay('SIGTERM'));
