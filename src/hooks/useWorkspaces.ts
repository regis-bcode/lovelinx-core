import { useState, useEffect } from 'react';
import { Workspace, WorkspaceFormData } from '@/types/workspace';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useWorkspaces() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    loadWorkspaces();

    const channel = supabase
      .channel(`workspaces-realtime-${user.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'workspaces', filter: `user_id=eq.${user.id}` }, (payload) => {
        const w = payload.new as Workspace;
        if (w.ativo) {
          setWorkspaces((prev) => [w, ...prev.filter((p) => p.id !== w.id)]);
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'workspaces', filter: `user_id=eq.${user.id}` }, (payload) => {
        const w = payload.new as Workspace;
        setWorkspaces((prev) => {
          const updated = prev.map((p) => (p.id === w.id ? w : p));
          return w.ativo ? updated : updated.filter((p) => p.id !== w.id);
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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
      const userId = user?.id && isUuid(user.id) ? user.id : null;
      if (!userId) throw new Error('Usuário não autenticado. Faça login para criar workspaces.');

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
      // Verificar se existem pastas vinculadas ao workspace
      const { data: folders, error: folderError } = await supabase
        .from('folders')
        .select('id')
        .eq('workspace_id', id)
        .limit(1);

      if (folderError) throw folderError;

      if (folders && folders.length > 0) {
        throw new Error('Não é possível excluir um workspace que contém pastas. Exclua todas as pastas primeiro.');
      }

      // Hard delete em vez de soft delete
      const { error } = await supabase
        .from('workspaces')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setWorkspaces(prev => prev.filter(w => w.id !== id));
      return true;
    } catch (error) {
      console.error('Erro ao excluir workspace:', error);
      throw error;
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