import fs from 'fs';
import { getRunningPid, readConfigPort, LOG_FILE } from '../daemon.js';

export function run() {
  const pid = getRunningPid();
  const port = readConfigPort();

  if (pid === null) {
    console.log('SkillPanel is not running');
    process.exit(0);
  }

  // Compute uptime
  let uptime = 'unknown';
  try {
    const stat = fs.readFileSync(`/proc/${pid}/stat`, 'utf-8');
    const startTime = parseInt(stat.split(' ')[21], 10) / 1000;
    // This only works on Linux; on macOS we show PID only
    uptime = 'running';
  } catch {
    uptime = 'running';
  }

  console.log(`SkillPanel is running`);
  console.log(`  PID:     ${pid}`);
  console.log(`  URL:     http://localhost:${port}`);
  console.log(`  Logs:    ${LOG_FILE}`);
}
