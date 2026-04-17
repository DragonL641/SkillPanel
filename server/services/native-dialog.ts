import { execFile } from 'child_process';
import os from 'os';

const TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

function run(cmd: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { timeout: TIMEOUT_MS, windowsHide: true }, (err, stdout, stderr) => {
      if (err) {
        // macOS osascript returns exit code 1 when user cancels
        if (err.killed) reject(new Error('Dialog timed out'));
        else reject(err);
        return;
      }
      resolve(stdout.trim());
    });
  });
}

async function macPickFolder(title?: string): Promise<string | null> {
  // execFile 不走 shell，直接用 " 作为 AppleScript 字符串定界符
  // 转义 title 中的特殊字符防止 AppleScript 注入
  const safe = title?.replace(/\\/g, '\\\\').replace(/"/g, '\\"') ?? '';
  const prompt = safe ? `with prompt "${safe}"` : '';
  try {
    const out = await run('osascript', ['-e', `POSIX path of (choose folder ${prompt})`]);
    return out.replace(/\/$/, '') || null;
  } catch {
    return null; // user cancelled
  }
}

async function linuxPickFolder(title?: string): Promise<string | null> {
  const t = title ?? 'Select Folder';
  // Try zenity first
  try {
    const out = await run('zenity', ['--file-selection', '--directory', `--title=${t}`]);
    return out || null;
  } catch {
    // Try kdialog fallback
    try {
      const out = await run('kdialog', ['--getexistingdirectory', '.', title ?? 'Select Folder']);
      return out || null;
    } catch {
      return null;
    }
  }
}

async function winPickFolder(title?: string): Promise<string | null> {
  const t = (title ?? 'Select Folder').replace(/'/g, "''");
  const script = `
Add-Type -AssemblyName System.Windows.Forms
$fb = New-Object System.Windows.Forms.FolderBrowserDialog
$fb.Description = '${t}'
$fb.ShowNewFolderButton = $false
if ($fb.ShowDialog() -eq 'OK') { $fb.SelectedPath } else { '' }
`.trim();
  try {
    const out = await run('powershell', ['-NoProfile', '-NonInteractive', '-Command', script]);
    return out || null;
  } catch {
    return null;
  }
}

export async function pickFolder(title?: string): Promise<string | null> {
  const platform = os.platform();
  if (platform === 'darwin') return macPickFolder(title);
  if (platform === 'linux') return linuxPickFolder(title);
  if (platform === 'win32') return winPickFolder(title);
  return null;
}
