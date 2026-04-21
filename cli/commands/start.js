import { spawn } from 'child_process';
import fs from 'fs';
import {
  getServerPath, getTsxBin, isProduction, ensureRuntimeDir,
  writePid, getRunningPid, readConfigPort, LOG_FILE,
} from '../daemon.js';

export function run() {
  const existingPid = getRunningPid();
  if (existingPid !== null) {
    const port = readConfigPort();
    console.log(`SkillPanel is already running (PID ${existingPid}, http://localhost:${port})`);
    process.exit(0);
  }

  ensureRuntimeDir();

  // Clear previous log
  try { fs.truncateSync(LOG_FILE, 0); } catch { /* file may not exist */ }

  const logFd = fs.openSync(LOG_FILE, 'a');
  const serverPath = getServerPath();
  const tsxBin = getTsxBin();
  const env = { ...process.env };
  if (isProduction()) env.NODE_ENV = 'production';

  console.log('[skillpanel] Starting...');

  const child = spawn(tsxBin, [serverPath], {
    stdio: ['ignore', logFd, logFd],
    detached: true,
    env,
    shell: process.platform === 'win32',
  });

  const pid = child.pid;
  writePid(pid);
  child.unref();
  fs.closeSync(logFd);

  // Stream startup logs to terminal until "server started" or timeout
  const startTime = Date.now();
  const TIMEOUT = 10_000;
  let offset = 0;
  let started = false;

  const checkInterval = setInterval(() => {
    let content;
    try {
      content = fs.readFileSync(LOG_FILE, 'utf-8');
    } catch { return; }

    if (content.length > offset) {
      const newChunk = content.slice(offset);
      process.stdout.write(newChunk);
      offset = content.length;
    }

    if (content.includes('"server started"')) {
      started = true;
      const port = readConfigPort();
      console.log(`\n[skillpanel] Started (PID ${pid}, http://localhost:${port})`);
      console.log(`[skillpanel] Logs: ${LOG_FILE}`);
      clearInterval(checkInterval);
      process.exit(0);
    }

    if (Date.now() - startTime > TIMEOUT) {
      if (!started) {
        console.log(`\n[skillpanel] Timeout waiting for startup confirmation (PID ${pid})`);
        console.log(`[skillpanel] Check logs: ${LOG_FILE}`);
      }
      clearInterval(checkInterval);
      process.exit(started ? 0 : 1);
    }
  }, 200);

  // Check if child died immediately
  child.on('error', (err) => {
    clearInterval(checkInterval);
    console.error(`[skillpanel] Failed to start: ${err.message}`);
    process.exit(1);
  });
}
