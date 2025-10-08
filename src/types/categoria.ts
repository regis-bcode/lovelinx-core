export interface Categoria {
  id: string;
  user_id: string;
  nome: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export type CategoriaFormData = Omit<Categoria, 'id' | 'user_id' | 'created_at' | 'updated_at'>;
