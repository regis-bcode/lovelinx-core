export interface Project {
  id: string;
  folder_id?: string;
  user_id: string;
  
  // Identificação
  data: string;
  cod_cliente: string;
  nome_projeto: string;
  cliente: string;
  gpp: string;
  coordenador: string;
  produto: string;
  esn: string;
  arquiteto: string;
  criticidade: 'Baixa' | 'Média' | 'Alta' | 'Crítica';
  drive?: string;
  
  // Financeiro
  valor_projeto: number;
  receita_atual: number;
  margem_venda_percent: number;
  margem_atual_percent: number;
  margem_venda_reais: number;
  margem_atual_reais: number;
  mrr: number;
  investimento_perdas: number;
  mrr_total: number;
  investimento_comercial: number;
  psa_planejado: number;
  investimento_erro_produto: number;
  diferenca_psa_projeto: number;
  projeto_em_perda: boolean;
  
  // Timeline
  data_inicio?: string;
  go_live_previsto?: string;
  duracao_pos_producao: number;
  encerramento?: string;
  
  // Outros
  escopo?: string;
  objetivo?: string;
  observacao?: string;
  
  // Sistema
  created_at: string;
  updated_at: string;
}

export type ProjectFormData = Omit<Project, 'id' | 'user_id' | 'created_at' | 'updated_at'>;

// Tipo para dados mínimos obrigatórios do TAP
export interface TAPBasicData {
  // Identificação básica
  data: string;
  cod_cliente: string;
  nome_projeto: string;
  cliente: string;
  gpp: string;
  coordenador: string;
  produto: string;
  esn: string;
  arquiteto: string;
  criticidade: 'Baixa' | 'Média' | 'Alta' | 'Crítica';
}