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

export function useProjects() {
  const [projects, setProjects] = useState<ProjectInfo[]>([]);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [projectSkills, setProjectSkills] = useState<ProjectSkillsResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const loadProjects = useCallback(async () => {
    try {
      const data = await fetchProjects();
      setProjects(data.projects);
    } catch (err) {
      console.error('Failed to load projects:', err);
    }
  }, []);

  const loadProjectSkills = useCallback(async (name: string) => {
    setLoading(true);
    try {
      const data = await fetchProjectSkills(name);
      setProjectSkills(data);
    } catch (err) {
      console.error('Failed to load project skills:', err);
      setProjectSkills(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const addProject = useCallback(async (projectPath: string) => {
    await registerProject(projectPath);
    await loadProjects();
  }, [loadProjects]);

  const removeProject = useCallback(async (name: string) => {
    await unregisterProject(name);
    if (selectedProject === name) {
      setSelectedProject(null);
      setProjectSkills(null);
    }
    await loadProjects();
  }, [selectedProject, loadProjects]);

  const toggleProjectSkill = useCallback(async (skillPath: string, enable: boolean) => {
    if (!selectedProject) return;
    const fn = enable ? enableProjectSkill : disableProjectSkill;
    await fn(selectedProject, skillPath);
    await loadProjectSkills(selectedProject);
    await loadProjects();
  }, [selectedProject, loadProjectSkills, loadProjects]);

  return {
    projects,
    selectedProject,
    projectSkills,
    loading,
    loadProjects,
    loadProjectSkills,
    setSelectedProject,
    addProject,
    removeProject,
    toggleProjectSkill,
  };
}
