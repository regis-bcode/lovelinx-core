import { useState, useEffect } from 'react';
import { Folder, FolderFormData } from '@/types/folder';

const STORAGE_KEY = 'tap-folders';

// Função para gerar ID único
function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

export function useFolders(workspaceId?: string) {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (workspaceId) {
      loadFolders();
    } else {
      setFolders([]);
      setLoading(false);
    }
  }, [workspaceId]);

  const loadFolders = () => {
    if (!workspaceId) return;
    
    try {
      const storedFolders = localStorage.getItem(STORAGE_KEY);
      if (storedFolders) {
        const parsedFolders = JSON.parse(storedFolders);
        const workspaceFolders = parsedFolders.filter((f: Folder) => 
          f.workspace_id === workspaceId
        );
        setFolders(workspaceFolders);
      }
    } catch (error) {
      console.error('Erro ao carregar pastas:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveFolders = (newFolders: Folder[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newFolders));
      // Filtrar apenas as pastas do workspace atual para o estado
      const workspaceFolders = newFolders.filter(f => f.workspace_id === workspaceId);
      setFolders(workspaceFolders);
    } catch (error) {
      console.error('Erro ao salvar pastas:', error);
    }
  };

  const createFolder = async (data: FolderFormData): Promise<Folder | null> => {
    try {
      const newFolder: Folder = {
        ...data,
        id: generateId(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      
      // Carregar pastas existentes do localStorage
      const storedFolders = localStorage.getItem(STORAGE_KEY);
      const allFolders = storedFolders ? JSON.parse(storedFolders) : [];
      const updatedFolders = [...allFolders, newFolder];
      
      saveFolders(updatedFolders);
      return newFolder;
    } catch (error) {
      console.error('Erro ao criar pasta:', error);
      return null;
    }
  };

  const updateFolder = async (id: string, data: Partial<FolderFormData>): Promise<Folder | null> => {
    try {
      const storedFolders = localStorage.getItem(STORAGE_KEY);
      const allFolders: Folder[] = storedFolders ? JSON.parse(storedFolders) : [];
      
      const folderIndex = allFolders.findIndex(f => f.id === id);
      if (folderIndex === -1) return null;

      const updatedFolder = {
        ...allFolders[folderIndex],
        ...data,
        updated_at: new Date().toISOString(),
      };

      allFolders[folderIndex] = updatedFolder;
      saveFolders(allFolders);
      return updatedFolder;
    } catch (error) {
      console.error('Erro ao atualizar pasta:', error);
      return null;
    }
  };

  const deleteFolder = async (id: string): Promise<boolean> => {
    try {
      const storedFolders = localStorage.getItem(STORAGE_KEY);
      const allFolders: Folder[] = storedFolders ? JSON.parse(storedFolders) : [];
      
      const updatedFolders = allFolders.filter(f => f.id !== id);
      saveFolders(updatedFolders);
      return true;
    } catch (error) {
      console.error('Erro ao excluir pasta:', error);
      return false;
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