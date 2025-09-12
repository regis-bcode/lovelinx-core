import { useState, useEffect } from 'react';
import { Folder, FolderFormData } from '@/types/folder';
import { supabase } from '@/integrations/supabase/client';

export function useFolders(workspaceId?: string) {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (workspaceId) {
      loadFolders();

      // Real-time subscriptions para folders
      const channel = supabase
        .channel(`folders-realtime-${workspaceId}`)
        .on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'folders', 
          filter: `workspace_id=eq.${workspaceId}` 
        }, (payload) => {
          const folder = payload.new as Folder;
          setFolders((prev) => [folder, ...prev.filter((f) => f.id !== folder.id)]);
        })
        .on('postgres_changes', { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'folders', 
          filter: `workspace_id=eq.${workspaceId}` 
        }, (payload) => {
          const folder = payload.new as Folder;
          setFolders((prev) => prev.map((f) => (f.id === folder.id ? folder : f)));
        })
        .on('postgres_changes', { 
          event: 'DELETE', 
          schema: 'public', 
          table: 'folders', 
          filter: `workspace_id=eq.${workspaceId}` 
        }, (payload) => {
          const folder = payload.old as Folder;
          setFolders((prev) => prev.filter((f) => f.id !== folder.id));
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } else {
      setFolders([]);
      setLoading(false);
    }
  }, [workspaceId]);

  const loadFolders = async () => {
    if (!workspaceId) return;
    
    try {
      const { data, error } = await supabase
        .from('folders')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFolders(data || []);
    } catch (error) {
      console.error('Erro ao carregar pastas:', error);
    } finally {
      setLoading(false);
    }
  };

  const createFolder = async (data: FolderFormData): Promise<Folder | null> => {
    try {
      const { data: newFolder, error } = await supabase
        .from('folders')
        .insert([data])
        .select()
        .single();

      if (error) throw error;
      
      setFolders(prev => [newFolder, ...prev]);
      return newFolder;
    } catch (error) {
      console.error('Erro ao criar pasta:', error);
      return null;
    }
  };

  const updateFolder = async (id: string, data: Partial<FolderFormData>): Promise<Folder | null> => {
    try {
      const { data: updatedFolder, error } = await supabase
        .from('folders')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      setFolders(prev => 
        prev.map(f => f.id === id ? updatedFolder : f)
      );
      return updatedFolder;
    } catch (error) {
      console.error('Erro ao atualizar pasta:', error);
      return null;
    }
  };

  const deleteFolder = async (id: string): Promise<boolean> => {
    try {
      // Verificar se existem projetos vinculados à pasta
      const { data: projects, error: projectError } = await supabase
        .from('projects')
        .select('id')
        .eq('folder_id', id)
        .limit(1);

      if (projectError) throw projectError;

      if (projects && projects.length > 0) {
        throw new Error('Não é possível excluir uma pasta que contém projetos. Exclua todos os projetos primeiro.');
      }

      const { error } = await supabase
        .from('folders')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setFolders(prev => prev.filter(f => f.id !== id));
      return true;
    } catch (error) {
      console.error('Erro ao excluir pasta:', error);
      throw error;
    }
  };

  const getFolder = (id: string): Folder | null => {
    return folders.find(f => f.id === id) || null;
  };

  return {
    folders,
    loading,
    createFolder,
    updateFolder,
    deleteFolder,
    getFolder,
    refreshFolders: loadFolders,
  };
}