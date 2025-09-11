export interface Task {
  id: string;
  project_id: string;
  user_id: string;
  task_id: string; // ID automático gerado pelo sistema
  nome: string;
  responsavel?: string;
  data_vencimento?: string;
  prioridade: 'Baixa' | 'Média' | 'Alta' | 'Crítica';
  status: string; // Status customizável
  custom_fields: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface CustomField {
  id: string;
  project_id: string;
  user_id: string;
  field_name: string;
  field_type: 'monetary' | 'percentage' | 'numeric' | 'text' | 'dropdown' | 'tags' | 'checkbox';
  field_options?: string[]; // Para dropdown e tags
  is_required: boolean;
  created_at: string;
  updated_at: string;
}

export type TaskFormData = Omit<Task, 'id' | 'user_id' | 'created_at' | 'updated_at'>;
export type CustomFieldFormData = Omit<CustomField, 'id' | 'user_id' | 'created_at' | 'updated_at'>;