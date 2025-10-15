export interface ProjectStage {
  id: string;
  user_id: string;
  nome: string;
  descricao?: string | null;
  ordem: number;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProjectSubStage {
  id: string;
  stage_id: string;
  user_id: string;
  nome: string;
  descricao?: string | null;
  ordem: number;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export type ProjectStageFormData = Omit<ProjectStage, 'id' | 'user_id' | 'created_at' | 'updated_at'>;
export type ProjectSubStageFormData = Omit<ProjectSubStage, 'id' | 'user_id' | 'created_at' | 'updated_at'>;
