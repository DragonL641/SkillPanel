#!/usr/bin/env node
import { fileURLToPath } from 'url';

const COMMANDS = {
  start: './cli/commands/start.js',
  stop: './cli/commands/stop.js',
  status: './cli/commands/status.js',
  serve: './cli/commands/serve.js',
  logs: './cli/commands/logs.js',
  open: './cli/commands/open.js',
};

const HELP = `
Usage: skillpanel <command>

Commands:
  (none)  Open SkillPanel in browser (start if needed) (default)
  start   Start SkillPanel in background
  stop    Stop background process
  status  Show running status
  serve   Run in foreground (for development)
  logs    Tail application logs
  open    Open SkillPanel in browser (start if needed)
`;

async function main() {
  const command = process.argv[2] || 'open';

  if (command === '--help' || command === '-h') {
    console.log(HELP.trim());
    process.exit(0);
  }

  const modulePath = COMMANDS[command];
  if (!modulePath) {
    console.error(`Unknown command: ${command}`);
    console.log(HELP.trim());
    process.exit(1);
  }

  const __dirname = fileURLToPath(new URL('.', import.meta.url));
  const mod = await import(new URL(modulePath, `file://${__dirname}`).href);
  mod.run();
}

main();
