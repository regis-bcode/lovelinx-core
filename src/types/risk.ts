export interface Risk {
  id: string;
  projectId: string;
  data: string;
  area: string;
  responsavel: string;
  situacao: string;
  probabilidade: 'Baixa' | 'Média' | 'Alta';
  impacto: 'Baixo' | 'Médio' | 'Alto';
  exposicao: number;
  estrategiaResposta: 'Aceitar' | 'Mitigar' | 'Transferir' | 'Evitar';
  planoAcao: string;
  dataLimite: string;
  condicaoPlanoAcao: string;
  tipoImpacto: 'Financeiro' | 'Cronograma' | 'Qualidade' | 'Escopo';
  custoRisco: number;
  dataConclusao?: string;
  comentarios: string;
  statusPlanoAcao: 'Não Iniciado' | 'Em Andamento' | 'Concluído';
  statusRisco: 'Ativo' | 'Mitigado' | 'Fechado';
  createdAt: string;
  updatedAt: string;
}

export type RiskFormData = Omit<Risk, 'id' | 'createdAt' | 'updatedAt'>;