export interface CommunicationPlan {
  id: string;
  projectId: string;
  codigo: string;
  comunicacao: string; // Nome do arquivo/comunicação
  objetivo: string;
  frequencia: 'Diária' | 'Semanal' | 'Quinzenal' | 'Mensal' | 'Trimestral';
  responsavel: string;
  envolvidos: string;
  aprovadores: string;
  formatoArquivo: string;
  midia: 'Email' | 'Reunião' | 'Documento' | 'Apresentação';
  canalEnvio: string;
  idioma: 'Português' | 'Inglês' | 'Espanhol';
  conteudo: string;
  linkDocumento: string;
  createdAt: string;
  updatedAt: string;
}

export type CommunicationPlanFormData = Omit<CommunicationPlan, 'id' | 'createdAt' | 'updatedAt'>;