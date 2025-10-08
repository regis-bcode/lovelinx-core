export interface Modulo {
  id: string;
  user_id: string;
  nome: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export type ModuloFormData = Omit<Modulo, 'id' | 'user_id' | 'created_at' | 'updated_at'>;
