export type TimeEntryType = 'automatico' | 'manual';
export type ApprovalStatus = 'pendente' | 'aprovado' | 'reprovado';
export type AppRole = 'admin' | 'gestor' | 'usuario';

export type TimeLogStatus = 'running' | 'completed' | 'canceled';

export interface TimeLog {
  id: string;
  task_id: string;
  project_id: string;
  user_id: string;
  tipo_inclusao: TimeEntryType;
  tempo_trabalhado: number;
  tempo_formatado?: string | null;
  data_inicio?: string | null;
  data_fim?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  duration_secs?: number | null;
  status?: TimeLogStatus;
  atividade?: string | null;
  status_aprovacao: ApprovalStatus;
  aprovador_id?: string | null;
  aprovador_nome?: string | null;
  data_aprovacao?: string | null;
  aprovacao_data?: string | null;
  aprovacao_hora?: string | null;
  observacoes?: string | null;
  justificativa_reprovacao?: string | null;
  created_at: string;
  updated_at: string;
  task?: {
    id: string;
    task_id?: string | null;
    tarefa?: string | null;
    solucao?: string | null;
    responsavel?: string | null;
    status?: string | null;
  } | null;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
  updated_at: string;
}

export type TimeLogFormData = Omit<
  TimeLog,
  'id' | 'created_at' | 'updated_at' | 'tempo_trabalhado' | 'tempo_formatado' | 'task'
> & {
  tempo_trabalhado?: number;
};
