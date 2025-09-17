export interface Client {
  id: string;
  user_id: string;
  cod_int_cli: string;
  nome: string;
  razao_social?: string;
  cnpj?: string;
  cpf?: string;
  email?: string;
  telefone?: string;
  endereco?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
  pais?: string;
  status: 'Ativo' | 'Inativo';
  observacoes?: string;
  created_at: string;
  updated_at: string;
}

export type ClientFormData = Omit<Client, 'id' | 'user_id' | 'created_at' | 'updated_at'>;

export interface CreateClientData {
  cod_int_cli: string;
  nome: string;
  razao_social?: string;
  cnpj?: string;
  cpf?: string;
  email?: string;
  telefone?: string;
  endereco?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
  pais?: string;
  status?: 'Ativo' | 'Inativo';
  observacoes?: string;
}