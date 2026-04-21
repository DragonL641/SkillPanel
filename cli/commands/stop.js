import { getRunningPid, removePid } from '../daemon.js';

export function run() {
  const pid = getRunningPid();
  if (pid === null) {
    console.log('SkillPanel is not running');
    process.exit(0);
  }

  console.log(`[skillpanel] Stopping (PID ${pid})...`);

  try {
    process.kill(pid, 'SIGTERM');
  } catch {
    removePid();
    console.log('SkillPanel is not running (stale PID file removed)');
    process.exit(0);
  }

  // Wait up to 5s for process to exit
  const startTime = Date.now();
  const checkInterval = setInterval(() => {
    try {
      process.kill(pid, 0);
      if (Date.now() - startTime > 5000) {
        clearInterval(checkInterval);
        // Force kill
        try { process.kill(pid, 'SIGKILL'); } catch { /* already dead */ }
        removePid();
        console.log('[skillpanel] Force stopped');
        process.exit(0);
      }
    } catch {
      clearInterval(checkInterval);
      removePid();
      console.log('[skillpanel] Stopped');
      process.exit(0);
    }
  }, 200);
}
