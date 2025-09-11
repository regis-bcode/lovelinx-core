import { useState, useEffect } from 'react';
import { Workspace, WorkspaceFormData } from '@/types/workspace';
import { useAuth } from '@/contexts/AuthContext';

const STORAGE_KEY = 'tap-workspaces';

// Função para gerar ID único
function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

export function useWorkspaces() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      loadWorkspaces();
    }
  }, [user]);

  const loadWorkspaces = () => {
    try {
      const storedWorkspaces = localStorage.getItem(STORAGE_KEY);
      if (storedWorkspaces) {
        const parsedWorkspaces = JSON.parse(storedWorkspaces);
        // Filtrar apenas os workspaces do usuário atual
        const userWorkspaces = parsedWorkspaces.filter((w: Workspace) => 
          w.user_id === user?.id && w.ativo
        );
        setWorkspaces(userWorkspaces);
      }
    } catch (error) {
      console.error('Erro ao carregar workspaces:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveWorkspaces = (newWorkspaces: Workspace[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newWorkspaces));
      // Filtrar apenas os workspaces do usuário atual para o estado
      const userWorkspaces = newWorkspaces.filter(w => w.user_id === user?.id && w.ativo);
      setWorkspaces(userWorkspaces);
    } catch (error) {
      console.error('Erro ao salvar workspaces:', error);
    }
  };

  const createWorkspace = async (data: WorkspaceFormData): Promise<Workspace | null> => {
    try {
      const newWorkspace: Workspace = {
        ...data,
        id: generateId(),
        user_id: user?.id || '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      
      // Carregar workspaces existentes do localStorage
      const storedWorkspaces = localStorage.getItem(STORAGE_KEY);
      const allWorkspaces = storedWorkspaces ? JSON.parse(storedWorkspaces) : [];
      const updatedWorkspaces = [...allWorkspaces, newWorkspace];
      
      saveWorkspaces(updatedWorkspaces);
      return newWorkspace;
    } catch (error) {
      console.error('Erro ao criar workspace:', error);
      return null;
    }
  };

  const updateWorkspace = async (id: string, data: Partial<WorkspaceFormData>): Promise<Workspace | null> => {
    try {
      const storedWorkspaces = localStorage.getItem(STORAGE_KEY);
      const allWorkspaces: Workspace[] = storedWorkspaces ? JSON.parse(storedWorkspaces) : [];
      
      const workspaceIndex = allWorkspaces.findIndex(w => w.id === id);
      if (workspaceIndex === -1) return null;

      const updatedWorkspace = {
        ...allWorkspaces[workspaceIndex],
        ...data,
        updated_at: new Date().toISOString(),
      };

      allWorkspaces[workspaceIndex] = updatedWorkspace;
      saveWorkspaces(allWorkspaces);
      return updatedWorkspace;
    } catch (error) {
      console.error('Erro ao atualizar workspace:', error);
      return null;
    }
  };

  const deleteWorkspace = async (id: string): Promise<boolean> => {
    try {
      const storedWorkspaces = localStorage.getItem(STORAGE_KEY);
      const allWorkspaces: Workspace[] = storedWorkspaces ? JSON.parse(storedWorkspaces) : [];
      
      const workspaceIndex = allWorkspaces.findIndex(w => w.id === id);
      if (workspaceIndex === -1) return false;

      // Marcar como inativo ao invés de deletar
      allWorkspaces[workspaceIndex].ativo = false;
      allWorkspaces[workspaceIndex].updated_at = new Date().toISOString();
      
      saveWorkspaces(allWorkspaces);
      return true;
    } catch (error) {
      console.error('Erro ao excluir workspace:', error);
      return false;
    }
  };

  const getWorkspace = (id: string): Workspace | null => {
    return workspaces.find(w => w.id === id) || null;
  };

  return {
    workspaces,
    loading,
    createWorkspace,
    updateWorkspace,
    deleteWorkspace,
    getWorkspace,
    refreshWorkspaces: loadWorkspaces,
  };
}