import { useState, useEffect } from 'react';
import { Project, ProjectFormData } from '@/types/project';

const STORAGE_KEY = 'tap-projects';

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = () => {
    try {
      const storedProjects = localStorage.getItem(STORAGE_KEY);
      if (storedProjects) {
        setProjects(JSON.parse(storedProjects));
      }
    } catch (error) {
      console.error('Erro ao carregar projetos:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveProjects = (newProjects: Project[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newProjects));
      setProjects(newProjects);
    } catch (error) {
      console.error('Erro ao salvar projetos:', error);
    }
  };

  const createProject = (projectData: ProjectFormData): Project => {
    const newProject: Project = {
      ...projectData,
      id: generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    const updatedProjects = [...projects, newProject];
    saveProjects(updatedProjects);
    return newProject;
  };

  const updateProject = (id: string, projectData: Partial<ProjectFormData>): Project | null => {
    const projectIndex = projects.findIndex(p => p.id === id);
    if (projectIndex === -1) return null;

    const updatedProject = {
      ...projects[projectIndex],
      ...projectData,
      updatedAt: new Date().toISOString(),
    };

    const updatedProjects = [...projects];
    updatedProjects[projectIndex] = updatedProject;
    saveProjects(updatedProjects);
    return updatedProject;
  };

  const deleteProject = (id: string): boolean => {
    const updatedProjects = projects.filter(p => p.id !== id);
    saveProjects(updatedProjects);
    return true;
  };

  const getProject = (id: string): Project | null => {
    return projects.find(p => p.id === id) || null;
  };

  return {
    projects,
    loading,
    createProject,
    updateProject,
    deleteProject,
    getProject,
  };
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}