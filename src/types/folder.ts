export interface Folder {
  id: string;
  nome: string;
  descricao: string | null;
  cor: string;
  workspace_id: string;
  created_at: string;
  updated_at: string;
}

export type FolderFormData = Omit<Folder, 'id' | 'created_at' | 'updated_at'>;