import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { TimeLog, TimeLogFormData, ApprovalStatus, TimeEntryType } from '@/types/time-log';
import { useToast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';
import type { PostgrestError } from '@supabase/supabase-js';

type TimeLogRow = Database['public']['Tables']['time_logs']['Row'];
type TimeLogInsert = Database['public']['Tables']['time_logs']['Insert'];
type TimeLogUpdate = Database['public']['Tables']['time_logs']['Update'];
type TaskActivityInsert = Database['public']['Tables']['task_activities']['Insert'];

const TIME_LOG_COLUMNS = new Set([
  'task_id',
  'project_id',
  'user_id',
  'tipo_inclusao',
  'data_inicio',
  'data_fim',
  'status_aprovacao',
  'aprovador_id',
  'aprovador_nome',
  'data_aprovacao',
  'aprovacao_data',
  'aprovacao_hora',
  'observacoes',
  'atividade',
  'justificativa_reprovacao',
  'created_at',
  'updated_at',
]);

const isMissingAtividadeColumnError = (error: unknown): error is PostgrestError => {
  const parsed = error as PostgrestError | undefined;
  if (!parsed) {
    return false;
  }

  if (parsed.code !== 'PGRST204') {
    return false;
  }

  const normalizedMessage = parsed.message?.toLowerCase() ?? '';
  return (
    normalizedMessage.includes("'atividade' column") &&
    normalizedMessage.includes("'time_logs'")
  );
};

const parseNumericValue = (value: unknown, fallback = 0): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const normalized = value.replace(',', '.');
    const parsed = Number.parseFloat(normalized);

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
};

export function formatHMS(totalSeconds: number): string {
  const safeSeconds = Number.isFinite(totalSeconds) ? Math.max(0, Math.round(totalSeconds)) : 0;
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  const pad = (value: number) => value.toString().padStart(2, '0');

  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

function sanitizeTimeLogPayload(obj: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined && TIME_LOG_COLUMNS.has(key)) {
      out[key] = value;
    }
  }
  return out;
}

const normalizeTimeLogRecord = (log: TimeLogRow): TimeLog => {
  const startTimestamp = typeof log.data_inicio === 'string' ? Date.parse(log.data_inicio) : NaN;
  const endTimestamp = typeof log.data_fim === 'string' ? Date.parse(log.data_fim) : NaN;
  const hasValidRange =
    Number.isFinite(startTimestamp) && Number.isFinite(endTimestamp) && endTimestamp >= startTimestamp;
  const minutesFromColumn = parseNumericValue(log.tempo_trabalhado, 0);
  const secondsFromColumn = Math.max(0, Math.round(minutesFromColumn * 60));
  const secondsFromRange = hasValidRange ? Math.max(0, Math.round((endTimestamp - startTimestamp) / 1000)) : null;
  const safeSeconds = secondsFromRange ?? secondsFromColumn;
  const safeMinutes = safeSeconds / 60;

  const approvalIso =
    typeof log.data_aprovacao === 'string' && log.data_aprovacao.trim().length > 0
      ? log.data_aprovacao
      : null;

  const normalizedActivity = (() => {
    if (typeof log.atividade === 'string') {
      const trimmed = log.atividade.trim();
      if (trimmed.length > 0) {
        return trimmed;
      }
    }

    return null;
  })();

  const normalizedObservacoes = (() => {
    if (typeof log.observacoes === 'string') {
      const trimmed = log.observacoes.trim();
      if (trimmed.length > 0) {
        return trimmed;
      }
    }

    return null;
  })();

  return {
    ...log,
    aprovador_nome: log.aprovador_nome ?? null,
    aprovacao_data: log.aprovacao_data ?? null,
    aprovacao_hora: log.aprovacao_hora ?? null,
    justificativa_reprovacao: log.justificativa_reprovacao ?? null,
    tempo_trabalhado: safeMinutes,
    tempo_formatado: formatHMS(safeSeconds),
    data_aprovacao: approvalIso,
    observacoes: normalizedObservacoes,
    atividade: normalizedActivity,
  } satisfies TimeLog;
};

export function useTimeLogs(projectId?: string) {
  const [timeLogs, setTimeLogs] = useState<TimeLog[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const buildSupabasePayload = useCallback(
    (payload: Partial<TimeLogFormData>): Record<string, unknown> => {
      return sanitizeTimeLogPayload(payload as Record<string, unknown>);
    },
    [],
  );

  useEffect(() => {
    if (!projectId) {
      setTimeLogs([]);
      setLoading(false);
      return;
    }

    loadTimeLogs();

    const channel = supabase
      .channel('time_logs_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'time_logs',
          filter: `project_id=eq.${projectId}`,
        },
        () => {
          loadTimeLogs();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId]);

  const loadTimeLogs = async () => {
    if (!projectId) {
      setTimeLogs([]);
      return;
    }

    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        console.error('Usuário não autenticado');
        setTimeLogs([]);
        return;
      }

      const { data, error } = await supabase
        .from('time_logs')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      const normalized = (data as TimeLogRow[] | null)?.map(normalizeTimeLogRecord) ?? [];

      setTimeLogs(normalized);
    } catch (error) {
      console.error('Erro ao carregar logs de tempo:', error);
      setTimeLogs([]);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os logs de tempo',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const createTimeLog = async (logData: Partial<TimeLogFormData>): Promise<TimeLog | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        toast({
          title: 'Erro',
          description: 'Você precisa estar autenticado',
          variant: 'destructive',
        });
        return null;
      }

      if (!projectId) {
        toast({
          title: 'Projeto não selecionado',
          description: 'Não foi possível identificar o projeto para registrar o tempo.',
          variant: 'destructive',
        });
        return null;
      }

      const payload: Partial<TimeLogFormData> = {
        ...logData,
        user_id: user.id,
        project_id: projectId,
        status_aprovacao: logData.status_aprovacao ?? 'pendente',
        aprovador_id: null,
        aprovador_nome: null,
        data_aprovacao: null,
        aprovacao_data: null,
        aprovacao_hora: null,
        justificativa_reprovacao: null,
      };

      const { data, error } = await supabase
        .from('time_logs')
        .insert(buildSupabasePayload(payload) as TimeLogInsert)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Tempo registrado com sucesso',
      });

      const normalized = normalizeTimeLogRecord(data as TimeLogRow);

      setTimeLogs(prev => {
        const next = prev.filter(log => log.id !== normalized.id);
        return [normalized, ...next];
      });

      return normalized;
    } catch (error) {
      console.error('Erro ao criar log de tempo:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível registrar o tempo',
        variant: 'destructive',
      });
      return null;
    }
  };

  const updateTimeLog = async (id: string, updates: Partial<TimeLogFormData>): Promise<TimeLog | null> => {
    try {
      const supabaseUpdates = buildSupabasePayload(updates);

      const { data, error } = await supabase
        .from('time_logs')
        .update(supabaseUpdates as TimeLogUpdate)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Log de tempo atualizado',
      });

      const normalized = normalizeTimeLogRecord(data as TimeLogRow);

      setTimeLogs(prev => prev.map(log => (log.id === normalized.id ? normalized : log)));

      return normalized;
    } catch (error) {
      console.error('Erro ao atualizar log de tempo:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar o log de tempo',
        variant: 'destructive',
      });
      return null;
    }
  };

  const approveTimeLog = async (
    id: string,
    status: ApprovalStatus,
    _options?: { justificativa?: string | null },
  ): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        toast({
          title: 'Erro',
          description: 'Você precisa estar autenticado',
          variant: 'destructive',
        });
        return false;
      }

      const isoString = new Date().toISOString();

      const metadata = user.user_metadata as Record<string, unknown> | undefined;
      const metadataFullName =
        metadata && typeof metadata['full_name'] === 'string'
          ? (metadata['full_name'] as string)
          : null;
      let approverName = metadataFullName && metadataFullName.trim().length > 0
        ? metadataFullName.trim()
        : null;

      if (!approverName) {
        const { data: profile, error: profileError } = await supabase
          .from('users')
          .select('nome_completo')
          .eq('user_id', user.id)
          .maybeSingle();

        if (profileError) {
          console.error('Erro ao buscar nome do aprovador:', profileError);
        }

        if (profile?.nome_completo && profile.nome_completo.trim().length > 0) {
          approverName = profile.nome_completo.trim();
        }
      }

      if (!approverName) {
        approverName = user.email ?? null;
      }

      const [datePart, timePartRaw] = isoString.split('T');
      const sanitizedTime = timePartRaw ? timePartRaw.replace('Z', '') : null;
      const approvalTime = sanitizedTime
        ? sanitizedTime.split('.')[0]?.slice(0, 8) ?? sanitizedTime.slice(0, 8)
        : null;

      const rejectionReason = _options?.justificativa?.trim() ?? null;

      if (status === 'reprovado' && (!rejectionReason || rejectionReason.length === 0)) {
        toast({
          title: 'Justificativa obrigatória',
          description: 'Informe uma justificativa para reprovar o tempo registrado.',
          variant: 'destructive',
        });
        return false;
      }

      const approvalUpdates: Partial<TimeLogFormData> = {
        status_aprovacao: status,
        aprovador_id: user.id,
        aprovador_nome: approverName,
        data_aprovacao: isoString,
        aprovacao_data: datePart ?? null,
        aprovacao_hora: approvalTime ?? null,
        justificativa_reprovacao: status === 'reprovado' ? rejectionReason : null,
        observacoes: status === 'reprovado' ? rejectionReason : undefined,
      };

      const supabaseUpdates = buildSupabasePayload(approvalUpdates);

      const { error } = await supabase
        .from('time_logs')
        .update(supabaseUpdates as TimeLogUpdate)
        .eq('id', id);

      if (error) throw error;

      setTimeLogs(prev =>
        prev.map(log =>
          log.id === id
            ? {
                ...log,
                status_aprovacao: status,
                aprovador_id: user.id,
                aprovador_nome: approverName,
                data_aprovacao: isoString,
                aprovacao_data: datePart ?? null,
                aprovacao_hora: approvalTime ?? null,
                justificativa_reprovacao:
                  status === 'reprovado' ? rejectionReason ?? null : null,
                observacoes: status === 'reprovado' ? rejectionReason ?? null : log.observacoes,
              }
            : log,
        ),
      );

      toast({
        title: 'Sucesso',
        description: `Tempo ${status === 'aprovado' ? 'aprovado' : 'reprovado'} com sucesso`,
      });

      return true;
    } catch (error) {
      console.error('Erro ao aprovar/reprovar tempo:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar o status',
        variant: 'destructive',
      });
      return false;
    }
  };

  const startTimerLog = async (
    taskId: string,
    options?: {
      tipoInclusao?: TimeEntryType;
      startedAt?: Date;
      observacoes?: string | null;
    },
  ): Promise<TimeLog | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        toast({
          title: 'Erro',
          description: 'Você precisa estar autenticado',
          variant: 'destructive',
        });
        return null;
      }

      if (!projectId) {
        toast({
          title: 'Projeto não selecionado',
          description: 'Não foi possível identificar o projeto para iniciar o registro de tempo.',
          variant: 'destructive',
        });
        return null;
      }

      const { data: existingLog, error: selectError } = await supabase
        .from('time_logs')
        .select('*')
        .eq('task_id', taskId)
        .eq('user_id', user.id)
        .is('data_fim', null)
        .order('data_inicio', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (selectError) throw selectError;

      if (existingLog) {
        const normalizedExisting = normalizeTimeLogRecord(existingLog as TimeLogRow);
        setTimeLogs(prev => {
          const next = prev.filter(log => log.id !== normalizedExisting.id);
          return [normalizedExisting, ...next];
        });
        return normalizedExisting;
      }

      const startedAt = options?.startedAt ?? new Date();
      const isoStart = startedAt.toISOString();

      const payload: Partial<TimeLogFormData> = {
        task_id: taskId,
        project_id: projectId,
        user_id: user.id,
        tipo_inclusao: options?.tipoInclusao ?? 'timer',
        data_inicio: isoStart,
        data_fim: null,
        status_aprovacao: 'pendente',
        observacoes: options?.observacoes ?? null,
        aprovador_id: null,
        data_aprovacao: null,
      };

      const { data, error } = await supabase
        .from('time_logs')
        .insert(buildSupabasePayload(payload) as TimeLogInsert)
        .select()
        .single();

      if (error) throw error;

      const normalized = normalizeTimeLogRecord(data as TimeLogRow);

      setTimeLogs(prev => [normalized, ...prev.filter(log => log.id !== normalized.id)]);

      return normalized;
    } catch (error) {
      console.error('Erro ao iniciar log de tempo:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível iniciar o registro de tempo.',
        variant: 'destructive',
      });
      return null;
    }
  };

  const stopTimerLog = async (
    taskId: string,
    options?: {
      activityDescription?: string | null;
      taskName?: string | null;
    },
  ): Promise<TimeLog | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        toast({
          title: 'Erro',
          description: 'Você precisa estar autenticado',
          variant: 'destructive',
        });
        return null;
      }

      const { data: openLog, error: selectError } = await supabase
        .from('time_logs')
        .select('*')
        .eq('task_id', taskId)
        .eq('user_id', user.id)
        .is('data_fim', null)
        .order('data_inicio', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (selectError) throw selectError;

      if (!openLog) {
        toast({
          title: 'Cronômetro não encontrado',
          description: 'Nenhum apontamento em andamento foi localizado para esta tarefa.',
        });
        return null;
      }

      const nowMs = Date.now();
      const isoNow = new Date(nowMs).toISOString();

      const normalizedDescription =
        typeof options?.activityDescription === 'string'
          ? options.activityDescription.trim()
          : '';
      const existingActivity = (() => {
        if (typeof openLog.atividade === 'string') {
          const trimmed = openLog.atividade.trim();
          if (trimmed.length > 0) {
            return trimmed;
          }
        }

        return null;
      })();

      const activity = normalizedDescription.length > 0 ? normalizedDescription : existingActivity;
      const normalizedActivityValue =
        typeof activity === 'string' && activity.trim().length > 0 ? activity.trim() : null;

      const updatePayload: Partial<TimeLogFormData> = {
        data_fim: isoNow,
        atividade: normalizedActivityValue,
      };

      const { data, error: updateError } = await supabase
        .from('time_logs')
        .update(buildSupabasePayload(updatePayload) as TimeLogUpdate)
        .eq('id', openLog.id)
        .select()
        .single();

      let updatedRecord: TimeLogRow;

      if (updateError) {
        if (isMissingAtividadeColumnError(updateError)) {
          console.warn('Coluna atividade ausente em time_logs. Fazendo fallback para observacoes.');

          const fallbackPayload: Partial<TimeLogFormData> = {
            data_fim: isoNow,
            observacoes: normalizedActivityValue,
          };

          const { data: fallbackData, error: fallbackError } = await supabase
            .from('time_logs')
            .update(buildSupabasePayload(fallbackPayload) as TimeLogUpdate)
            .eq('id', openLog.id)
            .select()
            .single();

          if (fallbackError) throw fallbackError;
          updatedRecord = fallbackData as TimeLogRow;
        } else {
          throw updateError;
        }
      } else {
        updatedRecord = data as TimeLogRow;
      }

      const normalized = normalizeTimeLogRecord(updatedRecord);

      setTimeLogs(prev => {
        const hasLog = prev.some(log => log.id === normalized.id);
        if (hasLog) {
          return prev.map(log => (log.id === normalized.id ? normalized : log));
        }
        return [normalized, ...prev];
      });

      try {
        const summaryParts: string[] = [];
        if (normalized.tempo_formatado) {
          summaryParts.push(`Tempo registrado: ${normalized.tempo_formatado}`);
        }
        const activitySummary = normalizedActivityValue ?? '';
        if (activitySummary.length > 0) {
          summaryParts.push(`Atividade: ${activitySummary}`);
        }

        const activityPayload: TaskActivityInsert = {
          task_id: taskId,
          actor_id: user.id,
          kind: 'system.time_log',
          title:
            typeof options?.taskName === 'string' && options.taskName.trim().length > 0
              ? `Tempo registrado - ${options.taskName.trim()}`
              : 'Tempo registrado via cronômetro',
          message:
            summaryParts.length > 0
              ? summaryParts.join(' • ')
              : 'Tempo registrado via Gestão de Tarefas.',
          payload: {
            time_log_id: normalized.id,
            tempo_formatado: normalized.tempo_formatado ?? null,
            data_inicio: normalized.data_inicio ?? null,
            data_fim: normalized.data_fim ?? null,
            atividade: normalizedActivityValue,
            observacoes: normalized.observacoes ?? null,
          } as TaskActivityInsert['payload'],
        };

        const { error: activityError } = await supabase
          .from('task_activities')
          .insert(activityPayload);

        if (activityError) {
          console.error('Erro ao registrar atividade de tempo:', activityError);
        }
      } catch (activityError) {
        console.error('Erro inesperado ao registrar atividade de tempo:', activityError);
      }

      toast({
        title: 'Sucesso',
        description: 'Tempo registrado com sucesso',
      });

      return normalized;
    } catch (error) {
      console.error('Erro ao finalizar log de tempo:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível finalizar o registro de tempo.',
        variant: 'destructive',
      });
      return null;
    }
  };

  const deleteTimeLog = async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('time_logs')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setTimeLogs(prev => prev.filter(log => log.id !== id));

      toast({
        title: 'Sucesso',
        description: 'Log de tempo deletado',
      });

      return true;
    } catch (error) {
      console.error('Erro ao deletar log de tempo:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível deletar o log de tempo',
        variant: 'destructive',
      });
      return false;
    }
  };

  const shouldCountLogTime = (log: TimeLog): boolean => {
    return log.status_aprovacao !== 'reprovado';
  };

  const normalizeMinutes = (minutes: number): number => {
    if (!Number.isFinite(minutes)) {
      return 0;
    }
    return Math.max(0, minutes);
  };

  const getLogDurationSeconds = (log: TimeLog): number => {
    if (typeof log.data_inicio === 'string' && typeof log.data_fim === 'string') {
      const startMs = Date.parse(log.data_inicio);
      const endMs = Date.parse(log.data_fim);
      if (Number.isFinite(startMs) && Number.isFinite(endMs) && endMs >= startMs) {
        return Math.max(0, Math.round((endMs - startMs) / 1000));
      }
    }

    const normalizedMinutes = normalizeMinutes(log.tempo_trabalhado ?? 0);
    return Math.max(0, Math.round(normalizedMinutes * 60));
  };

  const getLogDurationMinutes = (log: TimeLog): number => {
    const seconds = getLogDurationSeconds(log);
    return seconds / 60;
  };

  const getTaskTotalTime = (taskId: string): number => {
    return timeLogs
      .filter(log => log.task_id === taskId && shouldCountLogTime(log))
      .reduce((total, log) => total + getLogDurationMinutes(log), 0);
  };

  const getProjectTotalTime = (): number => {
    return timeLogs
      .filter(shouldCountLogTime)
      .reduce((total, log) => total + getLogDurationMinutes(log), 0);
  };

  const getResponsibleTotalTime = useCallback(
    (assignments: Array<{ taskId: string; responsavel?: string | null }>): Record<string, number> => {
      if (!Array.isArray(assignments) || assignments.length === 0) {
        return {};
      }

      const taskTimeCache = new Map<string, number>();
      assignments.forEach(({ taskId }) => {
        if (!taskId || taskTimeCache.has(taskId)) {
          return;
        }
        taskTimeCache.set(taskId, getTaskTotalTime(taskId));
      });

      return assignments.reduce<Record<string, number>>((acc, { taskId, responsavel }) => {
        if (!taskId || typeof responsavel !== 'string') {
          return acc;
        }

        const trimmedResponsavel = responsavel.trim();
        if (!trimmedResponsavel) {
          return acc;
        }

        const minutes = taskTimeCache.get(taskId) ?? 0;
        const safeMinutes = Number.isFinite(minutes) ? Math.max(0, minutes) : 0;
        acc[trimmedResponsavel] = (acc[trimmedResponsavel] ?? 0) + safeMinutes;
        return acc;
      }, {});
    },
    [timeLogs],
  );

  return {
    timeLogs,
    loading,
    createTimeLog,
    updateTimeLog,
    approveTimeLog,
    startTimerLog,
    stopTimerLog,
    deleteTimeLog,
    getTaskTotalTime,
    getProjectTotalTime,
    getResponsibleTotalTime,
    refreshTimeLogs: loadTimeLogs,
  };
}

export async function getTaskTotalSeconds({
  taskId,
  userId,
}: {
  taskId: string;
  userId: string;
}): Promise<number> {
  const { data, error } = await supabase
    .rpc('sum_time_logs_seconds', { p_task_id: taskId, p_user_id: userId });

  if (error) throw error;
  return (data ?? 0) as number;
}

export async function getTaskTotalHMS({
  taskId,
  userId,
}: {
  taskId: string;
  userId: string;
}): Promise<string> {
  const { data, error } = await supabase
    .rpc('sum_time_logs_hms', { p_task_id: taskId, p_user_id: userId });

  if (error) throw error;
  return (data ?? '00:00:00') as string;
}
