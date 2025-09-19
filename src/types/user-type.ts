export interface UserType {
  id: string;
  codigo: string;
  descricao: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateUserTypeData {
  codigo: string;
  descricao: string;
}