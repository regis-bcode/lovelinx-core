export interface TAP {
  id: string;
  project_id: string;
  user_id: string;
  
  // Identificação
  data: string;
  nome_projeto: string;
  cod_cliente: string;
  gpp: string;
  produto: string;
  servico?: string;
  arquiteto: string;
  criticidade_totvs: string;
  coordenador: string;
  gerente_projeto: string;
  esn: string;
  criticidade_cliente: string;
  drive?: string;
  
  // Timeline
  data_inicio?: string;
  go_live_previsto?: string;
  duracao_pos_producao: number;
  encerramento?: string;
  
  // Escopo e Objetivo
  escopo?: string;
  objetivo?: string;
  
  // Observações
  observacoes?: string;
  
  // Financeiro
  valor_projeto: number;
  margem_venda_percent: number;
  margem_venda_valor: number;
  mrr: number;
  mrr_total: number;
  psa_planejado: number;
  diferenca_psa_projeto: number;
  receita_atual: number;
  margem_atual_percent: number;
  margem_atual_valor: number;
  investimento_perdas: number;
  investimento_comercial: number;
  investimento_erro_produto: number;
  projeto_em_perda: boolean;
  
  // Sistema
  created_at: string;
  updated_at: string;
}

export type TAPFormData = Omit<TAP, 'id' | 'user_id' | 'created_at' | 'updated_at'>;

// Tipo para dados mínimos obrigatórios do TAP
export interface TAPBasicData {
  // Identificação básica
  data: string;
  nome_projeto: string;
  cod_cliente: string;
  gpp: string;
  produto: string;
  servico?: string;
  arquiteto: string;
  criticidade_totvs: string;
  coordenador: string;
  gerente_projeto: string;
  esn: string;
  criticidade_cliente: string;
}

// Tipos para documentos anexados na TAP
export interface TAPDocument {
  id: string;
  tap_id: string;
  project_id: string;
  user_id: string;
  file_name: string;
  original_name: string;
  file_size?: number;
  mime_type?: string;
  document_name: string;
  upload_date: string;
  uploaded_by_name: string;
  created_at: string;
  updated_at: string;
}

export type TAPDocumentFormData = Omit<TAPDocument, 'id' | 'created_at' | 'updated_at' | 'upload_date'>;