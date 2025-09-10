export interface Project {
  id: string;
  
  // Identificação
  data: string;
  codCliente: string;
  nomeProjeto: string;
  cliente: string;
  gpp: string;
  coordenador: string;
  produto: string;
  esn: string;
  arquiteto: string;
  criticidade: 'Baixa' | 'Média' | 'Alta' | 'Crítica';
  drive: string;
  
  // Financeiro
  valorProjeto: number;
  receitaAtual: number;
  margemVendaPercent: number;
  margemAtualPercent: number;
  margemVendaReais: number;
  margemAtualReais: number;
  mrr: number;
  investimentoPerdas: number;
  mrrTotal: number;
  investimentoComercial: number;
  psaPlanejado: number;
  investimentoErroProduto: number;
  diferencaPsaProjeto: number;
  projetoEmPerda: boolean;
  
  // Timeline
  dataInicio: string;
  goLivePrevisto: string;
  duracaoPosProducao: number;
  encerramento: string;
  
  // Outros
  escopo: string;
  objetivo: string;
  observacao: string;
  
  // Sistema
  createdAt: string;
  updatedAt: string;
}

export type ProjectFormData = Omit<Project, 'id' | 'createdAt' | 'updatedAt'>;