const BASE = '/api';

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data as T;
}

export const fetchCustomSkills = () =>
  apiFetch<{ tree: any[] }>(`${BASE}/skills/custom`);

export const fetchPluginSkills = () =>
  apiFetch<{ plugins: any[] }>(`${BASE}/skills/plugin`);

export const fetchSummary = () =>
  apiFetch<any>(`${BASE}/skills/summary`);

export const enableSkill = (skillPath: string) =>
  apiFetch<any>(`${BASE}/skills/custom/enable/${skillPath}`, { method: 'POST' });

export const disableSkill = (skillPath: string) =>
  apiFetch<any>(`${BASE}/skills/custom/disable/${skillPath}`, { method: 'POST' });

export const fetchAnalysis = (source: string, name: string) =>
  apiFetch<any>(`${BASE}/analysis/${source}/${name}`);

export const triggerAnalysis = (source: string, name: string) =>
  apiFetch<any>(`${BASE}/analysis/${source}/${name}`, { method: 'POST' });

export const fetchConfig = () =>
  apiFetch<any>(`${BASE}/config`);

export const saveConfig = (config: any) =>
  apiFetch<any>(`${BASE}/config`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  });

export const checkPluginUpdate = (pluginName: string) =>
  apiFetch<{ hasUpdate: boolean; behindBy: number; currentCommit: string; error?: string }>(
    `${BASE}/plugins/check-update/${pluginName}`,
    { method: 'POST' },
  );

export const batchEnableSkills = (paths: string[]) =>
  apiFetch<{ ok: boolean; succeeded: number; failed: Array<{ path: string; error: string }> }>(
    `${BASE}/skills/custom/batch-enable`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paths }),
    },
  );

export const batchDisableSkills = (paths: string[]) =>
  apiFetch<{ ok: boolean; succeeded: number; failed: Array<{ path: string; error: string }> }>(
    `${BASE}/skills/custom/batch-disable`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paths }),
    },
  );
