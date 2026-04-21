import { spawn } from 'child_process';
import { getServerPath, getTsxBin, isProduction } from '../daemon.js';

export function run() {
  const serverPath = getServerPath();
  const tsxBin = getTsxBin();
  const env = { ...process.env };
  if (isProduction()) env.NODE_ENV = 'production';

  const child = spawn(tsxBin, [serverPath], {
    stdio: 'inherit',
    env,
    shell: process.platform === 'win32',
  });

  child.on('error', (err) => {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  });

  child.on('exit', (code) => {
    process.exit(code ?? 1);
  });

  function relay(signal) {
    return () => child.kill(signal);
  }
  process.on('SIGINT', relay('SIGINT'));
  process.on('SIGTERM', relay('SIGTERM'));
}
