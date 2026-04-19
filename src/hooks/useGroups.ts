import { useState, useCallback } from 'react';
import {
  fetchGroups as apiFetchGroups,
  createGroup as apiCreateGroup,
  updateGroup as apiUpdateGroup,
  deleteGroup as apiDeleteGroup,
  addGroupSkills as apiAddGroupSkills,
  removeGroupSkills as apiRemoveGroupSkills,
} from '../api/client';
import type { GroupedSkills, SkillGroup } from '../types';

export function useGroups() {
  const [groupedSkills, setGroupedSkills] = useState<GroupedSkills | null>(null);
  const [loading, setLoading] = useState(false);

  const loadGroups = useCallback(async (force = false) => {
    if (!force && groupedSkills) return;
    setLoading(true);
    try {
      const data = await apiFetchGroups();
      setGroupedSkills(data);
    } finally {
      setLoading(false);
    }
  }, [groupedSkills]);

  const createGroup = useCallback(async (name: string, color: string) => {
    const group = await apiCreateGroup(name, color);
    const data = await apiFetchGroups();
    setGroupedSkills(data);
    return group;
  }, []);

  const updateGroup = useCallback(async (id: string, updates: { name?: string; color?: string }) => {
    const group = await apiUpdateGroup(id, updates);
    const data = await apiFetchGroups();
    setGroupedSkills(data);
    return group;
  }, []);

  const deleteGroup = useCallback(async (id: string) => {
    await apiDeleteGroup(id);
    const data = await apiFetchGroups();
    setGroupedSkills(data);
  }, []);

  const addSkills = useCallback(async (groupId: string, skillPaths: string[]) => {
    const group = await apiAddGroupSkills(groupId, skillPaths);
    const data = await apiFetchGroups();
    setGroupedSkills(data);
    return group;
  }, []);

  const removeSkills = useCallback(async (groupId: string, skillPaths: string[]) => {
    const group = await apiRemoveGroupSkills(groupId, skillPaths);
    const data = await apiFetchGroups();
    setGroupedSkills(data);
    return group;
  }, []);

  return {
    groupedSkills, loading,
    loadGroups, createGroup, updateGroup, deleteGroup, addSkills, removeSkills,
  };
}
