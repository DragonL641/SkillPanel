import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.join(__dirname, '..');

export const RUNTIME_DIR = path.join(os.homedir(), '.skillpanel');
export const PID_FILE = path.join(RUNTIME_DIR, 'skillpanel.pid');
export const LOG_FILE = path.join(RUNTIME_DIR, 'skillpanel.log');

export function getServerPath() {
  return path.join(PROJECT_ROOT, 'server', 'index.ts');
}

export function getTsxBin() {
  return path.join(PROJECT_ROOT, 'node_modules', '.bin', 'tsx');
}

export function isProduction() {
  return fs.existsSync(path.join(PROJECT_ROOT, 'dist'));
}

export function ensureRuntimeDir() {
  if (!fs.existsSync(RUNTIME_DIR)) {
    fs.mkdirSync(RUNTIME_DIR, { recursive: true });
  }
}

export function readPid() {
  try {
    if (!fs.existsSync(PID_FILE)) return null;
    const pid = parseInt(fs.readFileSync(PID_FILE, 'utf-8').trim(), 10);
    return Number.isNaN(pid) ? null : pid;
  } catch {
    return null;
  }
}

export function writePid(pid) {
  ensureRuntimeDir();
  fs.writeFileSync(PID_FILE, String(pid));
}

export function removePid() {
  try { fs.unlinkSync(PID_FILE); } catch { /* ignore */ }
}

export function isProcessAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

export function getRunningPid() {
  const pid = readPid();
  if (pid === null) return null;
  if (isProcessAlive(pid)) return pid;
  removePid();
  return null;
}

export function readConfigPort() {
  try {
    const configPath = path.join(PROJECT_ROOT, 'skillpanel.config.json');
    if (!fs.existsSync(configPath)) return 3210;
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    return config.port || 3210;
  } catch {
    return 3210;
  }
}
