export type TimeEntryType = 'automatico' | 'manual' | 'timer';
export type ApprovalStatus = 'pendente' | 'aprovado' | 'reprovado';
export type AppRole = 'admin' | 'gestor' | 'usuario';

export interface TimeLog {
  id: string;
  task_id: string;
  project_id: string;
  user_id: string;
  tipo_inclusao: TimeEntryType;
  tempo_trabalhado: number;
  tempo_formatado?: string | null;
  data_inicio?: string;
  data_fim?: string;
  started_at?: string | null;
  ended_at?: string | null;
  duration_minutes?: number | null;
  log_date?: string | null;
  status_aprovacao: ApprovalStatus;
  aprovador_id?: string | null;
  aprovador_nome?: string | null;
  data_aprovacao?: string | null;
  aprovacao_data?: string | null;
  aprovacao_hora?: string | null;
  observacoes?: string | null;
  atividade?: string | null;
  justificativa_reprovacao?: string | null;
  comissionado?: boolean;
  aprovado?: 'SIM' | 'NÃO' | null;
  approval_status?: 'Aguarda Aprovação' | 'Aprovado' | 'Reprovado' | null;
  is_billable?: boolean | null;
  approved_by?: string | null;
  approved_at?: string | null;
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

export type TimeLogFormData = Omit<
  TimeLog,
  'id' | 'created_at' | 'updated_at' | 'tempo_trabalhado' | 'tempo_formatado'
> & {
  tempo_trabalhado?: number;
};
