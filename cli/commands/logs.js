import fs from 'fs';
import { LOG_FILE } from '../daemon.js';

export function run() {
  if (!fs.existsSync(LOG_FILE)) {
    console.log('No log file found. Start SkillPanel first.');
    process.exit(1);
  }

  // Output existing content
  const initial = fs.readFileSync(LOG_FILE, 'utf-8');
  if (initial) process.stdout.write(initial);

  // Tail new content
  let offset = initial.length;
  const watchInterval = setInterval(() => {
    try {
      const content = fs.readFileSync(LOG_FILE, 'utf-8');
      if (content.length > offset) {
        process.stdout.write(content.slice(offset));
        offset = content.length;
      }
    } catch { /* file might be rotated */ }
  }, 500);

  process.on('SIGINT', () => {
    clearInterval(watchInterval);
    process.exit(0);
  });
}
