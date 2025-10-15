export interface Gap {
  id: string;
  project_id: string;
  task_id: string;
  titulo: string;
  descricao?: string | null;
  tipo?: string | null;
  origem?: string | null;
  severidade?: string | null;
  urgencia?: string | null;
  prioridade?: string | null;
  impacto?: string[] | null;
  faturavel?: boolean | null;
  valor_impacto_financeiro?: number | null;
  causa_raiz?: string | null;
  plano_acao?: string | null;
  responsavel?: string | null;
  data_prometida?: string | null;
  status?: string | null;
  necessita_aprovacao?: boolean | null;
  decisao?: string | null;
  aprovado_por?: string | null;
  data_aprovacao?: string | null;
  anexos?: string[] | null;
  observacoes?: string | null;
  created_at: string;
  updated_at: string;
  impacto_financeiro_descricao?: string | null;
  impacto_resumo?: string | null;
}

export type GapFormData = Omit<Gap, 'id' | 'created_at' | 'updated_at'>;
