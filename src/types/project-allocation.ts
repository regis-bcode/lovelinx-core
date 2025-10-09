export interface ProjectAllocation {
  id: string;
  project_id: string;
  tap_id?: string;
  allocated_user_id: string;
  funcao_projeto: string;
  valor_hora: number;
  data_inicio: string;
  data_saida?: string;
  status_participacao: 'Ativo' | 'Inativo';
  observacoes?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectAllocationWithDetails extends ProjectAllocation {
  project?: {
    nome_projeto: string;
    cliente: string;
  };
  tap?: {
    nome_projeto: string;
  };
  user?: {
    nome_completo: string;
    email: string;
    client_id?: string;
  };
  client?: {
    nome: string;
  };
}

export type ProjectAllocationFormData = Omit<
  ProjectAllocation, 
  'id' | 'created_by' | 'created_at' | 'updated_at'
>;

export const FUNCOES_PROJETO = [
  'Gerente de Projeto',
  'Líder Técnico',
  'Analista',
  'Desenvolvedor',
  'Suporte',
  'Consultor',
  'Designer',
  'QA / Tester',
] as const;

export type FuncaoProjeto = typeof FUNCOES_PROJETO[number];
