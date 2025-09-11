export interface Stakeholder {
  id: string;
  project_id: string;
  nome: string;
  cargo: string;
  departamento: string;
  nivel: string;
  email: string;
  telefone: string;
  tipo_influencia: string;
  interesses: string;
  created_at: string;
  updated_at: string;
}

export type StakeholderFormData = Omit<Stakeholder, 'id' | 'created_at' | 'updated_at'>;