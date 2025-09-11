export interface Workspace {
  id: string;
  nome: string;
  descricao: string | null;
  cor: string;
  ativo: boolean;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export type WorkspaceFormData = Omit<Workspace, 'id' | 'user_id' | 'created_at' | 'updated_at'>;