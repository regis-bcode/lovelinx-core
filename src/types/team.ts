export interface Team {
  id: string;
  project_id: string;
  user_id: string;
  nome: string;
  email?: string;
  cargo?: string;
  departamento?: string;
  telefone?: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export type TeamFormData = Omit<Team, 'id' | 'user_id' | 'created_at' | 'updated_at'>;