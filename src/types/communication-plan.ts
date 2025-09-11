export interface CommunicationPlan {
  id: string;
  project_id: string;
  codigo: string;
  comunicacao?: string;
  objetivo?: string;
  frequencia?: string;
  responsavel?: string;
  envolvidos?: string;
  aprovadores?: string;
  formato_arquivo?: string;
  midia?: string;
  canal_envio?: string;
  idioma?: string;
  conteudo?: string;
  link_documento?: string;
  created_at: string;
  updated_at: string;
}

export type CommunicationPlanFormData = Omit<CommunicationPlan, 'id' | 'created_at' | 'updated_at'>;