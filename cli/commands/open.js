import { spawn } from 'child_process';
import fs from 'fs';
import open from 'open';
import {
  getServerPath, getTsxBin, isProduction, ensureRuntimeDir,
  writePid, getRunningPid, readConfigPort, LOG_FILE,
} from '../daemon.js';

const START_TIMEOUT = 10_000;
const HEALTH_TIMEOUT = 5_000;

async function checkReady(port) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), HEALTH_TIMEOUT);
  try {
    const [healthRes, rootRes] = await Promise.all([
      fetch(`http://localhost:${port}/api/health`, { signal: controller.signal }),
      fetch(`http://localhost:${port}/`, { signal: controller.signal }),
    ]);
    clearTimeout(timer);
    return healthRes.ok && rootRes.ok;
  } catch {
    clearTimeout(timer);
    return false;
  }
}

function waitForStartup(port, shouldAbort) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    let offset = 0;

    const interval = setInterval(async () => {
      if (shouldAbort && shouldAbort()) {
        clearInterval(interval);
        resolve(false);
        return;
      }

      if (await checkReady(port)) {
        clearInterval(interval);
        resolve(true);
        return;
      }

      let content;
      try { content = fs.readFileSync(LOG_FILE, 'utf-8'); } catch { /* ignore */ }
      if (content && content.length > offset) {
        process.stdout.write(content.slice(offset));
        offset = content.length;
      }

      if (Date.now() - startTime > START_TIMEOUT) {
        clearInterval(interval);
        resolve(false);
      }
    }, 300);
  });
}

export async function run() {
  const port = readConfigPort();
  const url = `http://localhost:${port}`;
  const existingPid = getRunningPid();

  if (existingPid !== null) {
    console.log(`[skillpanel] Already running (PID ${existingPid}), checking readiness...`);
    const ready = await checkReady(port);
    if (ready) {
      console.log(`[skillpanel] Opening ${url}`);
      await open(url);
      process.exit(0);
    }
    console.log('[skillpanel] Server not ready, waiting...');
    const started = await waitForStartup(port);
    if (started) {
      console.log(`\n[skillpanel] Opening ${url}`);
    } else {
      console.log('\n[skillpanel] Timeout waiting for server');
    }
    await open(url);
    process.exit(0);
  }

  let exited = false;

  ensureRuntimeDir();
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

  child.on('error', (err) => {
    console.error(`[skillpanel] Failed to start: ${err.message}`);
    process.exit(1);
  });

  child.on('exit', () => { exited = true; });

  const started = await waitForStartup(port, () => exited);

  if (started) {
    console.log(`\n[skillpanel] Started (PID ${pid})`);
    console.log(`[skillpanel] Opening ${url}`);
    await open(url);
    process.exit(0);
  } else {
    console.log(`\n[skillpanel] Timeout waiting for startup (PID ${pid})`);
    console.log(`[skillpanel] Logs: ${LOG_FILE}`);
    process.exit(1);
  }
}
