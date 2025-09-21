export interface Service {
  id: string;
  id_servico: string;
  descricao: string;
  id_produto: string;
  user_id: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateServiceData {
  id_servico: string;
  descricao: string;
  id_produto: string;
}

export interface ServiceWithProduct extends Service {
  products?: {
    descricao: string;
  };
}