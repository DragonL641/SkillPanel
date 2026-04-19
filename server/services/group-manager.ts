import { loadConfig, saveConfig, type SkillGroup } from '../config.js';
import { ConflictError, NotFoundError, ValidationError } from '../errors.js';
import { invalidateByPrefix } from './cache.js';

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function ensureUniqueSlug(groups: SkillGroup[], base: string, excludeId?: string): string {
  let slug = base;
  let i = 1;
  const existing = new Set(groups.filter(g => g.id !== excludeId).map(g => g.id));
  while (existing.has(slug)) {
    slug = `${base}-${i++}`;
  }
  return slug;
}

export async function createGroup(name: string, color: string): Promise<SkillGroup> {
  if (!name || !name.trim()) throw new ValidationError('Group name is required');
  if (!color) throw new ValidationError('Group color is required');

  const config = loadConfig();
  const groups = config.groups || [];

  if (groups.some(g => g.name.toLowerCase() === name.toLowerCase())) {
    throw new ConflictError(`Group "${name}" already exists`);
  }

  const id = ensureUniqueSlug(groups, slugify(name));
  const group: SkillGroup = { id, name: name.trim(), color, skills: [] };

  await saveConfig({ groups: [...groups, group] });
  invalidateByPrefix('groups');
  return group;
}

export async function updateGroup(id: string, updates: { name?: string; color?: string }): Promise<SkillGroup> {
  const config = loadConfig();
  const groups = config.groups || [];
  const idx = groups.findIndex(g => g.id === id);
  if (idx === -1) throw new NotFoundError(`Group "${id}" not found`);

  if (updates.name !== undefined) {
    if (!updates.name.trim()) throw new ValidationError('Group name is required');
    if (groups.some(g => g.id !== id && g.name.toLowerCase() === updates.name!.toLowerCase())) {
      throw new ConflictError(`Group "${updates.name}" already exists`);
    }
  }

  const updated = { ...groups[idx], ...updates };
  if (updates.name) updated.name = updates.name.trim();
  groups[idx] = updated;

  await saveConfig({ groups });
  invalidateByPrefix('groups');
  return updated;
}

export async function deleteGroup(id: string): Promise<void> {
  const config = loadConfig();
  const groups = config.groups || [];
  const idx = groups.findIndex(g => g.id === id);
  if (idx === -1) throw new NotFoundError(`Group "${id}" not found`);

  groups.splice(idx, 1);
  await saveConfig({ groups });
  invalidateByPrefix('groups');
}

export async function addSkills(groupId: string, skillPaths: string[]): Promise<SkillGroup> {
  if (!skillPaths || skillPaths.length === 0) throw new ValidationError('skillPaths is required');

  const config = loadConfig();
  const groups = config.groups || [];
  const idx = groups.findIndex(g => g.id === groupId);
  if (idx === -1) throw new NotFoundError(`Group "${groupId}" not found`);

  // Remove skills from other groups first (single-group constraint)
  for (const g of groups) {
    g.skills = g.skills.filter(s => !skillPaths.includes(s));
  }

  // Add to target group (deduplicate)
  const existing = new Set(groups[idx].skills);
  for (const p of skillPaths) {
    if (!existing.has(p)) {
      groups[idx].skills.push(p);
      existing.add(p);
    }
  }

  await saveConfig({ groups });
  invalidateByPrefix('groups');
  return groups[idx];
}

export async function removeSkills(groupId: string, skillPaths: string[]): Promise<SkillGroup> {
  if (!skillPaths || skillPaths.length === 0) throw new ValidationError('skillPaths is required');

  const config = loadConfig();
  const groups = config.groups || [];
  const idx = groups.findIndex(g => g.id === groupId);
  if (idx === -1) throw new NotFoundError(`Group "${groupId}" not found`);

  groups[idx].skills = groups[idx].skills.filter(s => !skillPaths.includes(s));

  await saveConfig({ groups });
  invalidateByPrefix('groups');
  return groups[idx];
}

export interface GroupedSkills {
  groups: SkillGroup[];
  other: {
    name: string;
    color: string;
    skills: string[];
  };
}

export function getGroupedSkills(allSkillPaths: string[]): GroupedSkills {
  const config = loadConfig();
  const groups = config.groups || [];

  // Collect all assigned skill paths
  const assigned = new Set<string>();
  for (const g of groups) {
    for (const s of g.skills) {
      assigned.add(s);
    }
  }

  // Unassigned skills go to "Other"
  const otherSkills = allSkillPaths.filter(p => !assigned.has(p));

  return {
    groups,
    other: {
      name: 'Other',
      color: '#888888',
      skills: otherSkills,
    },
  };
}
