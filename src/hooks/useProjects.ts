import { useState, useEffect } from 'react';
import { Project, ProjectFormData } from '@/types/project';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useProjects(folderId?: string) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      loadProjects();

      // Real-time subscriptions para projects
      let filter = `user_id=eq.${user.id}`;
      if (folderId) {
        filter += `.folder_id=eq.${folderId}`;
      }

      const channel = supabase
        .channel('projects-realtime')
        .on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'projects', 
          filter 
        }, (payload) => {
          const project = payload.new as Project;
          const convertedProject: Project = {
            ...project,
            criticidade: project.criticidade as 'Baixa' | 'Média' | 'Alta' | 'Crítica'
          };
          setProjects((prev) => [convertedProject, ...prev.filter((p) => p.id !== convertedProject.id)]);
        })
        .on('postgres_changes', { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'projects', 
          filter 
        }, (payload) => {
          const project = payload.new as Project;
          const convertedProject: Project = {
            ...project,
            criticidade: project.criticidade as 'Baixa' | 'Média' | 'Alta' | 'Crítica'
          };
          setProjects((prev) => prev.map((p) => (p.id === convertedProject.id ? convertedProject : p)));
        })
        .on('postgres_changes', { 
          event: 'DELETE', 
          schema: 'public', 
          table: 'projects', 
          filter 
        }, (payload) => {
          const project = payload.old as Project;
          setProjects((prev) => prev.filter((p) => p.id !== project.id));
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user, folderId]);

  const loadProjects = async () => {
    try {
      let query = supabase
        .from('projects')
        .select('*')
        .eq('user_id', user?.id);

      if (folderId) {
        query = query.eq('folder_id', folderId);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      // Converter dados do banco para o tipo Project
      const convertedProjects: Project[] = (data || []).map(project => ({
        ...project,
        criticidade: project.criticidade as 'Baixa' | 'Média' | 'Alta' | 'Crítica'
      }));
      setProjects(convertedProjects);
    } catch (error) {
      console.error('Erro ao carregar projetos:', error);
    } finally {
      setLoading(false);
    }
  };

  const createProject = async (projectData: ProjectFormData): Promise<Project | null> => {
    try {
      const { data: newProject, error } = await supabase
        .from('projects')
        .insert([{ ...projectData, user_id: user?.id }])
        .select()
        .single();

      if (error) throw error;
      
      // Converter dados do banco para o tipo Project
      const convertedProject: Project = {
        ...newProject,
        criticidade: newProject.criticidade as 'Baixa' | 'Média' | 'Alta' | 'Crítica'
      };
      setProjects(prev => [convertedProject, ...prev]);
      return convertedProject;
    } catch (error) {
      console.error('Erro ao criar projeto:', error);
      return null;
    }
  };

  const updateProject = async (id: string, projectData: Partial<ProjectFormData>): Promise<Project | null> => {
    try {
      const { data: updatedProject, error } = await supabase
        .from('projects')
        .update(projectData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Converter dados do banco para o tipo Project
      const convertedProject: Project = {
        ...updatedProject,
        criticidade: updatedProject.criticidade as 'Baixa' | 'Média' | 'Alta' | 'Crítica'
      };

      setProjects(prev => 
        prev.map(p => p.id === id ? convertedProject : p)
      );
      return convertedProject;
    } catch (error) {
      console.error('Erro ao atualizar projeto:', error);
      return null;
    }
  };

  const deleteProject = async (id: string): Promise<boolean> => {
    try {
      // Excluir todas as tabelas relacionadas primeiro
      await Promise.all([
        supabase.from('tasks').delete().eq('project_id', id),
        supabase.from('stakeholders').delete().eq('project_id', id),
        supabase.from('communication_plan').delete().eq('project_id', id),
        supabase.from('teams').delete().eq('project_id', id),
        supabase.from('custom_fields').delete().eq('project_id', id),
        supabase.from('tap').delete().eq('project_id', id)
      ]);

      // Agora excluir o projeto
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setProjects(prev => prev.filter(p => p.id !== id));
      return true;
    } catch (error) {
      console.error('Erro ao excluir projeto:', error);
      throw error;
    }
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
    refreshProjects: loadProjects,
  };
}