import type { TreeNode, PluginInfo, Summary, AnalysisResponse, AppConfig, AppConfigResponse, SearchResult, SearchResponse, ProjectInfo, ProjectSkillsResponse } from '../types';

const BASE = '/api';

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  if (!res.ok) {
    let message = `HTTP ${res.status}: ${res.statusText}`;
    try {
      const data = await res.json();
      if (data.error) message = typeof data.error === 'string' ? data.error : data.error.message || message;
    } catch { /* response body not JSON, use default message */ }
    throw new Error(message);
  }
  return (await res.json()) as T;
}

export const fetchCustomSkills = () =>
  apiFetch<{ tree: TreeNode[] }>(`${BASE}/skills/custom`);

export const fetchPluginSkills = () =>
  apiFetch<{ plugins: PluginInfo[] }>(`${BASE}/skills/plugin`);

export const fetchSummary = () =>
  apiFetch<Summary>(`${BASE}/skills/summary`);

export const enableSkill = (skillPath: string) =>
  apiFetch<{ ok: boolean; path: string }>(`${BASE}/skills/custom/enable/${skillPath}`, { method: 'POST' });

export const disableSkill = (skillPath: string) =>
  apiFetch<{ ok: boolean; path: string }>(`${BASE}/skills/custom/disable/${skillPath}`, { method: 'POST' });

export const deleteSkill = (skillPath: string) =>
  apiFetch<{ ok: boolean; path: string }>(`${BASE}/skills/custom/delete/${skillPath}`, { method: 'DELETE' });

export const fetchAnalysis = (source: string, name: string) =>
  apiFetch<AnalysisResponse>(`${BASE}/analysis/${source}/${name}`);

export const triggerAnalysis = (source: string, name: string) =>
  apiFetch<AnalysisResponse>(`${BASE}/analysis/${source}/${name}`, { method: 'POST' });

export const fetchConfig = () =>
  apiFetch<AppConfigResponse>(`${BASE}/config`);

export const saveConfig = (config: AppConfig) =>
  apiFetch<AppConfigResponse>(`${BASE}/config`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  });

export const checkPluginUpdate = (pluginName: string) =>
  apiFetch<{ hasUpdate: boolean; behindBy: number; currentCommit: string; isGitRepo?: boolean; error?: string }>(
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

export interface DirEntry {
  name: string;
  type: 'dir';
}

export interface BrowseResult {
  path: string;
  parent: string | null;
  entries: DirEntry[];
}

export const fetchDirList = (dirPath: string) =>
  apiFetch<BrowseResult>(`${BASE}/fs/browse?path=${encodeURIComponent(dirPath)}`);

export const fetchSkillSearch = (params: { q?: string; source?: string; enabled?: string }) => {
  const searchParams = new URLSearchParams();
  if (params.q) searchParams.set('q', params.q);
  if (params.source) searchParams.set('source', params.source);
  if (params.enabled) searchParams.set('enabled', params.enabled);
  return apiFetch<SearchResponse>(`${BASE}/skills/search?${searchParams.toString()}`);
};

export const fetchProjects = () =>
  apiFetch<{ projects: ProjectInfo[] }>(`${BASE}/projects`);

export const registerProject = (projectPath: string) =>
  apiFetch<{ ok: boolean; project: { name: string; path: string } }>(`${BASE}/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: projectPath }),
  });

export const unregisterProject = (name: string) =>
  apiFetch<{ ok: boolean }>(`${BASE}/projects/${name}`, { method: 'DELETE' });

export const fetchProjectSkills = (name: string) =>
  apiFetch<ProjectSkillsResponse>(`${BASE}/projects/${name}/skills`);

export const enableProjectSkill = (projectName: string, skillPath: string) =>
  apiFetch<{ ok: boolean; path: string }>(`${BASE}/projects/${projectName}/skills/enable/${skillPath}`, { method: 'POST' });

export const disableProjectSkill = (projectName: string, skillPath: string) =>
  apiFetch<{ ok: boolean; path: string }>(`${BASE}/projects/${projectName}/skills/disable/${skillPath}`, { method: 'POST' });

export const batchEnableProjectSkills = (projectName: string, paths: string[]) =>
  apiFetch<{ ok: boolean; succeeded: number; failed: Array<{ path: string; error: string }> }>(
    `${BASE}/projects/${projectName}/skills/batch-enable`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ paths }) },
  );

export const batchDisableProjectSkills = (projectName: string, paths: string[]) =>
  apiFetch<{ ok: boolean; succeeded: number; failed: Array<{ path: string; error: string }> }>(
    `${BASE}/projects/${projectName}/skills/batch-disable`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ paths }) },
  );
