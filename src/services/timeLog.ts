import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type TimeLogRow = Database['public']['Tables']['time_logs']['Row'];

export class TimeLogServiceError extends Error {
  constructor(message: string, public readonly code?: string) {
    super(message);
    this.name = 'TimeLogServiceError';
  }
}

const normalizeIsoDate = (value: string | null | undefined): string | null => {
  if (!value) {
    return null;
  }

  try {
    const normalized = new Date(value);
    if (Number.isNaN(normalized.getTime())) {
      return null;
    }
    return normalized.toISOString();
  } catch (error) {
    console.error('Falha ao normalizar data ISO de apontamento:', error);
    return null;
  }
};

const ensureProjectExists = async (projectId: string) => {
  const { data, error } = await supabase
    .from('projects')
    .select('id')
    .eq('id', projectId)
    .maybeSingle();

  if (error) {
    throw new TimeLogServiceError('Não foi possível validar o projeto do apontamento.', 'project-validation');
  }

  if (!data) {
    throw new TimeLogServiceError('Projeto do apontamento não foi localizado.', 'project-not-found');
  }
};

export interface StartTimeLogParams {
  userId: string;
  projectId: string;
  taskId: string;
  startedAt?: Date;
  tipoInclusao?: Database['public']['Enums']['time_entry_type'];
  observacoes?: string | null;
}

export const startTimeLog = async ({
  userId,
  projectId,
  taskId,
  startedAt,
  tipoInclusao,
  observacoes,
}: StartTimeLogParams): Promise<TimeLogRow> => {
  if (!userId) {
    throw new TimeLogServiceError('Usuário não autenticado.', 'unauthenticated');
  }

  if (!projectId) {
    throw new TimeLogServiceError('Projeto não informado para o apontamento.', 'missing-project');
  }

  if (!taskId) {
    throw new TimeLogServiceError('Tarefa não informada para o apontamento.', 'missing-task');
  }

  const { data: activeLog, error: activeLogError } = await supabase
    .from('time_logs')
    .select('id, task_id')
    .eq('user_id', userId)
    .is('end_time', null)
    .maybeSingle();

  if (activeLogError) {
    console.error('Erro ao verificar apontamentos em andamento:', activeLogError);
    throw new TimeLogServiceError('Não foi possível verificar apontamentos em andamento.', 'load-active-log');
  }

  if (activeLog) {
    throw new TimeLogServiceError('Você já tem um apontamento em andamento.', 'active-log-exists');
  }

  await ensureProjectExists(projectId);

  const startDate = startedAt ?? new Date();
  const isoStart = startDate.toISOString();

  const payload: Database['public']['Tables']['time_logs']['Insert'] = {
    user_id: userId,
    project_id: projectId,
    task_id: taskId,
    tipo_inclusao: tipoInclusao ?? 'automatico',
    observacoes: observacoes ?? null,
    atividade: null,
    data_inicio: isoStart,
    data_fim: null,
    start_time: isoStart,
    end_time: null,
    duration_secs: null,
    tempo_trabalhado: 0,
    status: 'running',
    status_aprovacao: 'pendente',
    aprovador_id: null,
    aprovador_nome: null,
    data_aprovacao: null,
    aprovacao_data: null,
    aprovacao_hora: null,
    justificativa_reprovacao: null,
  };

  const { data, error } = await supabase
    .from('time_logs')
    .insert(payload)
    .select()
    .single();

  if (error || !data) {
    console.error('Erro ao iniciar apontamento:', error);
    throw new TimeLogServiceError('Não foi possível iniciar o apontamento de tempo.', 'start-failed');
  }

  return data;
};

export interface StopTimeLogParams {
  userId: string;
  atividade: string;
  taskId?: string;
  endedAt?: Date;
}

export const stopTimeLog = async ({
  userId,
  atividade,
  taskId,
  endedAt,
}: StopTimeLogParams): Promise<TimeLogRow> => {
  if (!userId) {
    throw new TimeLogServiceError('Usuário não autenticado.', 'unauthenticated');
  }

  const trimmedActivity = atividade.trim();

  if (trimmedActivity.length < 3) {
    throw new TimeLogServiceError('Descreva a atividade realizada (mínimo de 3 caracteres).', 'invalid-activity');
  }

  const { data: runningLog, error: runningError } = await supabase
    .from('time_logs')
    .select('*')
    .eq('user_id', userId)
    .is('end_time', null)
    .maybeSingle();

  if (runningError) {
    console.error('Erro ao recuperar apontamento ativo:', runningError);
    throw new TimeLogServiceError('Não foi possível localizar o apontamento em andamento.', 'load-active-log');
  }

  if (!runningLog) {
    throw new TimeLogServiceError('Não há apontamento em andamento.', 'no-active-log');
  }

  if (taskId && runningLog.task_id !== taskId) {
    throw new TimeLogServiceError('O apontamento ativo pertence a outra tarefa.', 'task-mismatch');
  }

  if (!runningLog.project_id) {
    throw new TimeLogServiceError('Projeto do apontamento não foi identificado.', 'missing-project');
  }

  await ensureProjectExists(runningLog.project_id);

  const startIso = normalizeIsoDate(runningLog.start_time) ?? normalizeIsoDate(runningLog.data_inicio);

  if (!startIso) {
    throw new TimeLogServiceError('Registro de início do apontamento inválido.', 'invalid-start');
  }

  const endDate = endedAt ?? new Date();
  const isoEnd = endDate.toISOString();
  const durationMs = endDate.getTime() - new Date(startIso).getTime();
  const durationSecs = Math.max(1, Math.floor(durationMs / 1000));
  const durationMinutes = durationSecs / 60;

  const updatePayload: Database['public']['Tables']['time_logs']['Update'] = {
    atividade: trimmedActivity,
    data_fim: isoEnd,
    end_time: isoEnd,
    duration_secs: durationSecs,
    tempo_trabalhado: durationMinutes,
    status: 'completed',
  };

  const { data, error } = await supabase
    .from('time_logs')
    .update(updatePayload)
    .eq('id', runningLog.id)
    .select()
    .single();

  if (error || !data) {
    console.error('Erro ao encerrar apontamento:', error);
    throw new TimeLogServiceError('Não foi possível finalizar o apontamento de tempo.', 'stop-failed');
  }

  return data;
};

export const getRunningTimeLogForUser = async (userId: string): Promise<TimeLogRow | null> => {
  if (!userId) {
    throw new TimeLogServiceError('Usuário não autenticado.', 'unauthenticated');
  }

  const { data, error } = await supabase
    .from('time_logs')
    .select('*')
    .eq('user_id', userId)
    .is('end_time', null)
    .maybeSingle();

  if (error) {
    console.error('Erro ao recuperar apontamento em andamento do usuário:', error);
    throw new TimeLogServiceError('Não foi possível verificar apontamentos em andamento.', 'load-active-log');
  }

  return data ?? null;
};

