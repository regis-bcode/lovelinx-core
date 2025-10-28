import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { TimeLog, TimeLogFormData, ApprovalStatus, TimeEntryType } from '@/types/time-log';
import { useToast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';
import { sanitizeTimeLogPayload } from '@/hooks/utils/timeLogPayload';
import { useUserRoles } from '@/hooks/useUserRoles';

type TimeLogRow = Database['public']['Tables']['time_logs']['Row'];
type TimeLogInsert = Database['public']['Tables']['time_logs']['Insert'];
type TimeLogUpdate = Database['public']['Tables']['time_logs']['Update'];
type TaskActivityInsert = Database['public']['Tables']['task_activities']['Insert'];
type TimeDailyUsageRow = Database['public']['Functions']['get_time_daily_usage']['Returns'][number];

const DAILY_USAGE_KEY_SEPARATOR = '::';
const DEFAULT_USER_DAILY_LIMIT_HOURS = 8;
const HARD_CAP_MINUTES = 16 * 60;

const buildDailyUsageKey = (userId: string, logDate: string) =>
  `${userId}${DAILY_USAGE_KEY_SEPARATOR}${logDate}`;

const normalizeDateParam = (value: string | Date | null | undefined): string | null => {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString().slice(0, 10);
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();

    if (trimmed.length === 0) {
      return null;
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return trimmed;
    }

    const parsed = new Date(trimmed);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10);
  }

  return null;
};

export type StopTimerLogResult =
  | { status: 'success'; log: TimeLog }
  | { status: 'skipped'; reason: 'missing-active-log' | 'missing-start-time' };

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

const parseNullableNumber = (value: unknown): number | null => {
  const parsed = parseNumericValue(value, Number.NaN);
  return Number.isFinite(parsed) ? parsed : null;
};

const getNormalizedTimestamp = (value: unknown): string | null => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed.length > 0) {
      return trimmed;
    }
  }

  return null;
};

const computeDurationMinutesFromRow = (row: TimeLogRow): number | null => {
  const endedIso =
    getNormalizedTimestamp(row.ended_at) ??
    getNormalizedTimestamp((row as { data_fim?: string | null }).data_fim);

  if (!endedIso) {
    return null;
  }

  const durationColumn = parseNullableNumber(row.duration_minutes);
  if (durationColumn !== null) {
    return Math.max(0, durationColumn);
  }

  const tempoTrabalhado = parseNullableNumber(row.tempo_trabalhado);
  if (tempoTrabalhado !== null) {
    return Math.max(0, tempoTrabalhado);
  }

  const startedIso =
    getNormalizedTimestamp(row.started_at) ??
    getNormalizedTimestamp((row as { data_inicio?: string | null }).data_inicio);

  if (startedIso) {
    const startMs = Date.parse(startedIso);
    const endMs = Date.parse(endedIso);
    if (Number.isFinite(startMs) && Number.isFinite(endMs) && endMs >= startMs) {
      return Math.max(0, Math.round((endMs - startMs) / 60000));
    }
  }

  return 0;
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
      const trimmed = log.aprovado.trim();
      if (trimmed.length > 0) {
        const normalized = trimmed
          .normalize('NFD')
          .replace(/\p{Diacritic}/gu, '')
          .toLowerCase();
        if (normalized === 'sim') {
          return 'Sim';
        }
        if (normalized === 'nao') {
          return 'Não';
        }
      }
    }
    return null;
  })();

  const normalizedComissionado = (() => {
    if (typeof log.comissionado === 'boolean') {
      return log.comissionado;
    }

    if (typeof log.comissionado === 'string') {
      const trimmed = log.comissionado.trim();
      if (trimmed.length > 0) {
        const normalized = trimmed
          .normalize('NFD')
          .replace(/\p{Diacritic}/gu, '')
          .toLowerCase();
        if (normalized === 'sim') {
          return true;
        }

        if (normalized === 'nao') {
          return false;
        }
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

  const normalizedStartedAt = log.started_at ?? log.data_inicio ?? null;
  const normalizedEndedAt = log.ended_at ?? log.data_fim ?? null;
  const normalizedDurationMinutes = (() => {
    if (typeof log.duration_minutes === 'number' && Number.isFinite(log.duration_minutes)) {
      return Math.max(0, log.duration_minutes);
    }

    if (normalizedStartedAt && normalizedEndedAt) {
      const derived = Math.ceil((Date.parse(normalizedEndedAt) - Date.parse(normalizedStartedAt)) / 60000);
      return Number.isFinite(derived) ? Math.max(0, derived) : null;
    }

    const rounded = Math.round(safeMinutes);
    return Number.isFinite(rounded) ? Math.max(0, rounded) : null;
  })();

  const normalizedLogDate = (() => {
    const candidate = (log as { log_date?: string | null }).log_date;
    if (typeof candidate === 'string' && candidate.length > 0) {
      return candidate;
    }

    if (normalizedStartedAt) {
      const date = new Date(normalizedStartedAt);
      if (!Number.isNaN(date.getTime())) {
        return date.toISOString().slice(0, 10);
      }
    }

    return null;
  })();

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
    started_at: normalizedStartedAt,
    ended_at: normalizedEndedAt,
    duration_minutes: normalizedDurationMinutes,
    log_date: normalizedLogDate,
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
const LEGACY_APPROVAL_PERMISSION_ERROR = 'LEGACY_APPROVAL_PERMISSION_DENIED';
const LEGACY_APPROVAL_FUNCTION_MISSING_ERROR = 'LEGACY_APPROVAL_FUNCTION_MISSING';

type ErrorWithCode = { code?: string; cause?: unknown };

const createLegacyApprovalPermissionError = (originalError: unknown) => {
  const error = new Error(
    'A política de segurança bloqueou a aprovação utilizando o modo de compatibilidade.',
  );

  (error as ErrorWithCode).code = LEGACY_APPROVAL_PERMISSION_ERROR;
  (error as ErrorWithCode).cause = originalError;

  return error;
};

const isLegacyApprovalPermissionError = (value: unknown): value is Error & ErrorWithCode =>
  typeof value === 'object' &&
  value !== null &&
  'code' in value &&
  (value as ErrorWithCode).code === LEGACY_APPROVAL_PERMISSION_ERROR;

const createApproveTimeLogUnavailableError = (originalError: unknown) => {
  const error = new Error(
    'A função approve_time_log não está disponível no banco de dados atual.',
  );

  (error as ErrorWithCode).code = LEGACY_APPROVAL_FUNCTION_MISSING_ERROR;
  (error as ErrorWithCode).cause = originalError;

  return error;
};

const isApproveTimeLogUnavailableError = (
  value: unknown,
): value is Error & ErrorWithCode =>
  typeof value === 'object' &&
  value !== null &&
  'code' in value &&
  (value as ErrorWithCode).code === LEGACY_APPROVAL_FUNCTION_MISSING_ERROR;

const APPROVAL_STATUS_LABELS: Record<ApprovalStatus, TimeLog['approval_status']> = {
  pendente: 'Aguarda Aprovação',
  aprovado: 'Aprovado',
  reprovado: 'Reprovado',
};

const APPROVED_FLAG_MAP: Record<ApprovalStatus, TimeLog['aprovado']> = {
  pendente: null,
  aprovado: 'Sim',
  reprovado: 'Não',
};

export function useTimeLogs(projectId?: string) {
  const [timeLogs, setTimeLogs] = useState<TimeLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [dailyUsageMap, setDailyUsageMap] = useState<Record<string, TimeDailyUsageRow>>({});
  const { toast } = useToast();
  const { userRoles } = useUserRoles();
  const legacyApprovalSchemaRef = useRef(false);
  const legacyApprovalAttemptedRef = useRef(false);
  const hasApprovalPrivileges = useMemo(
    () => userRoles.includes('gestor') || userRoles.includes('admin'),
    [userRoles],
  );

  const storeDailyUsageRows = useCallback((rows: TimeDailyUsageRow[]) => {
    if (!Array.isArray(rows) || rows.length === 0) {
      return;
    }

    setDailyUsageMap(prev => {
      let changed = false;
      const next = { ...prev };

      for (const row of rows) {
        if (!row || !row.user_id || !row.log_date) {
          continue;
        }

        const key = buildDailyUsageKey(row.user_id, row.log_date);
        const existing = next[key];

        if (
          !existing ||
          existing.total_minutes !== row.total_minutes ||
          existing.tempo_estourado_minutes !== row.tempo_estourado_minutes ||
          existing.over_user_limit !== row.over_user_limit ||
          existing.over_hard_cap_16h !== row.over_hard_cap_16h ||
          existing.horas_liberadas_por_dia !== row.horas_liberadas_por_dia
        ) {
          next[key] = row;
          changed = true;
        }
      }

      return changed ? next : prev;
    });
  }, []);

  const clearDailyUsageMap = useCallback(() => {
    setDailyUsageMap({});
  }, []);

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

  const loadDailyUsageRange = useCallback(
    async (dateFrom: string | Date, dateTo: string | Date): Promise<TimeDailyUsageRow[]> => {
      const normalizedFrom = normalizeDateParam(dateFrom);
      const normalizedTo = normalizeDateParam(dateTo);

      if (!normalizedFrom || !normalizedTo) {
        return [];
      }

      const [rangeStart, rangeEnd] = [normalizedFrom, normalizedTo].sort();

      const fetchDailyUsageFallback = async (): Promise<TimeDailyUsageRow[]> => {
        const { data: rawLogs, error: rawLogsError } = await supabase
          .from('time_logs')
          .select('*')
          .gte('log_date', rangeStart)
          .lte('log_date', rangeEnd);

        if (rawLogsError) {
          throw rawLogsError;
        }

        const logs = (Array.isArray(rawLogs) ? rawLogs : []) as TimeLogRow[];

        const usageAccumulator = new Map<
          string,
          { userId: string; logDate: string; totalMinutes: number }
        >();

        logs.forEach(row => {
          if (!row?.user_id) {
            return;
          }

          const endedTimestamp =
            getNormalizedTimestamp(row.ended_at) ??
            getNormalizedTimestamp((row as { data_fim?: string | null }).data_fim);

          if (!endedTimestamp) {
            return;
          }

          const usageDate =
            normalizeDateParam(row.log_date) ?? normalizeDateParam(endedTimestamp);

          if (!usageDate) {
            return;
          }

          const durationMinutes = computeDurationMinutesFromRow(row);
          if (durationMinutes === null) {
            return;
          }

          const key = buildDailyUsageKey(row.user_id, usageDate);
          const existing = usageAccumulator.get(key);

          if (existing) {
            existing.totalMinutes += durationMinutes;
          } else {
            usageAccumulator.set(key, {
              userId: row.user_id,
              logDate: usageDate,
              totalMinutes: durationMinutes,
            });
          }
        });

        if (usageAccumulator.size === 0) {
          return [];
        }

        const userIds = Array.from(new Set(Array.from(usageAccumulator.values()).map(item => item.userId)));

        let userLimits = new Map<string, number | null>();
        try {
          if (userIds.length > 0) {
            const { data: usersData, error: usersError } = await supabase
              .from('users')
              .select('id, horas_liberadas_por_dia')
              .in('id', userIds);

            if (usersError) {
              throw usersError;
            }

            userLimits = new Map(
              (Array.isArray(usersData) ? usersData : [])
                .filter((user): user is { id: string; horas_liberadas_por_dia: unknown } =>
                  Boolean(user?.id),
                )
                .map(user => [user.id, parseNullableNumber(user.horas_liberadas_por_dia)]),
            );
          }
        } catch (limitError) {
          console.error('Erro ao buscar limites de horas diárias (fallback):', limitError);
        }

        const results: TimeDailyUsageRow[] = Array.from(usageAccumulator.values()).map(item => {
          const storedLimit = userLimits.get(item.userId);
          const hasCustomLimit = typeof storedLimit === 'number' && Number.isFinite(storedLimit);
          const rawLimitHours = hasCustomLimit ? storedLimit : null;
          const effectiveLimitHours = hasCustomLimit
            ? Math.max(0, storedLimit)
            : DEFAULT_USER_DAILY_LIMIT_HOURS;
          const totalMinutesRounded = Math.max(0, Math.round(item.totalMinutes));
          const tempoEstouradoMinutes = Math.max(
            0,
            totalMinutesRounded - Math.round(effectiveLimitHours * 60),
          );

          const totalHours = totalMinutesRounded / 60;
          const limitForComparison = hasCustomLimit ? storedLimit : DEFAULT_USER_DAILY_LIMIT_HOURS;

          return {
            user_id: item.userId,
            log_date: item.logDate,
            total_minutes: totalMinutesRounded,
            horas_liberadas_por_dia: rawLimitHours,
            over_user_limit:
              limitForComparison <= 0 ? totalHours > 0 : totalHours > limitForComparison,
            over_hard_cap_16h: totalMinutesRounded >= HARD_CAP_MINUTES,
            tempo_estourado_minutes: tempoEstouradoMinutes,
          } as TimeDailyUsageRow;
        });

        results.sort((a, b) => {
          const dateComparison = (b.log_date ?? '').localeCompare(a.log_date ?? '');
          if (dateComparison !== 0) {
            return dateComparison;
          }
          return (a.user_id ?? '').localeCompare(b.user_id ?? '');
        });

        return results;
      };

      const { data, error } = await supabase.rpc('get_time_daily_usage', {
        p_date_from: rangeStart,
        p_date_to: rangeEnd,
      });

      if (error) {
        if (error.code === 'PGRST202') {
          console.warn(
            'Função get_time_daily_usage indisponível. Aplicando fallback de compatibilidade.',
            error,
          );

          const fallbackRows = await fetchDailyUsageFallback();
          storeDailyUsageRows(fallbackRows);
          return fallbackRows;
        }

        console.error('Erro ao carregar uso diário de tempo:', error);
        throw error;
      }

      const rows = (Array.isArray(data) ? data : []) as TimeDailyUsageRow[];
      storeDailyUsageRows(rows);
      return rows;
    },
    [storeDailyUsageRows],
  );

  useEffect(() => {
    if (!projectId) {
      setTimeLogs([]);
      clearDailyUsageMap();
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
  }, [projectId, clearDailyUsageMap]);

  const loadTimeLogs = async () => {
    if (!projectId) {
      setTimeLogs([]);
      clearDailyUsageMap();
      return;
    }

    legacyApprovalAttemptedRef.current = false;
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

      if (normalized.length > 0) {
        const dateRange = normalized.reduce<{ min: string | null; max: string | null }>((acc, log) => {
          const rawDate = normalizeDateParam(log.log_date ?? log.data_inicio ?? null);
          if (!rawDate) {
            return acc;
          }

          if (!acc.min || rawDate < acc.min) {
            acc.min = rawDate;
          }

          if (!acc.max || rawDate > acc.max) {
            acc.max = rawDate;
          }

          return acc;
        }, { min: null, max: null });

        if (dateRange.min && dateRange.max) {
          try {
            await loadDailyUsageRange(dateRange.min, dateRange.max);
          } catch (usageError) {
            console.error('Falha ao atualizar agregados diários de tempo:', usageError);
            toast({
              title: 'Erro ao calcular limites diários',
              description: 'Não foi possível atualizar os limites de tempo deste período.',
              variant: 'destructive',
            });
          }
        }
      } else {
        clearDailyUsageMap();
      }
    } catch (error) {
      console.error('Erro ao carregar logs de tempo:', error);
      setTimeLogs([]);
      clearDailyUsageMap();
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

      if (!payload.started_at && payload.data_inicio) {
        payload.started_at = payload.data_inicio;
      }

      if (!payload.ended_at && payload.data_fim) {
        payload.ended_at = payload.data_fim;
      }

      if (
        payload.started_at &&
        payload.ended_at &&
        payload.duration_minutes == null
      ) {
        const startTs = Date.parse(payload.started_at);
        const endTs = Date.parse(payload.ended_at);

        if (Number.isFinite(startTs) && Number.isFinite(endTs) && endTs >= startTs) {
          const derivedMinutes = Math.max(0, Math.ceil((endTs - startTs) / 60000));
          payload.duration_minutes = derivedMinutes;
          if (payload.tempo_trabalhado == null) {
            payload.tempo_trabalhado = derivedMinutes;
          }
        }
      }

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

      if (normalized.user_id) {
        const usageDate = normalizeDateParam(
          normalized.log_date ?? normalized.data_fim ?? normalized.ended_at ?? null,
        );

        if (usageDate) {
          try {
            await loadDailyUsageRange(usageDate, usageDate);
          } catch (usageError) {
            console.error('Erro ao atualizar agregados diários após criação de log:', usageError);
          }
        }
      }

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

      if (normalized.user_id) {
        const usageDate = normalizeDateParam(
          normalized.log_date ?? normalized.data_fim ?? normalized.ended_at ?? null,
        );

        if (usageDate && normalized.ended_at) {
          try {
            await loadDailyUsageRange(usageDate, usageDate);
          } catch (usageError) {
            console.error('Erro ao atualizar agregados diários após atualização de log:', usageError);
          }
        }
      }

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
    legacyApprovalAttemptedRef.current = false;
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
          legacyApprovalAttemptedRef.current = true;

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

          const fetchLatestTimeLog = async (): Promise<TimeLogRow> => {
            const { data: refreshed, error: refreshError } = await supabase
              .from('time_logs')
              .select('*')
              .eq('id', id)
              .maybeSingle();

            if (refreshError) {
              throw refreshError;
            }

            if (!refreshed) {
              throw new Error(
                'Registro de tempo não retornado após executar a rotina de compatibilidade.',
              );
            }

            return refreshed as TimeLogRow;
          };

          let legacyTargetUserId: string | null = existingLog?.user_id ?? null;
          if (!legacyTargetUserId && status !== 'pendente') {
            try {
              const fetchedLog = await fetchLatestTimeLog();
              legacyTargetUserId = fetchedLog.user_id ?? null;
            } catch (lookupError) {
              console.error(
                'Erro ao consultar registro de tempo antes de aplicar fallback de aprovação:',
                lookupError,
              );
            }
          }

          const canAttemptLegacyApproval =
            status === 'pendente' ||
            hasApprovalPrivileges ||
            (legacyTargetUserId !== null && legacyTargetUserId === user.id);

          if (!canAttemptLegacyApproval) {
            throw createApproveTimeLogUnavailableError(rpcError);
          }

          const attemptLegacyRpcApproval = async (): Promise<TimeLogRow | null> => {
            const removeUndefined = (input: Record<string, unknown>) => {
              const entries = Object.entries(input).filter(([, value]) => value !== undefined);
              return entries.reduce<Record<string, unknown>>((accumulator, [key, value]) => {
                accumulator[key] = value;
                return accumulator;
              }, {});
            };

            const basePayloads: Record<string, unknown>[] = [
              {
                time_log_id: id,
                status,
                commissioned: effectiveCommissioned,
                performed_at: performedAtIso ?? undefined,
                approver_name: fallbackApproverName ?? undefined,
                rejection_reason: rejectionReason ?? undefined,
              },
              {
                time_log_id: id,
                status,
                commissioned: effectiveCommissioned,
                performed_at: performedAtIso ?? undefined,
                aprovador_nome: fallbackApproverName ?? undefined,
                justificativa_reprovacao: rejectionReason ?? undefined,
              },
              {
                id,
                status,
                commissioned: effectiveCommissioned,
                performed_at: performedAtIso ?? undefined,
                approver_name: fallbackApproverName ?? undefined,
                rejection_reason: rejectionReason ?? undefined,
              },
              {
                time_log_id: id,
                status,
              },
              {
                time_log_id: id,
                status,
                commissioned: effectiveCommissioned,
              },
              {
                payload: {
                  ...fallbackPayload,
                },
              },
              {
                time_log_id: id,
                payload: {
                  ...fallbackPayload,
                },
              },
              {
                payload: {
                  ...fallbackPayload,
                  status,
                },
              },
              {
                time_log_id: id,
                payload: {
                  ...fallbackPayload,
                  status,
                },
              },
            ]
              .map(removeUndefined)
              .filter(payload => Object.keys(payload).length > 0);

            const seenPayloads = new Set<string>();

            for (const payload of basePayloads) {
              const cacheKey = JSON.stringify(
                Object.entries(payload).sort(([keyA], [keyB]) => keyA.localeCompare(keyB)),
              );

              if (seenPayloads.has(cacheKey)) {
                continue;
              }

              seenPayloads.add(cacheKey);

              const { data: legacyData, error: legacyError } = await supabase.rpc(
                'approve_time_log',
                payload as never,
              );

              if (legacyError) {
                if (legacyError.code === '42501') {
                  throw createLegacyApprovalPermissionError(legacyError);
                }

                if (legacyError.code && LEGACY_SCHEMA_ERROR_CODES.has(legacyError.code)) {
                  continue;
                }

                if (legacyError.code === 'PGRST202') {
                  continue;
                }

                console.warn('Tentativa de compatibilidade com approve_time_log falhou.', {
                  payload,
                  error: legacyError,
                });
                continue;
              }

              if (legacyData) {
                return legacyData as TimeLogRow;
              }

              return fetchLatestTimeLog();
            }

            return null;
          };

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
              if (updateError.code === '42501') {
                throw createLegacyApprovalPermissionError(updateError);
              }

              if (allowRetry && LEGACY_SCHEMA_ERROR_CODES.has(updateError.code ?? '')) {
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

          const legacyRpcRow = await attemptLegacyRpcApproval();

          if (legacyRpcRow) {
            updatedRow = legacyRpcRow;
            legacyApprovalSchemaRef.current = true;
          } else {
            const fallbackUpdatedAt = new Date().toISOString();

            const updatePayloads = [
              fallbackPayload,
              sanitizeTimeLogPayload({
                status_aprovacao: status,
                approval_status: APPROVAL_STATUS_LABELS[status],
                aprovado: APPROVED_FLAG_MAP[status],
                comissionado: effectiveCommissioned,
                is_billable: effectiveCommissioned,
                justificativa_reprovacao: status === 'reprovado' ? rejectionReason : null,
                observacoes:
                  status === 'reprovado'
                    ? rejectionReason ?? null
                    : existingLog?.observacoes ?? undefined,
                updated_at: fallbackUpdatedAt,
              }),
              sanitizeTimeLogPayload({
                status_aprovacao: status,
                aprovado: APPROVED_FLAG_MAP[status],
                justificativa_reprovacao: status === 'reprovado' ? rejectionReason : null,
                observacoes:
                  status === 'reprovado'
                    ? rejectionReason ?? null
                    : existingLog?.observacoes ?? undefined,
                updated_at: fallbackUpdatedAt,
              }),
              sanitizeTimeLogPayload({
                status_aprovacao: status,
                aprovado: APPROVED_FLAG_MAP[status],
                updated_at: fallbackUpdatedAt,
              }),
            ].filter(candidate => Object.keys(candidate).length > 0);

            const seenUpdatePayloads = new Set<string>();
            let lastUpdateError: unknown = null;

            for (const candidate of updatePayloads) {
              const cacheKey = JSON.stringify(
                Object.entries(candidate).sort(([keyA], [keyB]) => keyA.localeCompare(keyB)),
              );

              if (seenUpdatePayloads.has(cacheKey)) {
                continue;
              }

              seenUpdatePayloads.add(cacheKey);

              try {
                updatedRow = await attemptLegacyUpdate(candidate, true);
                legacyApprovalSchemaRef.current = true;
                break;
              } catch (updateError) {
                if (isLegacyApprovalPermissionError(updateError)) {
                  throw updateError;
                }

                lastUpdateError = updateError;
              }
            }

            if (!updatedRow) {
              if (lastUpdateError) {
                throw lastUpdateError;
              }

              throw new Error('Falha ao atualizar aprovação (modo compatibilidade).');
            }
          }
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
      if (isLegacyApprovalPermissionError(error)) {
        const attemptedLegacyFallback = legacyApprovalAttemptedRef.current;
        toast({
          title: attemptedLegacyFallback ? 'Atualização necessária' : 'Permissão necessária',
          description: attemptedLegacyFallback
            ? 'Não foi possível concluir a aprovação porque o ambiente atual ainda não possui a função approve_time_log. Execute as migrações mais recentes do banco de dados ou peça suporte ao time responsável.'
            : 'Você não tem permissão para aprovar ou reprovar registros de tempo. Entre em contato com um gestor ou administrador caso precise dessa liberação.',
          variant: 'destructive',
        });
      } else if (isApproveTimeLogUnavailableError(error)) {
        toast({
          title: 'Atualização necessária',
          description:
            'Não foi possível concluir a aprovação porque a função approve_time_log não está instalada. Execute as migrações mais recentes do banco de dados.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Erro',
          description: 'Não foi possível atualizar o status',
          variant: 'destructive',
        });
      }
      return null;
    } finally {
      legacyApprovalAttemptedRef.current = false;
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
        started_at: isoStart,
        data_fim: null,
        ended_at: null,
        duration_minutes: null,
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
  ): Promise<StopTimerLogResult | null> => {
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

      const createLogFromFallback = async (): Promise<StopTimerLogResult> => {
        if (!fallbackStartedAtMs) {
          if (shouldAttemptCreate) {
            toast({
              title: 'Dados insuficientes',
              description: 'Não foi possível determinar o horário de início do cronômetro.',
              variant: 'destructive',
            });
          }
          return { status: 'skipped', reason: 'missing-start-time' };
        }

        if (!shouldAttemptCreate) {
          return { status: 'skipped', reason: 'missing-active-log' };
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
        const fallbackDurationMinutes = Math.max(1, Math.ceil((nowMs - fallbackStartedAtMs) / 60000));

        const insertPayload: Partial<TimeLogFormData> = {
          task_id: taskId,
          project_id: projectId,
          user_id: user.id,
          tipo_inclusao: 'timer',
          data_inicio: startIso,
          started_at: startIso,
          data_fim: isoNow,
          ended_at: isoNow,
          duration_minutes: fallbackDurationMinutes,
          tempo_trabalhado: fallbackDurationMinutes,
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

        if (normalized.user_id) {
          const usageDate = normalizeDateParam(
            normalized.log_date ?? normalized.data_fim ?? normalized.ended_at ?? isoNow,
          );

          if (usageDate) {
            try {
              await loadDailyUsageRange(usageDate, usageDate);
            } catch (usageError) {
              console.error('Erro ao atualizar agregados diários após registro fallback:', usageError);
            }
          }
        }

        await registerTimeLogActivity(normalized);

        if (shouldShowSuccessToast) {
          toast({
            title: 'Sucesso',
            description: 'Tempo registrado com sucesso',
          });
        }

        return { status: 'success', log: normalized };
      };

      const logIdToUpdate = normalizedLogId ?? openLog?.id ?? null;

      if (!logIdToUpdate) {
        return await createLogFromFallback();
      }

      const resolvedStartTimestamp = (() => {
        if (typeof openLog?.started_at === 'string') {
          const parsed = Date.parse(openLog.started_at);
          if (Number.isFinite(parsed)) {
            return Math.min(parsed, nowMs);
          }
        }

        if (typeof openLog?.data_inicio === 'string') {
          const parsed = Date.parse(openLog.data_inicio);
          if (Number.isFinite(parsed)) {
            return Math.min(parsed, nowMs);
          }
        }

        if (typeof options?.startedAtMs === 'number' && Number.isFinite(options.startedAtMs)) {
          return Math.min(options.startedAtMs, nowMs);
        }

        if (fallbackStartedAtMs) {
          return fallbackStartedAtMs;
        }

        return null;
      })();

      const resolvedStartIso =
        resolvedStartTimestamp !== null ? new Date(resolvedStartTimestamp).toISOString() : null;
      const computedDurationMinutes =
        resolvedStartTimestamp !== null
          ? Math.max(0, Math.ceil((nowMs - resolvedStartTimestamp) / 60000))
          : null;

      const updatePayload: Partial<TimeLogFormData> = {
        data_fim: isoNow,
        ended_at: isoNow,
        atividade: normalizedActivityValue,
      };

      if (resolvedStartIso && !openLog?.started_at) {
        updatePayload.started_at = resolvedStartIso;
      }

      if (computedDurationMinutes !== null) {
        updatePayload.duration_minutes = computedDurationMinutes;
        updatePayload.tempo_trabalhado = computedDurationMinutes;
      }

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

      if (normalized.user_id) {
        const usageDate = normalizeDateParam(
          normalized.log_date ?? normalized.data_fim ?? normalized.ended_at ?? isoNow,
        );

        if (usageDate) {
          try {
            await loadDailyUsageRange(usageDate, usageDate);
          } catch (usageError) {
            console.error('Erro ao atualizar agregados diários após finalização de log:', usageError);
          }
        }
      }

      await registerTimeLogActivity(normalized);

      if (shouldShowSuccessToast) {
        toast({
          title: 'Sucesso',
          description: 'Tempo registrado com sucesso',
        });
      }

      return { status: 'success', log: normalized };
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
      const targetLog = timeLogs.find(log => log.id === id) ?? null;

      const { error } = await supabase
        .from('time_logs')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setTimeLogs(prev => prev.filter(log => log.id !== id));

      if (targetLog?.user_id) {
        const usageDate = normalizeDateParam(
          targetLog.log_date ?? targetLog.data_fim ?? targetLog.ended_at ?? null,
        );

        if (usageDate && targetLog.ended_at) {
          try {
            await loadDailyUsageRange(usageDate, usageDate);
          } catch (usageError) {
            console.error('Erro ao atualizar agregados diários após exclusão de log:', usageError);
          }
        }
      }

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

  const isApprovedLog = (log: TimeLog): boolean => {
    return log.status_aprovacao === 'aprovado';
  };

  const isPendingLog = (log: TimeLog): boolean => {
    return log.status_aprovacao === 'pendente';
  };

  const normalizeMinutes = (minutes: number): number => {
    if (!Number.isFinite(minutes)) {
      return 0;
    }
    return Math.max(0, minutes);
  };

  const getLogDurationSeconds = (log: TimeLog): number => {
    const startIso =
      (typeof log.started_at === 'string' && log.started_at?.trim()) ||
      (typeof log.data_inicio === 'string' && log.data_inicio?.trim()) ||
      null;
    const endIso =
      (typeof log.ended_at === 'string' && log.ended_at?.trim()) ||
      (typeof log.data_fim === 'string' && log.data_fim?.trim()) ||
      null;

    if (startIso && endIso) {
      const startMs = Date.parse(startIso);
      const endMs = Date.parse(endIso);
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

  const getProjectTotalApprovedTime = (): number => {
    return timeLogs
      .filter(isApprovedLog)
      .reduce((total, log) => total + getLogDurationMinutes(log), 0);
  };

  const getProjectTotalPendingTime = (): number => {
    return timeLogs
      .filter(isPendingLog)
      .reduce((total, log) => total + getLogDurationMinutes(log), 0);
  };

  const getDailyUsageFor = useCallback(
    (userId: string, date: string | Date | null | undefined): TimeDailyUsageRow | null => {
      const normalizedDate = normalizeDateParam(date);
      if (!userId || !normalizedDate) {
        return null;
      }

      const key = buildDailyUsageKey(userId, normalizedDate);
      return dailyUsageMap[key] ?? null;
    },
    [dailyUsageMap],
  );

  const ensureDailyUsageForDate = useCallback(
    async (userId: string, date: string | Date): Promise<TimeDailyUsageRow | null> => {
      const normalizedDate = normalizeDateParam(date);
      if (!userId || !normalizedDate) {
        return null;
      }

      const existing = getDailyUsageFor(userId, normalizedDate);
      if (existing) {
        return existing;
      }

      const rows = await loadDailyUsageRange(normalizedDate, normalizedDate);
      return rows.find(row => row?.user_id === userId) ?? null;
    },
    [getDailyUsageFor, loadDailyUsageRange],
  );

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
    getProjectTotalApprovedTime,
    getProjectTotalPendingTime,
    getResponsibleTotalTime,
    refreshTimeLogs: loadTimeLogs,
    dailyUsageByUserDate: dailyUsageMap,
    getDailyUsageFor,
    ensureDailyUsageForDate,
    loadDailyUsageRange,
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
