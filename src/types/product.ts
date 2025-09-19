export interface Product {
  id: string;
  id_produto: string;
  descricao: string;
  ativo: boolean;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export interface CreateProductData {
  id_produto: string;
  descricao: string;
}