export interface Task {
  id: string;
  project_id: string;
  user_id: string;
  task_id: string; // ID automático gerado pelo sistema
  tarefa: string;
  responsavel?: string;
  data_inicio?: string;
  data_vencimento?: string;
  prioridade: 'Baixa' | 'Média' | 'Alta' | 'Crítica';
  status: string; // Status customizável
  custom_fields: Record<string, any>;
  created_at: string;
  updated_at: string;

  // Novos campos conforme lista
  cliente?: string;
  modulo?: string;
  area?: string;
  categoria?: string;
  etapa_projeto?: string;
  sub_etapa_projeto?: string;
  descricao_tarefa?: string;
  solucao?: string;
  descricao_detalhada?: string;
  retorno_acao?: string;
  acao_realizada?: string;
  gp_consultoria?: string;
  responsavel_consultoria?: string;
  responsavel_cliente?: string;
  escopo?: string;
  cronograma?: boolean;
  criticidade?: string;
  numero_ticket?: string;
  descricao_ticket?: string;
  data_identificacao_ticket?: string;
  responsavel_ticket?: string;
  status_ticket?: string;
  link?: string;
  validado_por?: string;
  data_prevista_entrega?: string;
  data_entrega?: string;
  data_prevista_validacao?: string;
  dias_para_concluir?: number;
  percentual_conclusao?: number;
  link_drive?: string;
  tempo_total?: number;

  // Campos para subtarefas
  parent_task_id?: string;
  nivel: number;
  ordem: number;
}

export interface CustomField {
  id: string;
  project_id: string;
  user_id: string;
  field_name: string;
  field_type:
    | 'monetary'
    | 'percentage'
    | 'numeric'
    | 'text'
    | 'text_short'
    | 'text_long'
    | 'dropdown'
    | 'tags'
    | 'checkbox';
  field_options?: string[]; // Para dropdown e tags
  is_required: boolean;
  created_at: string;
  updated_at: string;
}

export type TaskFormData = Omit<Task, 'id' | 'user_id' | 'created_at' | 'updated_at'>;
export type CustomFieldFormData = Omit<CustomField, 'id' | 'user_id' | 'created_at' | 'updated_at'>;