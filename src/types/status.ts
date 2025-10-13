export interface Status {
  id: string;
  user_id: string;
  nome: string;
  tipo_aplicacao: string[]; // 'projeto', 'tarefa_suporte', 'tarefa_projeto'
  cor: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export type StatusFormData = Omit<Status, 'id' | 'user_id' | 'created_at' | 'updated_at'>;