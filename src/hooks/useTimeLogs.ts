import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { TimeLog, TimeLogFormData, ApprovalStatus, TimeEntryType } from '@/types/time-log';
import { useToast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';
import { sanitizeTimeLogPayload } from '@/hooks/utils/timeLogPayload';

type TimeLogRow = Database['public']['Tables']['time_logs']['Row'];
type TimeLogInsert = Database['public']['Tables']['time_logs']['Insert'];
type TimeLogUpdate = Database['public']['Tables']['time_logs']['Update'];
type TaskActivityInsert = Database['public']['Tables']['task_activities']['Insert'];

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

const extractApprovalDateTimeParts = (
  isoString: string | null | undefined,
): { date: string | null; time: string | null } => {
  if (!isoString || typeof isoString !== 'string') {
    return { date: null, time: null };
  }

  const [datePartRaw, timePartRaw] = isoString.split('T');
  const datePart = datePartRaw && datePartRaw.trim().length > 0 ? datePartRaw.trim() : null;

  if (!timePartRaw) {
    return { date: datePart, time: null };
  }

  const withoutFraction = timePartRaw.split('.')[0] ?? timePartRaw;
  const timezoneIndex = withoutFraction.search(/[+-]/);
  const sliced = timezoneIndex >= 0 ? withoutFraction.slice(0, timezoneIndex) : withoutFraction;
  const withoutTimezone = sliced.replace(/Z$/i, '');
  const trimmedTime = withoutTimezone.trim();
  const timePart = trimmedTime.length > 0 ? trimmedTime.slice(0, 8) : null;

  return { date: datePart, time: timePart };
};

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
  const normalizedAprovado = (() => {
    if (typeof log.aprovado === 'string') {
      const trimmed = log.aprovado.trim().toUpperCase();
      if (trimmed === 'SIM' || trimmed === 'NÃO') {
        return trimmed as 'SIM' | 'NÃO';
      }
    }
    return null;
  })();

  const normalizedComissionado = (() => {
    if (typeof log.comissionado === 'boolean') {
      return log.comissionado;
    }

    if (typeof log.comissionado === 'string') {
      const trimmed = log.comissionado.trim().toUpperCase();
      if (trimmed === 'SIM') {
        return true;
      }

      if (trimmed === 'NÃO') {
        return false;
      }
    }

    const legacyFaturavel = (log as { faturavel?: boolean | null }).faturavel;
    if (typeof legacyFaturavel === 'boolean') {
      return legacyFaturavel;
    }

    return null;
  })();

  const legacyBillable = (log as { is_billable?: boolean | null }).is_billable;
  const comissionado =
    typeof normalizedComissionado === 'boolean'
      ? normalizedComissionado
      : typeof legacyBillable === 'boolean'
        ? legacyBillable
        : false;
  const normalizedBillable = typeof legacyBillable === 'boolean' ? legacyBillable : comissionado;

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

  const normalizedApprovalStatus = (() => {
    const rawStatus = (log as { approval_status?: string | null }).approval_status;

    if (typeof rawStatus === 'string') {
      const trimmed = rawStatus.trim();

      if (trimmed.length > 0) {
        return trimmed as TimeLog['approval_status'];
      }
    }

    if (typeof log.status_aprovacao === 'string') {
      const normalized = log.status_aprovacao.trim().toLowerCase();

      if (normalized === 'aprovado') {
        return 'Aprovado';
      }

      if (normalized === 'reprovado') {
        return 'Reprovado';
      }

      if (normalized === 'pendente') {
        return 'Aguarda Aprovação';
      }
    }

    return null;
  })();

  const normalizedApprovedBy =
    (log as { approved_by?: string | null }).approved_by ?? log.aprovador_id ?? null;

  const normalizedApprovedAt =
    (log as { approved_at?: string | null }).approved_at ?? log.data_aprovacao ?? null;

  const approvalParts = extractApprovalDateTimeParts(approvalIso);

  return {
    ...log,
    comissionado,
    aprovado: normalizedAprovado,
    is_billable: normalizedBillable,
    aprovador_nome: log.aprovador_nome ?? null,
    aprovacao_data: log.aprovacao_data ?? approvalParts.date,
    aprovacao_hora: log.aprovacao_hora ?? approvalParts.time,
    justificativa_reprovacao: log.justificativa_reprovacao ?? null,
    approval_status: normalizedApprovalStatus,
    approved_by: normalizedApprovedBy,
    approved_at: normalizedApprovedAt,
    tempo_trabalhado: safeMinutes,
    tempo_formatado: formatHMS(safeSeconds),
    data_aprovacao: approvalIso,
    observacoes: normalizedObservacoes,
    atividade: normalizedActivity,
  } satisfies TimeLog;
};

const LEGACY_INCOMPATIBLE_COLUMNS: (keyof TimeLogFormData)[] = [
  'approval_status',
  'approved_by',
  'approved_at',
  'is_billable',
  'aprovacao_data',
  'aprovacao_hora',
];

const LEGACY_SCHEMA_ERROR_CODES = new Set(['42703', 'PGRST204']);

const APPROVAL_STATUS_LABELS: Record<ApprovalStatus, TimeLog['approval_status']> = {
  pendente: 'Aguarda Aprovação',
  aprovado: 'Aprovado',
  reprovado: 'Reprovado',
};

const APPROVED_FLAG_MAP: Record<ApprovalStatus, TimeLog['aprovado']> = {
  pendente: null,
  aprovado: 'SIM',
  reprovado: 'NÃO',
};

export function useTimeLogs(projectId?: string) {
  const [timeLogs, setTimeLogs] = useState<TimeLog[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const legacyApprovalSchemaRef = useRef(false);

  const buildSupabasePayload = useCallback(
    (payload: Partial<TimeLogFormData>): Record<string, unknown> => {
      const sanitized = sanitizeTimeLogPayload(payload as Record<string, unknown>);

      if (!legacyApprovalSchemaRef.current) {
        return sanitized;
      }

      for (const column of LEGACY_INCOMPATIBLE_COLUMNS) {
        if (column in sanitized) {
          delete sanitized[column];
        }
      }

      return sanitized;
    },
    [legacyApprovalSchemaRef],
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
        approval_status: 'Aguarda Aprovação',
        aprovador_id: null,
        aprovador_nome: null,
        approved_by: null,
        data_aprovacao: null,
        approved_at: null,
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
    options?: {
      justificativa?: string | null;
      commissioned?: boolean;
      performedAt?: Date;
      approverName?: string | null;
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

      const providedPerformedAt = options?.performedAt;
      const performedAt = providedPerformedAt instanceof Date ? providedPerformedAt : null;
      const isoString = (performedAt ?? new Date()).toISOString();

      const existingLog = timeLogs.find(log => log.id === id) ?? null;
      const existingCommissioned =
        (existingLog?.comissionado ?? null) === true || existingLog?.is_billable === true;

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

      const overrideApprover = options?.approverName;
      if (typeof overrideApprover === 'string') {
        const trimmed = overrideApprover.trim();
        if (trimmed.length > 0) {
          approverName = trimmed;
        }
      } else if (overrideApprover === null) {
        approverName = null;
      }

      const hasJustificationOverride =
        options !== undefined && Object.prototype.hasOwnProperty.call(options, 'justificativa');
      const rawJustification = options?.justificativa ?? null;
      const normalizedJustification =
        typeof rawJustification === 'string' ? rawJustification.trim() : rawJustification;
      const rejectionReason =
        normalizedJustification && normalizedJustification.length > 0
          ? normalizedJustification
          : null;
      const hasCommissionedOverride =
        options !== undefined && Object.prototype.hasOwnProperty.call(options, 'commissioned');
      const commissionedBool =
        status === 'aprovado'
          ? hasCommissionedOverride
            ? Boolean(options?.commissioned)
            : existingCommissioned
          : false;
      if (
        status === 'reprovado' &&
        hasJustificationOverride &&
        (!rejectionReason || rejectionReason.length === 0)
      ) {
        toast({
          title: 'Justificativa obrigatória',
          description: 'Informe uma justificativa para reprovar o tempo registrado.',
          variant: 'destructive',
        });
        return null;
      }

      const { data: rpcData, error: rpcError } = await supabase.rpc('approve_time_log', {
        p_time_log_id: id,
        p_status: status,
        p_commissioned: commissionedBool,
        p_performed_at: isoString,
        p_approver_name: approverName,
        p_rejection_reason: rejectionReason,
      });

      let updatedRow: TimeLogRow | null = null;

      if (rpcError) {
        if (rpcError.code === 'PGRST202') {
          console.warn('Função approve_time_log indisponível. Aplicando fallback de compatibilidade.', rpcError);

          const effectiveCommissioned = status === 'aprovado' ? commissionedBool : false;
          const normalizedApproverName =
            approverName && approverName.trim().length > 0 ? approverName.trim() : null;
          const fallbackApproverName =
            status === 'pendente'
              ? null
              : normalizedApproverName ?? existingLog?.aprovador_nome ?? null;
          const performedAtIso = status === 'pendente' ? null : isoString;
          const { date: approvalDatePart, time: approvalTimePart } =
            extractApprovalDateTimeParts(performedAtIso ?? undefined);

          const fallbackPayload = sanitizeTimeLogPayload({
            status_aprovacao: status,
            approval_status: APPROVAL_STATUS_LABELS[status],
            aprovado: APPROVED_FLAG_MAP[status],
            comissionado: effectiveCommissioned,
            is_billable: effectiveCommissioned,
            aprovador_id: status === 'pendente' ? null : user.id,
            approved_by: status === 'pendente' ? null : user.id,
            aprovador_nome: fallbackApproverName,
            data_aprovacao: performedAtIso,
            approved_at: performedAtIso,
            aprovacao_data: approvalDatePart,
            aprovacao_hora: approvalTimePart,
            justificativa_reprovacao: status === 'reprovado' ? rejectionReason : null,
            observacoes: status === 'reprovado' ? rejectionReason ?? null : undefined,
            updated_at: new Date().toISOString(),
          });

          const attemptLegacyUpdate = async (
            payload: Record<string, unknown>,
            allowRetry: boolean,
          ): Promise<TimeLogRow> => {
            const { data: updateData, error: updateError } = await supabase
              .from('time_logs')
              .update(payload as TimeLogUpdate)
              .eq('id', id)
              .select()
              .single();

            if (updateError) {
              if (allowRetry && updateError.code === '42703') {
                const trimmedPayload = { ...payload };
                for (const column of LEGACY_INCOMPATIBLE_COLUMNS) {
                  if (column in trimmedPayload) {
                    delete trimmedPayload[column];
                  }
                }
                legacyApprovalSchemaRef.current = true;
                return attemptLegacyUpdate(trimmedPayload, false);
              }

              throw updateError;
            }

            if (!updateData) {
              throw new Error(
                'Nenhum dado retornado ao atualizar aprovação do tempo (modo compatibilidade).',
              );
            }

            return updateData as TimeLogRow;
          };

          updatedRow = await attemptLegacyUpdate(fallbackPayload, true);
          legacyApprovalSchemaRef.current = true;
        } else {
          throw rpcError;
        }
      } else {
        updatedRow = rpcData as TimeLogRow | null;
      }

      if (!updatedRow) {
        throw new Error('Nenhum dado retornado ao atualizar aprovação do tempo.');
      }

      const normalized = normalizeTimeLogRecord(updatedRow);

      setTimeLogs(prev => prev.map(log => (log.id === id ? normalized : log)));

      toast({
        title: 'Sucesso',
        description: `Tempo ${status === 'aprovado' ? 'aprovado' : 'reprovado'} com sucesso`,
      });

      return normalized;
    } catch (error) {
      console.error('Erro ao aprovar/reprovar tempo:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar o status',
        variant: 'destructive',
      });
      return null;
    }
  };

  const startTimerLog = async (
    taskId: string,
    options?: {
      tipo_inclusao?: TimeEntryType;
      tipoInclusao?: TimeEntryType;
      data_inicio?: string;
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

      const providedStartFromString = (() => {
        if (typeof options?.data_inicio === 'string') {
          const parsed = new Date(options.data_inicio);
          return Number.isNaN(parsed.getTime()) ? null : parsed;
        }
        return null;
      })();

      const providedStartFromDate = (() => {
        if (options?.startedAt instanceof Date) {
          return Number.isNaN(options.startedAt.getTime()) ? null : options.startedAt;
        }
        return null;
      })();

      const effectiveStartDate = providedStartFromString ?? providedStartFromDate ?? new Date();
      const isoStart = providedStartFromString?.toISOString() ?? effectiveStartDate.toISOString();
      const effectiveEntryType = options?.tipo_inclusao ?? options?.tipoInclusao ?? 'timer';

      const payload: Partial<TimeLogFormData> = {
        task_id: taskId,
        project_id: projectId,
        user_id: user.id,
        tipo_inclusao: effectiveEntryType,
        data_inicio: isoStart,
        data_fim: null,
        status_aprovacao: 'pendente',
        approval_status: 'Aguarda Aprovação',
        observacoes: options?.observacoes ?? null,
        aprovador_id: null,
        aprovador_nome: null,
        approved_by: null,
        data_aprovacao: null,
        approved_at: null,
      };

      const attemptInsert = async (allowRetry: boolean): Promise<TimeLogRow> => {
        const { data, error } = await supabase
          .from('time_logs')
          .insert(buildSupabasePayload(payload) as TimeLogInsert)
          .select()
          .single();

        if (error) {
          if (allowRetry && LEGACY_SCHEMA_ERROR_CODES.has(error.code ?? '')) {
            legacyApprovalSchemaRef.current = true;
            return attemptInsert(false);
          }

          throw error;
        }

        if (!data) {
          throw new Error('Nenhum dado retornado ao iniciar o log de tempo.');
        }

        return data as TimeLogRow;
      };

      const insertedRow = await attemptInsert(true);

      const normalized = normalizeTimeLogRecord(insertedRow);

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
      timeLogId?: string | null;
      existingActivity?: string | null;
      startedAtMs?: number | null;
      allowCreateIfMissing?: boolean;
      suppressSuccessToast?: boolean;
    },
  ): Promise<TimeLog | null> => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        toast({
          title: 'Erro',
          description: 'Você precisa estar autenticado',
          variant: 'destructive',
        });
        return null;
      }

      const normalizedLogId =
        typeof options?.timeLogId === 'string' && options.timeLogId.trim().length > 0
          ? options.timeLogId.trim()
          : null;

      let openLog: TimeLogRow | null = null;

      if (!normalizedLogId || !options?.existingActivity) {
        const baseQuery = supabase
          .from('time_logs')
          .select('*')
          .eq('user_id', user.id)
          .is('data_fim', null)
          .order('data_inicio', { ascending: false })
          .limit(1);

        if (normalizedLogId) {
          baseQuery.eq('id', normalizedLogId);
        } else {
          baseQuery.eq('task_id', taskId);
        }

        const { data: fetchedLog, error: selectError } = await baseQuery.maybeSingle();

        if (selectError) throw selectError;

        openLog = (fetchedLog as TimeLogRow | null) ?? null;
      }

      const nowMs = Date.now();
      const isoNow = new Date(nowMs).toISOString();

      const normalizedDescription =
        typeof options?.activityDescription === 'string'
          ? options.activityDescription.trim()
          : '';
      const existingActivity = (() => {
        if (typeof options?.existingActivity === 'string') {
          const trimmed = options.existingActivity.trim();
          if (trimmed.length > 0) {
            return trimmed;
          }
        }

        if (typeof openLog?.atividade === 'string') {
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

      const fallbackStartedAtMs = (() => {
        if (typeof openLog?.data_inicio === 'string') {
          const parsed = Date.parse(openLog.data_inicio);
          if (Number.isFinite(parsed)) {
            return Math.min(parsed, nowMs);
          }
        }
        if (typeof options?.startedAtMs === 'number' && Number.isFinite(options.startedAtMs)) {
          return Math.min(options.startedAtMs, nowMs);
        }
        return null;
      })();

      const shouldAttemptCreate = options?.allowCreateIfMissing !== false;
      const shouldShowSuccessToast = options?.suppressSuccessToast !== true;

      const registerTimeLogActivity = async (log: TimeLog) => {
        try {
          const summaryParts: string[] = [];
          if (log.tempo_formatado) {
            summaryParts.push(`Tempo registrado: ${log.tempo_formatado}`);
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
              time_log_id: log.id,
              tempo_formatado: log.tempo_formatado ?? null,
              data_inicio: log.data_inicio ?? null,
              data_fim: log.data_fim ?? null,
              atividade: normalizedActivityValue,
              observacoes: log.observacoes ?? null,
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
      };

      const createLogFromFallback = async (): Promise<TimeLog | null> => {
        if (!shouldAttemptCreate || !fallbackStartedAtMs) {
          toast({
            title: 'Cronômetro não encontrado',
            description: 'Nenhum apontamento em andamento foi localizado para esta tarefa.',
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

        const startIso = new Date(fallbackStartedAtMs).toISOString();

        const insertPayload: Partial<TimeLogFormData> = {
          task_id: taskId,
          project_id: projectId,
          user_id: user.id,
          tipo_inclusao: 'timer',
          data_inicio: startIso,
          data_fim: isoNow,
          atividade: normalizedActivityValue,
          status_aprovacao: 'pendente',
          approval_status: 'Aguarda Aprovação',
          observacoes: null,
          aprovador_id: null,
          aprovador_nome: null,
          approved_by: null,
          data_aprovacao: null,
          approved_at: null,
        };

        const attemptInsert = async (allowRetry: boolean): Promise<TimeLogRow> => {
          const { data: insertedData, error: insertError } = await supabase
            .from('time_logs')
            .insert(buildSupabasePayload(insertPayload) as TimeLogInsert)
            .select()
            .single();

          if (insertError) {
            if (allowRetry && LEGACY_SCHEMA_ERROR_CODES.has(insertError.code ?? '')) {
              legacyApprovalSchemaRef.current = true;
              return attemptInsert(false);
            }

            throw insertError;
          }

          if (!insertedData) {
            throw new Error('Nenhum dado retornado ao registrar novo log de tempo.');
          }

          return insertedData as TimeLogRow;
        };

        const insertedRow = await attemptInsert(true);

        const normalized = normalizeTimeLogRecord(insertedRow);

        setTimeLogs(prev => [normalized, ...prev.filter(log => log.id !== normalized.id)]);

        await registerTimeLogActivity(normalized);

        if (shouldShowSuccessToast) {
          toast({
            title: 'Sucesso',
            description: 'Tempo registrado com sucesso',
          });
        }

        return normalized;
      };

      const logIdToUpdate = normalizedLogId ?? openLog?.id ?? null;

      if (!logIdToUpdate) {
        return await createLogFromFallback();
      }

      const updatePayload: Partial<TimeLogFormData> = {
        data_fim: isoNow,
        atividade: normalizedActivityValue,
      };

      const attemptUpdate = async (allowRetry: boolean): Promise<TimeLogRow | 'fallback'> => {
        const { data, error: updateError } = await supabase
          .from('time_logs')
          .update(buildSupabasePayload(updatePayload) as TimeLogUpdate)
          .eq('id', logIdToUpdate)
          .eq('task_id', taskId)
          .eq('user_id', user.id)
          .select()
          .single();

        if (updateError) {
          if (updateError.code === 'PGRST116') {
            return 'fallback';
          }

          if (allowRetry && LEGACY_SCHEMA_ERROR_CODES.has(updateError.code ?? '')) {
            legacyApprovalSchemaRef.current = true;
            return attemptUpdate(false);
          }

          throw updateError;
        }

        if (!data) {
          throw new Error('Nenhum dado retornado ao finalizar o log de tempo.');
        }

        return data as TimeLogRow;
      };

      const updatedRowOrFallback = await attemptUpdate(true);

      if (updatedRowOrFallback === 'fallback') {
        return await createLogFromFallback();
      }

      const normalized = normalizeTimeLogRecord(updatedRowOrFallback);

      setTimeLogs(prev => {
        const hasLog = prev.some(log => log.id === normalized.id);
        if (hasLog) {
          return prev.map(log => (log.id === normalized.id ? normalized : log));
        }
        return [normalized, ...prev];
      });

      await registerTimeLogActivity(normalized);

      if (shouldShowSuccessToast) {
        toast({
          title: 'Sucesso',
          description: 'Tempo registrado com sucesso',
        });
      }

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

  const deleteTimeLog = async (
    id: string,
    options?: {
      suppressToast?: boolean;
    },
  ): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('time_logs')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setTimeLogs(prev => prev.filter(log => log.id !== id));

      if (options?.suppressToast !== true) {
        toast({
          title: 'Sucesso',
          description: 'Log de tempo deletado',
        });
      }

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
