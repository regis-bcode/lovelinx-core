import { useState, useEffect } from 'react';
import { Workspace, WorkspaceFormData } from '@/types/workspace';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useWorkspaces() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      loadWorkspaces();
    }
  }, [user]);

  const loadWorkspaces = async () => {
    try {
      const isUuid = (v: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);

      let query = supabase
        .from('workspaces')
        .select('*')
        .eq('ativo', true)
        .order('created_at', { ascending: false });

      if (user?.id && isUuid(user.id)) {
        query = query.eq('user_id', user.id);
      }

      const { data, error } = await query;

      if (error) throw error;
      setWorkspaces(data || []);
    } catch (error) {
      console.error('Erro ao carregar workspaces:', error);
    } finally {
      setLoading(false);
    }
  };

  const createWorkspace = async (data: WorkspaceFormData): Promise<Workspace | null> => {
    try {
      const isUuid = (v: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
      const userId = user?.id && isUuid(user.id) ? user.id : "550e8400-e29b-41d4-a716-446655440000";

      const { data: newWorkspace, error } = await supabase
        .from('workspaces')
        .insert([{ ...data, user_id: userId }])
        .select()
        .single();

      if (error) throw error;
      
      setWorkspaces(prev => [newWorkspace, ...prev]);
      return newWorkspace;
    } catch (error) {
      console.error('Erro ao criar workspace:', error);
      return null;
    }
  };

  const updateWorkspace = async (id: string, data: Partial<WorkspaceFormData>): Promise<Workspace | null> => {
    try {
      const { data: updatedWorkspace, error } = await supabase
        .from('workspaces')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      setWorkspaces(prev => 
        prev.map(w => w.id === id ? updatedWorkspace : w)
      );
      return updatedWorkspace;
    } catch (error) {
      console.error('Erro ao atualizar workspace:', error);
      return null;
    }
  };

  const deleteWorkspace = async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('workspaces')
        .update({ ativo: false })
        .eq('id', id);

      if (error) throw error;

      setWorkspaces(prev => prev.filter(w => w.id !== id));
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