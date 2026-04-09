const BASE = '/api';

export const fetchCustomSkills = () => fetch(`${BASE}/skills/custom`).then(r => r.json());

export const fetchPluginSkills = () => fetch(`${BASE}/skills/plugin`).then(r => r.json());

export const fetchSummary = () => fetch(`${BASE}/skills/summary`).then(r => r.json());

export const enableSkill = (skillPath: string) =>
  fetch(`${BASE}/skills/custom/enable/${skillPath}`, { method: 'POST' }).then(r => r.json());

export const disableSkill = (skillPath: string) =>
  fetch(`${BASE}/skills/custom/disable/${skillPath}`, { method: 'POST' }).then(r => r.json());

export const fetchAnalysis = (source: string, name: string) =>
  fetch(`${BASE}/analysis/${source}/${name}`).then(r => r.json());

export const triggerAnalysis = (source: string, name: string) =>
  fetch(`${BASE}/analysis/${source}/${name}`, { method: 'POST' }).then(r => r.json());

export const fetchConfig = () => fetch(`${BASE}/config`).then(r => r.json());

export const saveConfig = (config: any) =>
  fetch(`${BASE}/config`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  }).then(r => r.json());
