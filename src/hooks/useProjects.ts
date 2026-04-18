import { useState, useCallback } from 'react';
import {
  fetchProjects,
  registerProject,
  unregisterProject,
  fetchProjectSkills,
  enableProjectSkill,
  disableProjectSkill,
} from '../api/client';
import type { ProjectInfo, ProjectSkillsResponse } from '../types';
import { getErrorMessage } from '../utils/getErrorMessage';

export function useProjects() {
  const [projects, setProjects] = useState<ProjectInfo[]>([]);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [projectSkills, setProjectSkills] = useState<ProjectSkillsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const loadProjects = useCallback(async () => {
    try {
      const data = await fetchProjects();
      setProjects(data.projects);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }, []);

  const loadProjectSkills = useCallback(async (name: string) => {
    setLoading(true);
    try {
      const data = await fetchProjectSkills(name);
      setProjectSkills(data);
    } catch (err) {
      setError(getErrorMessage(err));
      setProjectSkills(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const addProject = useCallback(async (projectPath: string) => {
    try {
      await registerProject(projectPath);
      await loadProjects();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }, [loadProjects]);

  const removeProject = useCallback(async (name: string) => {
    try {
      await unregisterProject(name);
      if (selectedProject === name) {
        setSelectedProject(null);
        setProjectSkills(null);
      }
      await loadProjects();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }, [selectedProject, loadProjects]);

  const toggleProjectSkill = useCallback(async (skillPath: string, enable: boolean) => {
    if (!selectedProject) return;
    try {
      const fn = enable ? enableProjectSkill : disableProjectSkill;
      await fn(selectedProject, skillPath);
      await loadProjectSkills(selectedProject);
      await loadProjects();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }, [selectedProject, loadProjectSkills, loadProjects]);

  return {
    projects,
    selectedProject,
    projectSkills,
    loading,
    error,
    clearError,
    loadProjects,
    loadProjectSkills,
    setSelectedProject,
    addProject,
    removeProject,
    toggleProjectSkill,
  };
}
