import type { TreeNode, PluginInfo, Summary, AnalysisResponse, AppConfig, AppConfigResponse, SearchResult, SearchResponse, ProjectInfo, ProjectSkillsResponse, SkillGroup, GroupedSkills } from '../types';

const BASE = '/api';

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  if (!res.ok) {
    let message = `HTTP ${res.status}: ${res.statusText}`;
    let code: string | undefined;
    try {
      const data = await res.json();
      if (data.error) {
        if (typeof data.error === 'string') {
          message = data.error;
        } else {
          message = data.error.message || message;
          code = data.error.code;
        }
      }
    } catch { /* response body not JSON, use default message */ }
    const err = new Error(message);
    (err as any).code = code;
    throw err;
  }
  const ct = res.headers.get('content-type') || '';
  if (!ct.includes('application/json')) {
    throw new Error(`Expected JSON but got ${ct || 'unknown content type'} from ${url}`);
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

export const fetchAnalysis = (source: string, name: string, lang?: string) =>
  apiFetch<AnalysisResponse>(`${BASE}/analysis/${source}/${name}${lang ? `?lang=${lang}` : ''}`);

export const triggerAnalysis = (source: string, name: string, lang?: string) =>
  apiFetch<AnalysisResponse>(`${BASE}/analysis/${source}/${name}${lang ? `?lang=${lang}` : ''}`, { method: 'POST' });

export const fetchConfig = () =>
  apiFetch<AppConfigResponse>(`${BASE}/config`);

export const saveConfig = (config: AppConfig) =>
  apiFetch<AppConfigResponse>(`${BASE}/config`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  });

export const detectApiConfig = (claudeRootDir: string) =>
  apiFetch<AppConfigResponse>(`${BASE}/config?detectDir=${encodeURIComponent(claudeRootDir)}`);

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

export const pickFolder = (title?: string) =>
  apiFetch<{ path: string | null }>(`${BASE}/fs/pick`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title }),
  });

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

export const fetchGroups = () =>
  apiFetch<GroupedSkills>(`${BASE}/groups`);

export interface SkillContentResponse {
  content: string;
  path: string;
}

export const fetchSkillContent = (skillPath: string) =>
  apiFetch<SkillContentResponse>(`${BASE}/skills/custom/content/${skillPath}`);

export const createGroup = (name: string, color: string) =>
  apiFetch<SkillGroup>(`${BASE}/groups`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, color }),
  });

export const updateGroup = (id: string, updates: { name?: string; color?: string }) =>
  apiFetch<SkillGroup>(`${BASE}/groups/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });

export const deleteGroup = (id: string) =>
  apiFetch<{ ok: boolean }>(`${BASE}/groups/${id}`, { method: 'DELETE' });

export const addGroupSkills = (groupId: string, skillPaths: string[]) =>
  apiFetch<SkillGroup>(`${BASE}/groups/${groupId}/skills`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ skillPaths }),
  });

export const removeGroupSkills = (groupId: string, skillPaths: string[]) =>
  apiFetch<SkillGroup>(`${BASE}/groups/${groupId}/skills`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ skillPaths }),
  });
