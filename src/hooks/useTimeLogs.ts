import { useState, useEffect, useCallback } from 'react';
import type { PostgrestError } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { TimeLog, TimeLogFormData, ApprovalStatus, TimeEntryType } from '@/types/time-log';
import { useToast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';

type TimeLogRow = Database['public']['Tables']['time_logs']['Row'];

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

const formatDurationFromSeconds = (totalSeconds: number): string => {
  const safeSeconds = Number.isFinite(totalSeconds) ? Math.max(0, Math.round(totalSeconds)) : 0;
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  const pad = (value: number) => value.toString().padStart(2, '0');

  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
};

const removeApproverNameField = (payload: Partial<TimeLogFormData>): Partial<TimeLogFormData> => {
  const cloned = { ...payload } as Record<string, unknown>;
  delete cloned.aprovador_nome;
  return cloned as Partial<TimeLogFormData>;
};

const omitApprovalFragments = (payload: Partial<TimeLogFormData>): Partial<TimeLogFormData> => {
  const cloned = { ...payload } as Record<string, unknown>;
  delete cloned.aprovacao_data;
  delete cloned.aprovacao_hora;
  return cloned as Partial<TimeLogFormData>;
};

const isMissingApproverNameColumnError = (error: unknown): error is PostgrestError => {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const typedError = error as PostgrestError;
  return (
    typedError.code === 'PGRST204' &&
    typeof typedError.message === 'string' &&
    typedError.message.includes("aprovador_nome")
  );
};

const normalizeTimeLogRecord = (log: TimeLogRow): TimeLog => {
  const rawMinutes = parseNumericValue(log.tempo_minutos, 0);
  const rawSeconds = parseNumericValue(log.tempo_segundos, 0);

  const derivedSecondsFromMinutes = Math.max(0, Math.round(rawMinutes * 60));
  const safeSecondsCandidate = rawSeconds > 0 ? rawSeconds : derivedSecondsFromMinutes;
  const safeSeconds = Math.max(0, Math.round(safeSecondsCandidate));
  const safeMinutes = safeSeconds / 60;

  const formattedDuration =
    typeof log.tempo_formatado === 'string' && log.tempo_formatado.trim().length > 0
      ? log.tempo_formatado
      : formatDurationFromSeconds(safeSeconds);

  const approvalIso =
    typeof log.data_aprovacao === 'string' && log.data_aprovacao.trim().length > 0
      ? log.data_aprovacao
      : null;

  let approvalDatePart: string | null = null;
  let approvalTimePart: string | null = null;

  if (approvalIso) {
    const [datePart, timePartWithMs] = approvalIso.split('T');
    approvalDatePart = datePart ?? null;
    approvalTimePart = timePartWithMs ? timePartWithMs.split('.')[0] ?? null : null;
  }

  return {
    ...log,
    tempo_minutos: safeMinutes,
    tempo_segundos: safeSeconds,
    tempo_formatado: formattedDuration,
    data_aprovacao: approvalIso,
    aprovacao_data: approvalDatePart,
    aprovacao_hora: approvalTimePart,
  } satisfies TimeLog;
};

export function useTimeLogs(projectId?: string) {
  const [timeLogs, setTimeLogs] = useState<TimeLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [supportsApproverNameColumn, setSupportsApproverNameColumn] = useState(true);
  const { toast } = useToast();

  const buildSupabasePayload = useCallback(
    (payload: Partial<TimeLogFormData>): Partial<TimeLogFormData> => {
      if (supportsApproverNameColumn) {
        return omitApprovalFragments(payload);
      }

      return omitApprovalFragments(removeApproverNameField(payload));
    },
    [supportsApproverNameColumn],
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
        justificativa_reprovacao: null,
        data_aprovacao: null,
      };

      let response = await supabase
        .from('time_logs')
        .insert(buildSupabasePayload(payload) as any)
        .select()
        .single();

      if (response.error && isMissingApproverNameColumnError(response.error) && supportsApproverNameColumn) {
        setSupportsApproverNameColumn(false);
        response = await supabase
          .from('time_logs')
          .insert(omitApprovalFragments(removeApproverNameField(payload)) as any)
          .select()
          .single();
      }

      if (response.error) throw response.error;

      toast({
        title: 'Sucesso',
        description: 'Tempo registrado com sucesso',
      });

      const normalized = normalizeTimeLogRecord(response.data as TimeLogRow);

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

      let response = await supabase
        .from('time_logs')
        .update(supabaseUpdates as any)
        .eq('id', id)
        .select()
        .single();

      if (response.error && isMissingApproverNameColumnError(response.error) && supportsApproverNameColumn) {
        setSupportsApproverNameColumn(false);
        response = await supabase
          .from('time_logs')
          .update(omitApprovalFragments(removeApproverNameField(updates)) as any)
          .eq('id', id)
          .select()
          .single();
      }

      if (response.error) throw response.error;

      toast({
        title: 'Sucesso',
        description: 'Log de tempo atualizado',
      });

      const normalized = normalizeTimeLogRecord(response.data as TimeLogRow);

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
    options?: { justificativa?: string | null },
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

      const now = new Date();
      const isoString = now.toISOString();
      const [datePart, timePartWithMs] = isoString.split('T');
      const approvalTime = timePartWithMs ? timePartWithMs.split('.')[0] : null;
      const trimmedJustificativa = options?.justificativa?.trim() ?? null;

      if (status === 'reprovado' && (!trimmedJustificativa || trimmedJustificativa.length === 0)) {
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
        aprovador_nome: (user.user_metadata as any)?.full_name ?? user.email ?? user.id,
        justificativa_reprovacao: status === 'reprovado' ? trimmedJustificativa : null,
      };

      if (status === 'aprovado') {
        approvalUpdates.data_aprovacao = isoString;
        approvalUpdates.aprovacao_data = datePart ?? null;
        approvalUpdates.aprovacao_hora = approvalTime;
      } else {
        approvalUpdates.data_aprovacao = null;
        approvalUpdates.aprovacao_data = null;
        approvalUpdates.aprovacao_hora = null;
      }

      const supabaseUpdates = buildSupabasePayload(approvalUpdates);

      let { error } = await supabase
        .from('time_logs')
        .update(supabaseUpdates as any)
        .eq('id', id);

      if (error && isMissingApproverNameColumnError(error) && supportsApproverNameColumn) {
        setSupportsApproverNameColumn(false);
        const fallback = await supabase
          .from('time_logs')
          .update(omitApprovalFragments(removeApproverNameField(approvalUpdates)) as any)
          .eq('id', id);
        error = fallback.error;
      }

      if (error) throw error;

      setTimeLogs(prev =>
        prev.map(log => {
          if (log.id !== id) {
            return log;
          }

          return {
            ...log,
            status_aprovacao: status,
            aprovador_id: user.id,
            aprovador_nome: (user.user_metadata as any)?.full_name ?? user.email ?? user.id,
            justificativa_reprovacao: status === 'reprovado' ? trimmedJustificativa : null,
            data_aprovacao: status === 'aprovado' ? isoString : null,
            aprovacao_data: status === 'aprovado' ? datePart ?? null : null,
            aprovacao_hora: status === 'aprovado' ? approvalTime : null,
          } satisfies TimeLog;
        }),
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
        tipo_inclusao: options?.tipoInclusao ?? 'automatico',
        tempo_minutos: 0,
        tempo_segundos: 0,
        tempo_formatado: '00:00:00',
        data_inicio: isoStart,
        data_fim: null,
        status_aprovacao: 'pendente',
        observacoes: options?.observacoes ?? null,
        aprovador_id: null,
        aprovador_nome: null,
        data_aprovacao: null,
        justificativa_reprovacao: null,
      };

      let response = await supabase
        .from('time_logs')
        .insert(buildSupabasePayload(payload) as any)
        .select()
        .single();

      if (response.error && isMissingApproverNameColumnError(response.error) && supportsApproverNameColumn) {
        setSupportsApproverNameColumn(false);
        response = await supabase
          .from('time_logs')
          .insert(omitApprovalFragments(removeApproverNameField(payload)) as any)
          .select()
          .single();
      }

      if (response.error) throw response.error;

      const normalized = normalizeTimeLogRecord(response.data as TimeLogRow);

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

  const stopTimerLog = async (taskId: string): Promise<TimeLog | null> => {
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

      const startTimestamp =
        typeof openLog.data_inicio === 'string' && openLog.data_inicio
          ? new Date(openLog.data_inicio).getTime()
          : Date.now();
      const nowMs = Date.now();
      const deltaSeconds = Math.max(0, Math.ceil((nowMs - startTimestamp) / 1000));

      const previousSecondsRaw = parseNumericValue(openLog.tempo_segundos, 0);
      const previousMinutesRaw = parseNumericValue(openLog.tempo_minutos, 0);
      const previousSeconds = Math.max(0, Math.round(previousSecondsRaw));
      const previousMinutes = Math.max(0, previousMinutesRaw);
      const previousTotalSeconds =
        previousSeconds > 0 ? previousSeconds : Math.round(previousMinutes * 60);

      const totalSeconds = previousTotalSeconds + deltaSeconds;
      const totalMinutes = Number(((totalSeconds) / 60).toFixed(4));
      const formattedDuration = formatDurationFromSeconds(totalSeconds);
      const isoNow = new Date(nowMs).toISOString();

      const updatePayload = {
        data_fim: isoNow,
        tempo_minutos: Number.isFinite(totalMinutes) ? totalMinutes : 0,
        tempo_segundos: Math.max(0, Math.round(totalSeconds)),
        tempo_formatado: formattedDuration,
        updated_at: isoNow,
      };

      const { data, error: updateError } = await supabase
        .from('time_logs')
        .update(updatePayload as any)
        .eq('id', openLog.id)
        .select()
        .single();

      if (updateError) throw updateError;

      const normalized = normalizeTimeLogRecord(data as TimeLogRow);

      setTimeLogs(prev => {
        const hasLog = prev.some(log => log.id === normalized.id);
        if (hasLog) {
          return prev.map(log => (log.id === normalized.id ? normalized : log));
        }
        return [normalized, ...prev];
      });

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
    if (typeof log.tempo_segundos === 'number' && Number.isFinite(log.tempo_segundos)) {
      return Math.max(0, Math.round(log.tempo_segundos));
    }

    const normalizedMinutes = normalizeMinutes(log.tempo_minutos ?? 0);
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
