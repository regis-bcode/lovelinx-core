export interface Area {
  id: string;
  user_id: string;
  nome: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export type AreaFormData = Omit<Area, 'id' | 'user_id' | 'created_at' | 'updated_at'>;
