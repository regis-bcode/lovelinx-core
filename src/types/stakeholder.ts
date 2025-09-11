export interface Stakeholder {
  id: string;
  projectId: string;
  nome: string;
  cargo: string;
  departamento: string;
  nivel: 'Executivo' | 'Gerencial' | 'Operacional';
  email: string;
  telefone: string;
  tipoInfluencia: 'Alto' | 'Médio' | 'Baixo';
  interesses: string;
  createdAt: string;
  updatedAt: string;
}

export type StakeholderFormData = Omit<Stakeholder, 'id' | 'createdAt' | 'updatedAt'>;