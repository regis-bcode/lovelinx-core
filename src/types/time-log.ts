export type TimeEntryType = 'automatico' | 'manual' | 'timer';
export type ApprovalStatus = 'pendente' | 'aprovado' | 'reprovado';
export type AppRole = 'admin' | 'gestor' | 'usuario';

export interface TimeLog {
  id: string;
  task_id: string;
  project_id: string;
  user_id: string;
  tipo_inclusao: TimeEntryType;
  tempo_minutos: number;
  tempo_segundos: number;
  tempo_formatado?: string | null;
  data_inicio?: string;
  data_fim?: string;
  status_aprovacao: ApprovalStatus;
  aprovador_id?: string;
  data_aprovacao?: string | null;
  observacoes?: string;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
  updated_at: string;
}

export type TimeLogFormData = Omit<TimeLog, 'id' | 'created_at' | 'updated_at'>;
