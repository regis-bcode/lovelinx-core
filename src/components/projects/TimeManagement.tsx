import { Fragment, useState, useEffect, useMemo, useCallback, useRef, type ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import OkApproveButton from '@/components/projects/OkApproveButton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AlertTriangle, CheckCircle2, Clock, Eye, Loader2, Pencil, Plus, Trash2, XCircle } from 'lucide-react';
import { useTasks } from '@/hooks/useTasks';
import { useTimeLogs, formatHMS } from '@/hooks/useTimeLogs';
import { useUserRoles } from '@/hooks/useUserRoles';
import { notifyProjectActiveTimersChange } from '@/hooks/useProjectActiveTimersIndicator';
import { Task } from '@/types/task';
import { TimeLog, TimeLogFormData } from '@/types/time-log';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useProjectAllocations } from '@/hooks/useProjectAllocations';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUser } from '@supabase/auth-helpers-react';
import {
  areActiveTimerRecordsEqual,
  persistActiveTimerRecord,
  readActiveTimerRecord,
  sanitizeActiveTimerRecord,
  type ActiveTimerRecord,
} from '@/lib/active-timers';
import { ensureTaskIdentifier } from '@/lib/taskIdentifier';
import { SAO_PAULO_TIMEZONE, getIsoDateInTimeZone } from '@/utils/timezone';
import type { ApprovalAction } from '@/lib/timeLogs';

type TaskFieldDefinition = {
  key: keyof Task;
  label: string;
  type?: 'date' | 'datetime' | 'boolean' | 'numeric' | 'percentage' | 'link';
  fullWidth?: boolean;
  isLongText?: boolean;
};

type TaskDetailEntry = {
  key: string;
  label: string;
  value: ReactNode;
  fullWidth?: boolean;
  isLongText?: boolean;
};

type DetailItemProps = {
  label: string;
  value?: ReactNode | null;
  mono?: boolean;
  span2?: boolean;
};

type UserDailyUsageSummary = {
  key: string;
  userId: string;
  userName: string;
  date: string;
  approvedMinutes: number;
  pendingMinutes: number;
  runningSeconds: number;
  totalMinutes: number;
  limitMinutes: number;
  overMinutes: number;
};

const DEFAULT_DAILY_LIMIT_HOURS = 8;
const DEFAULT_DAILY_LIMIT_MINUTES = DEFAULT_DAILY_LIMIT_HOURS * 60;

function DetailItem({ label, value, mono, span2 }: DetailItemProps) {
  const isEmpty =
    value === undefined ||
    value === null ||
    (typeof value === 'string' && value.trim().length === 0);

  return (
    <div className={span2 ? 'sm:col-span-2' : ''}>
      <div className="flex items-baseline gap-2 min-w-0">
        <span className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
          {label}:
        </span>
        <span
          className={[
            'min-w-0 break-words',
            mono ? 'font-mono tabular-nums' : 'font-medium',
            isEmpty ? 'text-muted-foreground' : '',
          ].join(' ')}
        >
          {isEmpty ? '—' : value}
        </span>
      </div>
    </div>
  );
}

const TASK_FIELD_DEFINITIONS: TaskFieldDefinition[] = [
  { key: 'task_id', label: 'ID da tarefa' },
  { key: 'responsavel', label: 'Responsável' },
  { key: 'cliente', label: 'Cliente' },
  { key: 'status', label: 'Status' },
  { key: 'criticidade', label: 'Atenção' },
  { key: 'prioridade', label: 'Prioridade' },
  { key: 'cronograma', label: 'Cronograma', type: 'boolean' },
  { key: 'percentual_conclusao', label: 'Percentual de conclusão', type: 'percentage' },
  { key: 'data_vencimento', label: 'Data de vencimento', type: 'date' },
  { key: 'nivel', label: 'Nível', type: 'numeric' },
  { key: 'ordem', label: 'Ordem', type: 'numeric' },
  { key: 'created_at', label: 'Criado em', type: 'datetime' },
  { key: 'descricao_tarefa', label: 'Descrição da tarefa', fullWidth: true, isLongText: true },
  { key: 'solucao', label: 'Atividade', fullWidth: true, isLongText: true },
];

const formatTime = (seconds: number): string => {
  return formatHMS(Math.max(0, Math.round(seconds)));
};

const formatMinutes = (minutes: number): string => {
  if (!Number.isFinite(minutes)) {
    return '00:00:00';
  }

  const totalSeconds = Math.max(0, Math.round(minutes * 60));
  return formatHMS(totalSeconds);
};

interface TimeManagementProps {
  projectId: string;
}

export function TimeManagement({ projectId }: TimeManagementProps) {
  const { user } = useAuth();
  const supabaseUser = useUser();
  const { tasks, customFields, loading: tasksLoading, updateTask } = useTasks(projectId);
  const {
    timeLogs,
    createTimeLog,
    updateTimeLog,
    approveTimeLog,
    getTaskTotalTime,
    getProjectTotalApprovedTime,
    getProjectTotalPendingTime,
    startTimerLog,
    stopTimerLog,
    ensureDailyUsageForDate,
    getDailyUsageFor,
    deleteTimeLog,
    refreshTimeLogs,
    loading: logsLoading,
  } = useTimeLogs(projectId);
  const { isAdmin, isGestor } = useUserRoles();
  const canManageApprovals = isAdmin() || isGestor();
  const { allocations: projectAllocations, loading: allocationsLoading } = useProjectAllocations(projectId);
  const { toast } = useToast();
  const getLoggedUserDisplayName = useCallback(() => {
    const name = typeof user?.name === 'string' ? user.name.trim() : '';
    if (name.length > 0) {
      return name;
    }

    const email = typeof user?.email === 'string' ? user.email.trim() : '';
    if (email.length > 0) {
      return email;
    }

    return '';
  }, [user?.name, user?.email]);

  const [activeTimers, setActiveTimers] = useState<Record<string, number>>({});
  const hasHydratedActiveTimersRef = useRef(false);
  const autoStopTimeoutsRef = useRef<Record<string, number>>({});
  const [elapsedSeconds, setElapsedSeconds] = useState<Record<string, number>>({});
  const [manualTime, setManualTime] = useState<{ [taskId: string]: { hours: number; minutes: number } }>({});
  const [manualOverrides, setManualOverrides] = useState<Record<string, number>>({});
  const [timerActionsInFlight, setTimerActionsInFlight] = useState<Record<string, boolean>>({});
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [taskPendingAssignment, setTaskPendingAssignment] = useState<Task | null>(null);
  const [selectedAssignee, setSelectedAssignee] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);
  const [processingApprovalId, setProcessingApprovalId] = useState<string | null>(null);
  const [approvalSubmittingType, setApprovalSubmittingType] = useState<'approve' | 'reject' | null>(null);
  const [isApprovalDialogOpen, setIsApprovalDialogOpen] = useState(false);
  const [approvalDialogLog, setApprovalDialogLog] = useState<TimeLog | null>(null);
  const [approvalDialogAction, setApprovalDialogAction] = useState<'approve' | 'reject' | null>(null);
  const [approvalDialogJustification, setApprovalDialogJustification] = useState('');
  const [selectedLogIds, setSelectedLogIds] = useState<string[]>([]);
  const [isBulkApprovalDialogOpen, setIsBulkApprovalDialogOpen] = useState(false);
  const [bulkApprovalAction, setBulkApprovalAction] = useState<'approve' | 'reject' | null>(null);
  const [bulkJustification, setBulkJustification] = useState('');
  const [isProcessingBulkApproval, setIsProcessingBulkApproval] = useState(false);
  const [selectedLogForDetails, setSelectedLogForDetails] = useState<TimeLog | null>(null);
  const [isLogDetailsDialogOpen, setIsLogDetailsDialogOpen] = useState(false);
  const [detailTaskData, setDetailTaskData] = useState<Task | null>(null);
  const [isDetailTaskLoading, setIsDetailTaskLoading] = useState(false);
  const [isTaskDetailsVisible, setIsTaskDetailsVisible] = useState(false);
  const [selectedLogForEdit, setSelectedLogForEdit] = useState<TimeLog | null>(null);
  const [isLogEditDialogOpen, setIsLogEditDialogOpen] = useState(false);
  const [logEditObservation, setLogEditObservation] = useState('');
  const [logEditTargetField, setLogEditTargetField] = useState<'atividade' | 'observacoes'>('observacoes');
  const [isUpdatingLogObservation, setIsUpdatingLogObservation] = useState(false);
  const [logPendingDeletion, setLogPendingDeletion] = useState<TimeLog | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeletingLog, setIsDeletingLog] = useState(false);
  const [dailyFilters, setDailyFilters] = useState({
    responsavel: 'todos',
    date: 'todas',
    status: 'todos',
  });
  const [dailyGroupBy, setDailyGroupBy] = useState<'none' | 'responsavel' | 'date' | 'status'>('none');
  const [taskFilters, setTaskFilters] = useState({
    responsavel: 'todos',
    status: 'todos',
    tarefa: '',
  });
  const [taskGroupBy, setTaskGroupBy] = useState<'none' | 'responsavel' | 'status'>('none');
  const [timeLogFilters, setTimeLogFilters] = useState({
    responsavel: 'todos',
    data: 'todas',
    tarefa: 'todas',
    tipo: 'todos',
    aprovador: 'todos',
    statusAprovacao: 'todos',
    dataAprovacao: 'todas',
  });
  const [timeLogGroupBy, setTimeLogGroupBy] = useState<
    | 'none'
    | 'responsavel'
    | 'data'
    | 'tarefa'
    | 'tipo'
    | 'aprovador'
    | 'statusAprovacao'
    | 'dataAprovacao'
  >('none');
  const todaySaoPauloDate = useMemo(
    () => getIsoDateInTimeZone(new Date(), SAO_PAULO_TIMEZONE),
    [],
  );
  const approvalDialogTask = useMemo(() => {
    if (!approvalDialogLog?.task_id) {
      return null;
    }

    const task = tasks.find(t => t.id === approvalDialogLog.task_id);
    return task ?? null;
  }, [approvalDialogLog, tasks]);
  const approvalDialogFormattedTime = useMemo(() => {
    if (!approvalDialogLog) {
      return '-';
    }

    if (
      typeof approvalDialogLog.tempo_formatado === 'string' &&
      approvalDialogLog.tempo_formatado.trim().length > 0
    ) {
      return approvalDialogLog.tempo_formatado;
    }

    return formatMinutes(approvalDialogLog.tempo_trabalhado);
  }, [approvalDialogLog]);
  const activeTimersStorageKey = useMemo(() => `task-active-timers-${projectId}`, [projectId]);

  type ActiveTimersUpdater = ActiveTimerRecord | ((prev: ActiveTimerRecord) => ActiveTimerRecord);

  const applyActiveTimersUpdate = useCallback(
    (updater: ActiveTimersUpdater) => {
      setActiveTimers(prev => {
        const nextCandidate =
          typeof updater === 'function'
            ? (updater as (current: ActiveTimerRecord) => ActiveTimerRecord)(prev)
            : updater;

        const sanitizedNext = sanitizeActiveTimerRecord(nextCandidate);

        if (areActiveTimerRecordsEqual(prev, sanitizedNext)) {
          return prev;
        }

        return sanitizedNext;
      });
    },
    [],
  );

  const clearAutoStopTimeout = useCallback((taskId: string) => {
    if (typeof window === 'undefined') {
      return;
    }

    const timeoutId = autoStopTimeoutsRef.current[taskId];
    if (typeof timeoutId === 'number') {
      window.clearTimeout(timeoutId);
      delete autoStopTimeoutsRef.current[taskId];
    }
  }, []);

  useEffect(() => {
    if (!hasHydratedActiveTimersRef.current) {
      return;
    }

    persistActiveTimerRecord(activeTimersStorageKey, activeTimers);
    notifyProjectActiveTimersChange(projectId, Object.keys(activeTimers).length > 0);
  }, [activeTimers, activeTimersStorageKey, projectId]);

  useEffect(() => {
    return () => {
      if (typeof window === 'undefined') {
        autoStopTimeoutsRef.current = {};
        return;
      }

      Object.values(autoStopTimeoutsRef.current).forEach(timeoutId => {
        if (typeof timeoutId === 'number') {
          window.clearTimeout(timeoutId);
        }
      });

      autoStopTimeoutsRef.current = {};
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      hasHydratedActiveTimersRef.current = true;
      return;
    }

    const restoreActiveTimers = () => {
      try {
        const restored = readActiveTimerRecord(activeTimersStorageKey);
        applyActiveTimersUpdate(restored);
        hasHydratedActiveTimersRef.current = true;
        persistActiveTimerRecord(activeTimersStorageKey, restored);
        notifyProjectActiveTimersChange(projectId, Object.keys(restored).length > 0);
        setElapsedSeconds(() => {
          const now = Date.now();
          return Object.entries(restored).reduce<Record<string, number>>((acc, [taskId, start]) => {
            const elapsed = Math.floor((now - start) / 1000);
            acc[taskId] = elapsed >= 0 ? elapsed : 0;
            return acc;
          }, {});
        });
      } catch (error) {
        console.error('Erro ao restaurar temporizadores compartilhados:', error);
        window.localStorage.removeItem(activeTimersStorageKey);
        applyActiveTimersUpdate({});
        setElapsedSeconds({});
        hasHydratedActiveTimersRef.current = true;
        notifyProjectActiveTimersChange(projectId, false);
      }
    };

    restoreActiveTimers();

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== activeTimersStorageKey) {
        return;
      }
      restoreActiveTimers();
    };

    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('storage', handleStorage);
    };
  }, [activeTimersStorageKey, applyActiveTimersUpdate, projectId]);

  // Timer effect
  useEffect(() => {
    if (Object.keys(activeTimers).length === 0) return;

    const interval = setInterval(() => {
      setElapsedSeconds(() => {
        const updated: Record<string, number> = {};
        Object.entries(activeTimers).forEach(([taskId, startTimestamp]) => {
          const elapsed = Math.floor((Date.now() - startTimestamp) / 1000);
          updated[taskId] = elapsed >= 0 ? elapsed : 0;
        });
        return updated;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [activeTimers]);

  const removeLocalTimerState = useCallback(
    (taskId: string) => {
      clearAutoStopTimeout(taskId);
      applyActiveTimersUpdate(prev => {
        if (!prev[taskId]) {
          return prev;
        }
        const updated = { ...prev };
        delete updated[taskId];
        return updated;
      });

      setElapsedSeconds(prev => {
        if (!(taskId in prev)) {
          return prev;
        }
        const updated = { ...prev };
        delete updated[taskId];
        return updated;
      });
    },
    [applyActiveTimersUpdate, clearAutoStopTimeout],
  );

  useEffect(() => {
    if (logsLoading) {
      return;
    }

    const tasksWithLogs = new Set<string>();
    const runningLogStartTimes = new Map<string, number>();

    timeLogs.forEach(log => {
      if (typeof log.task_id !== 'string' || log.task_id.length === 0) {
        return;
      }

      const taskId = log.task_id;
      tasksWithLogs.add(taskId);

      if (log.data_fim) {
        return;
      }

      const startedAt =
        typeof log.data_inicio === 'string' ? new Date(log.data_inicio).getTime() : Number.NaN;

      if (Number.isFinite(startedAt) && startedAt > 0) {
        runningLogStartTimes.set(taskId, startedAt);
      }
    });

    if (runningLogStartTimes.size === 0 && tasksWithLogs.size === 0) {
      return;
    }

    applyActiveTimersUpdate(prev => {
      let changed = false;
      const next = { ...prev };

      runningLogStartTimes.forEach((startTimestamp, taskId) => {
        if (next[taskId] !== startTimestamp) {
          next[taskId] = startTimestamp;
          changed = true;
        }
      });

      Object.keys(prev).forEach(taskId => {
        if (!runningLogStartTimes.has(taskId) && tasksWithLogs.has(taskId)) {
          delete next[taskId];
          changed = true;
        }
      });

      if (!changed) {
        return prev;
      }

      return next;
    });
  }, [timeLogs, logsLoading, applyActiveTimersUpdate]);

  useEffect(() => {
    if (logsLoading || Object.keys(activeTimers).length === 0) {
      return;
    }

    const openTaskIds = new Set(
      timeLogs
        .filter(log => typeof log.task_id === 'string' && !log.data_fim)
        .map(log => log.task_id as string),
    );

    Object.keys(activeTimers).forEach(taskId => {
      if (!openTaskIds.has(taskId)) {
        removeLocalTimerState(taskId);
      }
    });
  }, [activeTimers, timeLogs, removeLocalTimerState, logsLoading]);

  const updateTimerActionState = useCallback((taskId: string, inFlight: boolean) => {
    setTimerActionsInFlight(prev => {
      if (inFlight) {
        if (prev[taskId]) {
          return prev;
        }
        return { ...prev, [taskId]: true };
      }

      if (!prev[taskId]) {
        return prev;
      }

      const updated = { ...prev };
      delete updated[taskId];
      return updated;
    });
  }, []);

  const stopTimer = async (
    taskId: string,
    options?: { discard?: boolean; forcedByDailyCap?: boolean },
  ) => {
    const hasActiveTimers = Object.keys(activeTimers).length > 0;
    if (!hasActiveTimers && !options?.forcedByDailyCap) {
      toast({
        title: 'Nenhum cronômetro em andamento',
        description: 'Inicie um cronômetro antes de tentar parar ou zerar o tempo.',
      });
      return false;
    }

    clearAutoStopTimeout(taskId);

    const activeStartFromState = activeTimers[taskId];
    const fallbackOpenLog = timeLogs.find(
      log => log.task_id === taskId && !log.data_fim,
    );
    const fallbackStartIso = fallbackOpenLog?.started_at ?? fallbackOpenLog?.data_inicio ?? null;
    const resolvedStartTimestamp = (() => {
      if (typeof activeStartFromState === 'number' && Number.isFinite(activeStartFromState)) {
        return activeStartFromState;
      }

      if (fallbackStartIso) {
        const parsed = Date.parse(fallbackStartIso);
        if (Number.isFinite(parsed)) {
          return parsed;
        }
      }

      return Number.NaN;
    })();

    if ((Number.isNaN(resolvedStartTimestamp) || resolvedStartTimestamp <= 0) && !options?.forcedByDailyCap) {
      toast({
        title: 'Cronômetro não encontrado',
        description: 'Não encontramos um cronômetro ativo para esta tarefa.',
      });
      removeLocalTimerState(taskId);
      return false;
    }

    updateTimerActionState(taskId, true);

    try {
      const result = await stopTimerLog(taskId, {
        startedAtMs: Number.isNaN(resolvedStartTimestamp) ? undefined : resolvedStartTimestamp,
        allowCreateIfMissing: options?.discard ? false : true,
        suppressSuccessToast: options?.discard === true || options?.forcedByDailyCap === true,
      });

      if (!result) {
        toast({
          title: 'Erro ao finalizar cronômetro',
          description: 'Não foi possível registrar o encerramento do tempo. Tente novamente.',
          variant: 'destructive',
        });
        return false;
      }

      if (result.status === 'skipped') {
        if (!options?.discard) {
          return false;
        }

        removeLocalTimerState(taskId);

        toast({
          title: 'Cronômetro zerado',
          description: 'Nenhum apontamento ativo foi encontrado e o cronômetro foi limpo.',
        });

        await refreshTimeLogs();
        return true;
      }

      const finalizedLog = result.log;

      removeLocalTimerState(taskId);

      if (options?.discard) {
        const logId = finalizedLog.id;
        const removed = await deleteTimeLog(logId, { suppressToast: true });

        if (removed) {
          toast({
            title: 'Cronômetro zerado',
            description: 'O tempo registrado foi descartado.',
          });
        } else {
          toast({
            title: 'Erro ao zerar cronômetro',
            description: 'O tempo foi interrompido, mas não foi possível remover o registro.',
            variant: 'destructive',
          });
        }

        await refreshTimeLogs();
        return removed;
      }

      await refreshTimeLogs();

      if (options?.forcedByDailyCap) {
        toast({
          title: 'Cronômetro encerrado automaticamente',
          description: 'Limite diário de 16h atingido para hoje.',
        });
      }

      return true;
    } finally {
      updateTimerActionState(taskId, false);
    }
  };

  const scheduleAutoStop = useCallback(
    (taskId: string, remainingMinutes: number) => {
      if (typeof window === 'undefined') {
        return;
      }

      const safeRemaining = Math.max(0, remainingMinutes);
      const timeoutMs = Math.round(safeRemaining * 60 * 1000);

      clearAutoStopTimeout(taskId);

      if (timeoutMs <= 0) {
        void stopTimer(taskId, { forcedByDailyCap: true });
        return;
      }

      const timeoutId = window.setTimeout(async () => {
        delete autoStopTimeoutsRef.current[taskId];
        await stopTimer(taskId, { forcedByDailyCap: true });
      }, timeoutMs);

      autoStopTimeoutsRef.current[taskId] = timeoutId;
    },
    [clearAutoStopTimeout, stopTimer],
  );

  const ensureAutoStopForTimer = useCallback(
    async (taskId: string, startTimestamp: number) => {
      if (!user?.id) {
        return;
      }

      if (typeof startTimestamp !== 'number' || !Number.isFinite(startTimestamp)) {
        return;
      }

      if (autoStopTimeoutsRef.current[taskId]) {
        return;
      }

      try {
        const logDate = getIsoDateInTimeZone(new Date(startTimestamp), SAO_PAULO_TIMEZONE);
        const usage = await ensureDailyUsageForDate(user.id, logDate);
        const usedMinutes = usage?.total_minutes ?? 0;
        const elapsedMinutes = Math.max(0, Math.ceil((Date.now() - startTimestamp) / 60000));
        const remaining = Math.max(0, 960 - usedMinutes - elapsedMinutes);

        if (remaining <= 0) {
          await stopTimer(taskId, { forcedByDailyCap: true });
          return;
        }

        scheduleAutoStop(taskId, remaining);
      } catch (error) {
        console.error('Erro ao programar auto-stop do cronômetro:', error);
      }
    },
    [ensureDailyUsageForDate, scheduleAutoStop, stopTimer, user?.id],
  );

  useEffect(() => {
    if (Object.keys(activeTimers).length === 0) {
      return;
    }

    Object.entries(activeTimers).forEach(([taskId, startTimestamp]) => {
      ensureAutoStopForTimer(taskId, startTimestamp);
    });
  }, [activeTimers, ensureAutoStopForTimer]);

  const startTimer = async (taskId: string) => {
    if (activeTimers[taskId]) {
      return;
    }

    if (!user?.id) {
      toast({
        title: 'Erro ao iniciar cronômetro',
        description: 'Você precisa estar autenticado para iniciar um cronômetro.',
        variant: 'destructive',
      });
      return;
    }

    const now = new Date();
    const logDate = getIsoDateInTimeZone(now, SAO_PAULO_TIMEZONE);

    let remainingToCap = 960;
    try {
      const usage = await ensureDailyUsageForDate(user.id, logDate);
      const usedMinutes = usage?.total_minutes ?? 0;
      remainingToCap = Math.max(0, 960 - usedMinutes);
    } catch (error) {
      console.error('Erro ao verificar limite diário de 16h:', error);
      toast({
        title: 'Erro ao iniciar cronômetro',
        description: 'Não foi possível verificar o limite diário de 16h. Tente novamente.',
        variant: 'destructive',
      });
      return;
    }

    if (remainingToCap <= 0) {
      toast({
        title: 'Limite diário de 16h atingido para hoje.',
        description: 'Finalize registros existentes antes de iniciar um novo cronômetro.',
        variant: 'destructive',
      });
      return;
    }

    const tentativeStart = Date.now();
    const startIso = new Date(tentativeStart).toISOString();
    const startedLog = await startTimerLog(taskId, {
      tipo_inclusao: 'timer',
      data_inicio: startIso,
      observacoes: 'Registro automático pela Gestão de Tempo',
    });

    if (!startedLog) {
      return;
    }

    const normalizedStart = (() => {
      if (typeof startedLog.started_at === 'string' && startedLog.started_at) {
        const parsed = Date.parse(startedLog.started_at);
        if (Number.isFinite(parsed)) {
          return parsed;
        }
      }

      if (typeof startedLog.data_inicio === 'string' && startedLog.data_inicio) {
        const parsed = Date.parse(startedLog.data_inicio);
        if (Number.isFinite(parsed)) {
          return parsed;
        }
      }

      return tentativeStart;
    })();

    applyActiveTimersUpdate(prev => {
      if (prev[taskId]) {
        return prev;
      }
      return { ...prev, [taskId]: normalizedStart };
    });

    setElapsedSeconds(prev => ({
      ...prev,
      [taskId]: Math.max(0, Math.floor((Date.now() - normalizedStart) / 1000)),
    }));

    setManualOverrides(prev => {
      if (!(taskId in prev)) return prev;
      const updated = { ...prev };
      delete updated[taskId];
      return updated;
    });

    const elapsedMinutes = Math.max(0, Math.ceil((Date.now() - normalizedStart) / 60000));
    const remainingAfterElapsed = Math.max(0, remainingToCap - elapsedMinutes);

    if (remainingAfterElapsed <= 0) {
      await stopTimer(taskId, { forcedByDailyCap: true });
      return;
    }

    scheduleAutoStop(taskId, remainingAfterElapsed);
  };

  const resetTimer = (taskId: string) => stopTimer(taskId, { discard: true });

  const addManualTime = async (taskId: string) => {
    const time = manualTime[taskId];
    if (!time || (time.hours === 0 && time.minutes === 0)) return;

    const totalMinutes = time.hours * 60 + time.minutes;
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - totalMinutes * 60 * 1000);
    const nowIso = endDate.toISOString();
    const startIso = startDate.toISOString();
    const result = await createTimeLog({
      task_id: taskId,
      tipo_inclusao: 'manual',
      data_inicio: startIso,
      data_fim: nowIso,
    });

    if (result) {
      setManualOverrides(prev => ({ ...prev, [taskId]: totalMinutes }));
      applyActiveTimersUpdate(prev => {
        if (!prev[taskId]) {
          return prev;
        }
        const updated = { ...prev };
        delete updated[taskId];
        return updated;
      });
      setElapsedSeconds(prev => {
        if (!prev[taskId]) return prev;
        const updated = { ...prev };
        delete updated[taskId];
        return updated;
      });
    }

    setManualTime(prev => ({ ...prev, [taskId]: { hours: 0, minutes: 0 } }));
  };

  const getLogDailyUsage = useCallback(
    (log: TimeLog) => {
      if (!log?.user_id) {
        return null;
      }

      const usageDate = log.log_date ?? log.data_inicio ?? null;

      return getDailyUsageFor(log.user_id, usageDate);
    },
    [getDailyUsageFor],
  );

  const getLogDurationInMinutes = useCallback((log: TimeLog | null | undefined): number => {
    if (!log) {
      return 0;
    }

    const normalizeIso = (value: string | null | undefined) => {
      if (typeof value !== 'string') {
        return null;
      }

      const trimmed = value.trim();
      return trimmed.length > 0 ? trimmed : null;
    };

    const startIso = normalizeIso(log.started_at) ?? normalizeIso(log.data_inicio);
    const endIso = normalizeIso(log.ended_at) ?? normalizeIso(log.data_fim);

    if (startIso && endIso) {
      const startTimestamp = Date.parse(startIso);
      const endTimestamp = Date.parse(endIso);

      if (Number.isFinite(startTimestamp) && Number.isFinite(endTimestamp) && endTimestamp >= startTimestamp) {
        const elapsedSeconds = Math.max(0, Math.round((endTimestamp - startTimestamp) / 1000));
        return elapsedSeconds / 60;
      }
    }

    const tempoTrabalhado = log.tempo_trabalhado;
    if (typeof tempoTrabalhado === 'number' && Number.isFinite(tempoTrabalhado)) {
      return Math.max(0, tempoTrabalhado);
    }

    const duration = log.duration_minutes;
    if (typeof duration === 'number' && Number.isFinite(duration)) {
      return Math.max(0, duration);
    }

    return 0;
  }, []);

  const resolveLogDate = useCallback((log: TimeLog | null | undefined): string | null => {
    if (!log) {
      return null;
    }

    const directDate = typeof log.log_date === 'string' ? log.log_date.trim() : '';
    if (directDate) {
      return directDate.slice(0, 10);
    }

    const referenceIso =
      log.data_fim ??
      log.ended_at ??
      log.data_inicio ??
      log.started_at ??
      log.created_at ??
      null;

    if (!referenceIso) {
      return null;
    }

    const parsed = new Date(referenceIso);
    if (Number.isNaN(parsed.getTime())) {
      return null;
    }

    return getIsoDateInTimeZone(parsed, SAO_PAULO_TIMEZONE);
  }, []);

  const getRunningSecondsForLog = useCallback(
    (log: TimeLog | null | undefined): number => {
      if (!log) {
        return 0;
      }

      const baseMinutes = typeof log.tempo_trabalhado === 'number' && Number.isFinite(log.tempo_trabalhado)
        ? Math.max(0, log.tempo_trabalhado)
        : 0;
      const baseSeconds = Math.max(0, Math.round(baseMinutes * 60));

      if (log.task_id) {
        const trackedSeconds = elapsedSeconds[log.task_id];
        if (typeof trackedSeconds === 'number' && Number.isFinite(trackedSeconds)) {
          return baseSeconds + Math.max(0, Math.round(trackedSeconds));
        }
      }

      const startIso = log.started_at ?? log.data_inicio ?? log.created_at ?? null;
      if (!startIso) {
        return baseSeconds;
      }

      const startTimestamp = Date.parse(startIso);
      if (!Number.isFinite(startTimestamp)) {
        return baseSeconds;
      }

      const elapsed = Math.floor((Date.now() - startTimestamp) / 1000);
      return baseSeconds + (elapsed > 0 ? elapsed : 0);
    },
    [elapsedSeconds],
  );

  const manualOverridesFromLogs = useMemo(() => {
    const overrides: Record<string, number> = {};
    timeLogs.forEach((log) => {
      if (log.tipo_inclusao === 'manual' && overrides[log.task_id] === undefined) {
        overrides[log.task_id] = log.tempo_trabalhado;
      }
    });
    return overrides;
  }, [timeLogs]);

  const latestFinalizedLogByTask = useMemo(() => {
    const map = new Map<string, { logDate: string | null; timestamp: number; userId: string | null }>();

    timeLogs.forEach(log => {
      if (!log?.task_id) {
        return;
      }

      if (!log?.ended_at && !log?.data_fim) {
        return;
      }

      const referenceIso = log.ended_at ?? log.data_fim ?? log.created_at ?? null;
      if (!referenceIso) {
        return;
      }

      const timestamp = Date.parse(referenceIso);
      if (!Number.isFinite(timestamp)) {
        return;
      }

      const existing = map.get(log.task_id);
      if (!existing || timestamp > existing.timestamp) {
        map.set(log.task_id, {
          logDate: log.log_date ?? null,
          timestamp,
          userId: log.user_id ?? null,
        });
      }
    });

    return map;
  }, [timeLogs]);

  const runningTimeLogByTask = useMemo(() => {
    const map = new Map<string, TimeLog>();

    timeLogs.forEach(log => {
      if (!log?.task_id) {
        return;
      }

      if (log?.ended_at || log?.data_fim) {
        return;
      }

      if (!map.has(log.task_id)) {
        map.set(log.task_id, log);
      }
    });

    return map;
  }, [timeLogs]);

  const latestLogReferenceByTask = useMemo(() => {
    const map = new Map<string, { iso: string; timestamp: number }>();

    timeLogs.forEach(log => {
      if (!log?.task_id) {
        return;
      }

      const referenceIso =
        log.log_date ??
        log.data_inicio ??
        log.started_at ??
        log.data_fim ??
        log.ended_at ??
        log.created_at ??
        null;

      if (!referenceIso) {
        return;
      }

      const timestamp = Date.parse(referenceIso);
      if (!Number.isFinite(timestamp)) {
        return;
      }

      const existing = map.get(log.task_id);
      if (!existing || timestamp > existing.timestamp) {
        map.set(log.task_id, { iso: referenceIso, timestamp });
      }
    });

    return map;
  }, [timeLogs]);

  const teamMembers = useMemo(() => {
    if (!projectAllocations.length) {
      return [] as Array<{ id: string; name: string }>;
    }

    const membersMap = new Map<string, { id: string; name: string }>();

    projectAllocations.forEach((allocation) => {
      if (allocation.status_participacao !== 'Ativo') {
        return;
      }

      const memberId = allocation.allocated_user_id;
      const memberName = allocation.user?.nome_completo?.trim();

      if (!memberId || !memberName) {
        return;
      }

      if (!membersMap.has(memberId)) {
        membersMap.set(memberId, { id: memberId, name: memberName });
      }
    });

    return Array.from(membersMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [projectAllocations]);

  const taskOwnerNameMap = useMemo(() => {
    const map = new Map<string, string>();

    projectAllocations.forEach(allocation => {
      const userId = allocation.allocated_user_id;
      const name = allocation.user?.nome_completo?.trim();

      if (!userId || !name || name.length === 0) {
        return;
      }

      if (!map.has(userId)) {
        map.set(userId, name);
      }
    });

    return map;
  }, [projectAllocations]);

  const userDailyLimitMinutesMap = useMemo(() => {
    const map = new Map<string, number>();

    projectAllocations.forEach(allocation => {
      const userId = allocation.allocated_user_id;
      const rawHours = allocation.user?.horas_liberadas_por_dia;

      if (!userId || rawHours === null || rawHours === undefined) {
        return;
      }

      const numericHours = Number(rawHours);

      if (Number.isNaN(numericHours)) {
        return;
      }

      const minutes = Math.max(0, numericHours * 60);
      if (!map.has(userId) || minutes > (map.get(userId) ?? 0)) {
        map.set(userId, minutes);
      }
    });

    return map;
  }, [projectAllocations]);

  const taskResponsavelMap = useMemo(() => {
    const map = new Map<string, string>();

    tasks.forEach(task => {
      if (!task.user_id) {
        return;
      }

      const responsavel = typeof task.responsavel === 'string' ? task.responsavel.trim() : '';

      if (!responsavel) {
        return;
      }

      if (!map.has(task.user_id)) {
        map.set(task.user_id, responsavel);
      }
    });

    return map;
  }, [tasks]);

  const getUserDisplayName = useCallback(
    (userId: string | null | undefined): string => {
      if (!userId) {
        return 'Responsável não informado';
      }

      const allocationName = taskOwnerNameMap.get(userId);
      if (allocationName) {
        return allocationName;
      }

      const fallbackName = taskResponsavelMap.get(userId);
      if (fallbackName) {
        return fallbackName;
      }

      return userId;
    },
    [taskOwnerNameMap, taskResponsavelMap],
  );

  const dailyUserTimeSummaries = useMemo<UserDailyUsageSummary[]>(() => {
    if (!timeLogs.length) {
      return [];
    }

    const accumulator = new Map<
      string,
      { userId: string; date: string; approvedMinutes: number; pendingMinutes: number; runningSeconds: number }
    >();

    const ensureEntry = (userId: string, date: string) => {
      const key = `${userId}-${date}`;
      if (!accumulator.has(key)) {
        accumulator.set(key, {
          userId,
          date,
          approvedMinutes: 0,
          pendingMinutes: 0,
          runningSeconds: 0,
        });
      }
      return accumulator.get(key)!;
    };

    timeLogs.forEach(log => {
      if (!log?.user_id) {
        return;
      }

      const resolvedDate = resolveLogDate(log) ?? todaySaoPauloDate;
      if (!resolvedDate) {
        return;
      }

      const entry = ensureEntry(log.user_id, resolvedDate);
      const durationMinutes = getLogDurationInMinutes(log);

      if (log.status_aprovacao === 'aprovado') {
        entry.approvedMinutes += durationMinutes;
      } else if (log.status_aprovacao === 'pendente') {
        entry.pendingMinutes += durationMinutes;
      }

      if (!log.ended_at && !log.data_fim) {
        entry.runningSeconds += getRunningSecondsForLog(log);
      }
    });

    if (accumulator.size === 0) {
      return [];
    }

    const summaries: UserDailyUsageSummary[] = Array.from(accumulator.values()).map(entry => {
      const usageRow = getDailyUsageFor(entry.userId, entry.date);
      const usageLimitHours = usageRow?.horas_liberadas_por_dia;

      let limitMinutes = DEFAULT_DAILY_LIMIT_MINUTES;
      if (typeof usageLimitHours === 'number' && Number.isFinite(usageLimitHours)) {
        limitMinutes = Math.max(0, usageLimitHours * 60);
      } else {
        const fallbackLimit = userDailyLimitMinutesMap.get(entry.userId);
        if (typeof fallbackLimit === 'number' && Number.isFinite(fallbackLimit)) {
          limitMinutes = Math.max(0, fallbackLimit);
        }
      }

      const runningSeconds = Math.max(0, Math.round(entry.runningSeconds));
      const approvedMinutes = Math.max(0, entry.approvedMinutes);
      const pendingMinutes = Math.max(0, entry.pendingMinutes);
      const totalMinutes = Math.max(0, approvedMinutes + pendingMinutes);
      const overMinutes = Math.max(0, totalMinutes - limitMinutes);

      return {
        key: `${entry.userId}-${entry.date}`,
        userId: entry.userId,
        userName: getUserDisplayName(entry.userId),
        date: entry.date,
        approvedMinutes,
        pendingMinutes,
        runningSeconds,
        totalMinutes,
        limitMinutes,
        overMinutes,
      } satisfies UserDailyUsageSummary;
    });

    return summaries.sort((a, b) => {
      if (a.date !== b.date) {
        return b.date.localeCompare(a.date);
      }

      return a.userName.localeCompare(b.userName, 'pt-BR');
    });
  }, [
    getDailyUsageFor,
    getLogDurationInMinutes,
    getRunningSecondsForLog,
    getUserDisplayName,
    resolveLogDate,
    timeLogs,
    todaySaoPauloDate,
    userDailyLimitMinutesMap,
  ]);

  const exceedingDailySummaries = useMemo(
    () => dailyUserTimeSummaries.filter(summary => summary.overMinutes > 0),
    [dailyUserTimeSummaries],
  );

  type DailySummaryStatus = 'limite-excedido' | 'dentro-do-limite';

  const dailySummaryStatusLabels: Record<DailySummaryStatus, string> = {
    'limite-excedido': 'Limite excedido',
    'dentro-do-limite': 'Dentro do limite',
  };

  const getDailySummaryStatus = useCallback((summary: UserDailyUsageSummary): DailySummaryStatus => {
    return summary.overMinutes > 0 ? 'limite-excedido' : 'dentro-do-limite';
  }, []);

  const dailyFilterOptions = useMemo(() => {
    const responsaveis = new Set<string>();
    const dates = new Set<string>();
    const statuses = new Set<DailySummaryStatus>();

    dailyUserTimeSummaries.forEach(summary => {
      if (summary.userName) {
        responsaveis.add(summary.userName);
      }

      if (summary.date) {
        dates.add(summary.date);
      }

      statuses.add(getDailySummaryStatus(summary));
    });

    return {
      responsaveis: Array.from(responsaveis).sort((a, b) => a.localeCompare(b, 'pt-BR')),
      dates: Array.from(dates).sort((a, b) => b.localeCompare(a)),
      statuses: Array.from(statuses),
    };
  }, [dailyUserTimeSummaries, getDailySummaryStatus]);

  const dailyFilteredSummaries = useMemo(() => {
    return dailyUserTimeSummaries.filter(summary => {
      const status = getDailySummaryStatus(summary);

      if (dailyFilters.responsavel !== 'todos' && summary.userName !== dailyFilters.responsavel) {
        return false;
      }

      if (dailyFilters.date !== 'todas' && summary.date !== dailyFilters.date) {
        return false;
      }

      if (dailyFilters.status !== 'todos' && dailyFilters.status !== status) {
        return false;
      }

      return true;
    });
  }, [dailyFilters.date, dailyFilters.responsavel, dailyFilters.status, dailyUserTimeSummaries, getDailySummaryStatus]);

  const groupedDailySummaries = useMemo(() => {
    const items = dailyFilteredSummaries.map(summary => ({
      summary,
      status: getDailySummaryStatus(summary),
    }));

    if (dailyGroupBy === 'none') {
      return [
        {
          key: 'all',
          label: '',
          items,
        },
      ];
    }

    const map = new Map<string, { key: string; label: string; items: typeof items }>();

    const formatGroupDate = (value: string) => {
      if (!value) {
        return 'Data não informada';
      }

      const parsed = new Date(value.length > 10 ? value : `${value}T00:00:00`);
      if (Number.isNaN(parsed.getTime())) {
        return value;
      }

      return format(parsed, 'dd/MM/yyyy', { locale: ptBR });
    };

    const getGroupKeyAndLabel = (item: { summary: UserDailyUsageSummary; status: DailySummaryStatus }) => {
      if (dailyGroupBy === 'responsavel') {
        const value = item.summary.userName || 'Responsável não informado';
        return { key: `responsavel-${value}`, label: value };
      }

      if (dailyGroupBy === 'date') {
        const value = item.summary.date;
        return { key: `date-${value}`, label: formatGroupDate(value) };
      }

      if (dailyGroupBy === 'status') {
        const value = item.status;
        return { key: `status-${value}`, label: dailySummaryStatusLabels[value] };
      }

      return { key: 'all', label: '' };
    };

    items.forEach(item => {
      const { key, label } = getGroupKeyAndLabel(item);
      if (!map.has(key)) {
        map.set(key, { key, label, items: [] });
      }
      map.get(key)!.items.push(item);
    });

    return Array.from(map.values());
  }, [dailyFilteredSummaries, dailyGroupBy, dailySummaryStatusLabels, getDailySummaryStatus]);

  const approverNameMap = useMemo(() => {
    const map = new Map<string, string>();

    projectAllocations.forEach((allocation) => {
      const userId = allocation.allocated_user_id;
      const name = allocation.user?.nome_completo?.trim();

      if (!userId || !name || name.length === 0) {
        return;
      }

      if (!map.has(userId)) {
        map.set(userId, name);
      }
    });

    return map;
  }, [projectAllocations]);

  const getApproverDisplayName = useCallback((log: TimeLog) => {
    const approverFromLog = typeof log.aprovador_nome === 'string' ? log.aprovador_nome.trim() : '';
    if (approverFromLog.length > 0) {
      return approverFromLog;
    }

    if (log.aprovador_id) {
      const mappedName = approverNameMap.get(log.aprovador_id);
      if (mappedName) {
        return mappedName;
      }
      return log.aprovador_id;
    }

    return '-';
  }, [approverNameMap]);

  const getLogActivity = useCallback((log: TimeLog) => {
    const activity = typeof log.atividade === 'string' ? log.atividade.trim() : '';
    if (activity.length > 0) {
      return activity;
    }

    const fallbackActivity = (log as { activity?: string | null | undefined }).activity;
    if (typeof fallbackActivity === 'string') {
      const trimmedFallback = fallbackActivity.trim();
      if (trimmedFallback.length > 0) {
        return trimmedFallback;
      }
    }

    return '';
  }, []);

  const taskFilterOptions = useMemo(() => {
    const responsaveis = new Set<string>();
    const statuses = new Set<string>();

    tasks.forEach(task => {
      const responsavel = typeof task.responsavel === 'string' ? task.responsavel.trim() : '';
      if (responsavel) {
        responsaveis.add(responsavel);
      }

      const status = typeof task.status === 'string' ? task.status.trim() : '';
      if (status) {
        statuses.add(status);
      }
    });

    return {
      responsaveis: Array.from(responsaveis).sort((a, b) => a.localeCompare(b, 'pt-BR')),
      statuses: Array.from(statuses).sort((a, b) => a.localeCompare(b, 'pt-BR')),
    };
  }, [tasks]);

  const normalizedTaskSearch = taskFilters.tarefa.trim().toLowerCase();

  const filteredTasksForDisplay = useMemo(() => {
    return tasks.filter(task => {
      const responsavel = typeof task.responsavel === 'string' ? task.responsavel.trim() : '';
      const status = typeof task.status === 'string' ? task.status.trim() : '';
      const tarefaNome = typeof task.tarefa === 'string' ? task.tarefa.trim() : '';

      if (taskFilters.responsavel !== 'todos' && responsavel !== taskFilters.responsavel) {
        return false;
      }

      if (taskFilters.status !== 'todos' && status !== taskFilters.status) {
        return false;
      }

      if (normalizedTaskSearch && !tarefaNome.toLowerCase().includes(normalizedTaskSearch)) {
        return false;
      }

      return true;
    });
  }, [normalizedTaskSearch, taskFilters.responsavel, taskFilters.status, tasks]);

  const groupedTasksForDisplay = useMemo(() => {
    const items = filteredTasksForDisplay.map(task => ({
      task,
      responsavel: typeof task.responsavel === 'string' && task.responsavel.trim().length > 0
        ? task.responsavel.trim()
        : 'Responsável não informado',
      status: typeof task.status === 'string' && task.status.trim().length > 0
        ? task.status.trim()
        : 'Status não informado',
    }));

    if (taskGroupBy === 'none') {
      return [
        {
          key: 'all',
          label: '',
          items,
        },
      ];
    }

    const map = new Map<string, { key: string; label: string; items: typeof items }>();

    items.forEach(item => {
      const key = taskGroupBy === 'responsavel'
        ? `responsavel-${item.responsavel}`
        : `status-${item.status}`;
      const label = taskGroupBy === 'responsavel' ? item.responsavel : item.status;

      if (!map.has(key)) {
        map.set(key, { key, label, items: [] });
      }

      map.get(key)!.items.push(item);
    });

    return Array.from(map.values());
  }, [filteredTasksForDisplay, taskGroupBy]);

  useEffect(() => {
    if (!isAssignDialogOpen) {
      setTaskPendingAssignment(null);
      setSelectedAssignee('');
    }
  }, [isAssignDialogOpen]);

  useEffect(() => {
    setManualOverrides(prev => {
      const updated = { ...prev };
      Object.keys(prev).forEach(taskId => {
        if (manualOverridesFromLogs[taskId] !== undefined) {
          delete updated[taskId];
        }
      });
      return updated;
    });
  }, [manualOverridesFromLogs]);

  const activeTimerEntries = useMemo(() => Object.entries(activeTimers), [activeTimers]);

  const totalActiveTimerSeconds = useMemo(
    () =>
      activeTimerEntries.reduce((total, [taskId]) => {
        const taskSeconds = elapsedSeconds[taskId] ?? 0;
        return total + (Number.isFinite(taskSeconds) ? taskSeconds : 0);
      }, 0),
    [activeTimerEntries, elapsedSeconds],
  );

  const tasksWithLoggedTime = useMemo(() => {
    const trackedTaskIds = new Set<string>();
    timeLogs.forEach(log => {
      if (log.task_id) {
        trackedTaskIds.add(log.task_id);
      }
    });
    activeTimerEntries.forEach(([taskId]) => trackedTaskIds.add(taskId));
    Object.keys(manualOverrides).forEach(taskId => trackedTaskIds.add(taskId));

    return tasks.filter(task => trackedTaskIds.has(task.id)).length;
  }, [tasks, timeLogs, activeTimerEntries, manualOverrides]);

  const taskById = useMemo(() => {
    const map = new Map<string, Task>();
    tasks.forEach(task => {
      map.set(task.id, task);
    });
    return map;
  }, [tasks]);

  const customFieldMap = useMemo(() => {
    const map = new Map<string, string>();
    customFields.forEach(field => {
      map.set(field.field_name, field.field_name);
    });
    return map;
  }, [customFields]);

  useEffect(() => {
    let isCancelled = false;

    const fetchTaskDetails = async () => {
      if (!selectedLogForDetails?.task_id) {
        setDetailTaskData(null);
        setIsDetailTaskLoading(false);
        return;
      }

      const existingTask = taskById.get(selectedLogForDetails.task_id) ?? null;

      if (existingTask) {
        setDetailTaskData(existingTask);
        setIsDetailTaskLoading(false);
        return;
      }

      setIsDetailTaskLoading(true);

      try {
        const { data, error } = await supabase
          .from('tasks')
          .select('*')
          .eq('id', selectedLogForDetails.task_id)
          .maybeSingle<Task>();

        if (isCancelled) {
          return;
        }

        if (error) {
          console.error('Erro ao carregar tarefa associada ao registro de tempo:', error);
          setDetailTaskData(null);
          return;
        }

        if (data) {
          const normalized: Task = {
            ...data,
            task_id: ensureTaskIdentifier(data.task_id, data.id),
            custom_fields: data.custom_fields ?? {},
          };
          setDetailTaskData(normalized);
        } else {
          setDetailTaskData(null);
        }
      } catch (error) {
        if (isCancelled) {
          return;
        }

        console.error('Erro inesperado ao carregar tarefa associada ao registro de tempo:', error);
        setDetailTaskData(null);
      } finally {
        if (!isCancelled) {
          setIsDetailTaskLoading(false);
        }
      }
    };

    fetchTaskDetails();

    return () => {
      isCancelled = true;
    };
  }, [selectedLogForDetails?.task_id, taskById]);

  const handleOpenApprovalDialog = (log: TimeLog, action: 'approve' | 'reject') => {
    if (!canManageApprovals || log.status_aprovacao !== 'pendente') {
      return;
    }

    setApprovalDialogLog(log);
    setApprovalDialogAction(action);
    setApprovalDialogJustification('');
    setIsApprovalDialogOpen(true);
  };

  const handleOpenLogDetails = (log: TimeLog) => {
    setSelectedLogForDetails(log);
    approvalTargetLogRef.current = log;
    const relatedTask = log.task_id ? taskById.get(log.task_id) ?? null : null;
    setDetailTaskData(relatedTask);
    setIsDetailTaskLoading(!relatedTask && Boolean(log.task_id));
    setIsTaskDetailsVisible(false);
    setIsLogDetailsDialogOpen(true);
  };

  const handleLogDetailsDialogOpenChange = (open: boolean) => {
    if (!open) {
      setIsLogDetailsDialogOpen(false);
      setSelectedLogForDetails(null);
      approvalTargetLogRef.current = null;
      setDetailTaskData(null);
      setIsDetailTaskLoading(false);
      setIsTaskDetailsVisible(false);
      setDetailRejectionJustification('');
      return;
    }

    setIsLogDetailsDialogOpen(true);
    setDetailRejectionJustification('');
  };

  const handleOpenLogEditDialog = (log: TimeLog) => {
    setSelectedLogForEdit(log);
    const activity = typeof log.atividade === 'string' ? log.atividade.trim() : '';
    const observation = typeof log.observacoes === 'string' ? log.observacoes.trim() : '';
    const shouldEditActivity = log.tipo_inclusao === 'timer' || activity.length > 0;

    if (shouldEditActivity) {
      setLogEditTargetField('atividade');
      setLogEditObservation(activity.length > 0 ? activity : observation);
    } else {
      setLogEditTargetField('observacoes');
      setLogEditObservation(observation);
    }

    setIsLogEditDialogOpen(true);
  };

  const handleLogEditDialogOpenChange = (open: boolean) => {
    if (!open) {
      if (isUpdatingLogObservation) {
        return;
      }

      setIsLogEditDialogOpen(false);
      setSelectedLogForEdit(null);
      setLogEditObservation('');
      setLogEditTargetField('observacoes');
      return;
    }

    setIsLogEditDialogOpen(true);
  };

  const handleSubmitLogEdit = async () => {
    if (!selectedLogForEdit) {
      return;
    }

    setIsUpdatingLogObservation(true);
    const trimmedObservation = logEditObservation.trim();
    const payload: Partial<TimeLogFormData> =
      logEditTargetField === 'atividade'
        ? { atividade: trimmedObservation.length > 0 ? trimmedObservation : null }
        : { observacoes: trimmedObservation.length > 0 ? trimmedObservation : null };
    const result = await updateTimeLog(selectedLogForEdit.id, payload);
    setIsUpdatingLogObservation(false);

    if (!result) {
      return;
    }

    setIsLogEditDialogOpen(false);
    setSelectedLogForEdit(null);
    setLogEditObservation('');
    setLogEditTargetField('observacoes');
  };

  const handleOpenDeleteDialog = (log: TimeLog) => {
    setLogPendingDeletion(log);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteDialogOpenChange = (open: boolean) => {
    if (!open) {
      if (isDeletingLog) {
        return;
      }

      setIsDeleteDialogOpen(false);
      setLogPendingDeletion(null);
      return;
    }

    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDeleteLog = async () => {
    if (!logPendingDeletion) {
      return;
    }

    setIsDeletingLog(true);
    const success = await deleteTimeLog(logPendingDeletion.id);
    setIsDeletingLog(false);

    if (!success) {
      return;
    }

    setIsDeleteDialogOpen(false);
    setLogPendingDeletion(null);
  };

  const handleApprovalDialogOpenChange = (open: boolean) => {
    if (!open) {
      if (processingApprovalId !== null) {
        return;
      }

      setIsApprovalDialogOpen(false);
      setApprovalDialogLog(null);
      setApprovalDialogAction(null);
      setApprovalDialogJustification('');
      return;
    }

    setIsApprovalDialogOpen(true);
  };

  const approvalDialogTitle = useMemo(() => {
    if (approvalDialogAction === 'approve') {
      return 'Aprovar tempo apontado';
    }

    if (approvalDialogAction === 'reject') {
      return 'Reprovar tempo apontado';
    }

    return 'Gerenciar aprovação';
  }, [approvalDialogAction]);

  const bulkApprovalDialogTitle = useMemo(() => {
    if (bulkApprovalAction === 'approve') {
      return 'Aprovar registros selecionados';
    }

    if (bulkApprovalAction === 'reject') {
      return 'Reprovar registros selecionados';
    }

    return 'Gerenciar registros selecionados';
  }, [bulkApprovalAction]);

  const bulkApprovalDialogDescription = useMemo(() => {
    if (bulkApprovalAction === 'approve') {
      return 'Confirme a aprovação dos registros de tempo selecionados.';
    }

    if (bulkApprovalAction === 'reject') {
      return 'Confirme a reprovação dos registros de tempo selecionados.';
    }

    return 'Selecione uma ação para os registros de tempo selecionados.';
  }, [bulkApprovalAction]);

  const handleConfirmApprovalDialogAction = useCallback(async () => {
    if (!approvalDialogLog || !approvalDialogAction) {
      return;
    }

    setProcessingApprovalId(approvalDialogLog.id);
    setApprovalSubmittingType(approvalDialogAction);

    try {
      const updated = await approveTimeLog(
        approvalDialogLog.id,
        approvalDialogAction === 'approve' ? 'aprovado' : 'reprovado',
        approvalDialogAction === 'reject'
          ? { justificativa: approvalDialogJustification }
          : undefined,
      );

      if (updated) {
        setIsApprovalDialogOpen(false);
        setApprovalDialogLog(null);
        setApprovalDialogAction(null);
        setApprovalDialogJustification('');
      }
    } finally {
      setProcessingApprovalId(null);
      setApprovalSubmittingType(null);
    }
  }, [
    approvalDialogAction,
    approvalDialogJustification,
    approvalDialogLog,
    approveTimeLog,
  ]);

  const getStatusBadge = (log: TimeLog) => {
    switch (log.status_aprovacao) {
      case 'pendente':
        return (
          <Badge
            variant="secondary"
            className="gap-1.5 border border-secondary/60 bg-secondary text-secondary-foreground"
          >
            <Clock className="h-3.5 w-3.5" />
            Pendente
          </Badge>
        );
      case 'aprovado':
        return (
          <Badge className="gap-1.5 bg-green-600 text-white hover:bg-green-600/90">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Aprovado
          </Badge>
        );
      case 'reprovado':
        return (
          <Badge className="gap-1.5 bg-red-600 text-white hover:bg-red-600/90">
            <XCircle className="h-3.5 w-3.5" />
            Reprovado
          </Badge>
        );
      default:
        return <Badge variant="secondary">-</Badge>;
    }
  };

  const getLogTypeLabel = (entryType: TimeLog['tipo_inclusao']) => {
    switch (entryType) {
      case 'manual':
        return 'Manual';
      case 'timer':
        return 'Cronometrado';
      case 'automatico':
      default:
        return 'Automático';
    }
  };

  const getFormattedLogDuration = (log: TimeLog) => {
    if (typeof log.tempo_formatado === 'string' && log.tempo_formatado.trim().length > 0) {
      return log.tempo_formatado;
    }

    return formatMinutes(log.tempo_trabalhado);
  };

  const formatDailySummaryDate = useCallback((value: string | null | undefined): string => {
    if (!value) {
      return '-';
    }

    const parsed = new Date(`${value}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) {
      return value;
    }

    return format(parsed, 'dd/MM/yyyy', { locale: ptBR });
  }, []);

  const parseIsoDate = (value?: string | null): Date | null => {
    if (!value) {
      return null;
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return null;
    }

    return parsed;
  };

  const formatApprovalDate = (value?: string | null) => {
    if (!value) {
      return '-';
    }

    if (/^\d{2}:\d{2}/.test(value)) {
      return '-';
    }

    const parsed = parseIsoDate(value);
    if (!parsed) {
      return '-';
    }

    return format(parsed, 'dd/MM/yyyy', { locale: ptBR });
  };

  const formatApprovalTime = (value?: string | null) => {
    if (!value) {
      return '-';
    }

    if (/^\d{2}:\d{2}/.test(value)) {
      return value.slice(0, 5);
    }

    const parsed = parseIsoDate(value);
    if (!parsed) {
      return '-';
    }

    return format(parsed, 'HH:mm');
  };

  const formatLogDateOnly = (value?: string | null) => {
    if (!value) {
      return '-';
    }

    const parsed = parseIsoDate(value) ?? parseIsoDate(`${value}T00:00:00`);
    if (!parsed) {
      return '-';
    }

    return format(parsed, 'dd/MM/yyyy', { locale: ptBR });
  };

  const formatLogCreatedAt = (value?: string | null) => {
    const parsed = parseIsoDate(value);
    if (!parsed) {
      return '-';
    }

    return format(parsed, 'dd/MM/yyyy HH:mm', { locale: ptBR });
  };

  const timeLogFilterOptions = useMemo(() => {
    const responsaveis = new Set<string>();
    const datas = new Set<string>();
    const tarefas = new Set<string>();
    const tipos = new Set<string>();
    const aprovadores = new Set<string>();
    const statusAprovacoes = new Set<string>();
    const datasAprovacao = new Set<string>();

    const normalizeDate = (value: string | null | undefined) => {
      if (!value) {
        return null;
      }

      const trimmed = value.trim();
      if (!trimmed) {
        return null;
      }

      return trimmed.length > 10 ? trimmed.slice(0, 10) : trimmed;
    };

    timeLogs.forEach(log => {
      const task = log.task_id ? taskById.get(log.task_id) ?? null : null;
      const responsavel = typeof task?.responsavel === 'string' ? task.responsavel.trim() : '';
      const tarefaNome = typeof task?.tarefa === 'string' ? task.tarefa.trim() : '';
      const data = resolveLogDate(log);
      const tipo = log.tipo_inclusao ?? '';
      const aprovador = getApproverDisplayName(log);
      const statusAprovacao = log.status_aprovacao ?? '';
      const dataAprov = normalizeDate(log.aprovacao_data ?? log.data_aprovacao ?? null);

      if (responsavel) {
        responsaveis.add(responsavel);
      }

      if (data) {
        datas.add(data);
      }

      if (tarefaNome) {
        tarefas.add(tarefaNome);
      }

      if (tipo) {
        tipos.add(tipo);
      }

      if (aprovador && aprovador !== '-') {
        aprovadores.add(aprovador);
      }

      if (statusAprovacao) {
        statusAprovacoes.add(statusAprovacao);
      }

      if (dataAprov) {
        datasAprovacao.add(dataAprov);
      }
    });

    return {
      responsaveis: Array.from(responsaveis).sort((a, b) => a.localeCompare(b, 'pt-BR')),
      datas: Array.from(datas).sort((a, b) => b.localeCompare(a)),
      tarefas: Array.from(tarefas).sort((a, b) => a.localeCompare(b, 'pt-BR')),
      tipos: Array.from(tipos),
      aprovadores: Array.from(aprovadores).sort((a, b) => a.localeCompare(b, 'pt-BR')),
      statusAprovacoes: Array.from(statusAprovacoes),
      datasAprovacao: Array.from(datasAprovacao).sort((a, b) => b.localeCompare(a)),
    };
  }, [getApproverDisplayName, resolveLogDate, taskById, timeLogs]);

  const filteredTimeLogs = useMemo(() => {
    const matchesSelect = (value: string, filterValue: string) => {
      return filterValue === 'todos' || filterValue === 'todas' || value === filterValue;
    };

    return timeLogs.filter(log => {
      const task = log.task_id ? taskById.get(log.task_id) ?? null : null;
      const responsavel = typeof task?.responsavel === 'string' ? task.responsavel.trim() : '';
      const tarefaNome = typeof task?.tarefa === 'string' ? task.tarefa.trim() : '';
      const data = resolveLogDate(log) ?? '';
      const tipo = log.tipo_inclusao ?? '';
      const aprovador = getApproverDisplayName(log);
      const statusAprovacao = log.status_aprovacao ?? '';
      const dataAprov = (log.aprovacao_data ?? log.data_aprovacao ?? '').slice(0, 10);

      if (!matchesSelect(responsavel, timeLogFilters.responsavel)) {
        return false;
      }

      if (!matchesSelect(data, timeLogFilters.data)) {
        return false;
      }

      if (!matchesSelect(tarefaNome, timeLogFilters.tarefa)) {
        return false;
      }

      if (!matchesSelect(tipo, timeLogFilters.tipo)) {
        return false;
      }

      if (!matchesSelect(aprovador, timeLogFilters.aprovador)) {
        return false;
      }

      if (!matchesSelect(statusAprovacao, timeLogFilters.statusAprovacao)) {
        return false;
      }

      if (!matchesSelect(dataAprov, timeLogFilters.dataAprovacao)) {
        return false;
      }

      return true;
    });
  }, [
    getApproverDisplayName,
    resolveLogDate,
    taskById,
    timeLogFilters.aprovador,
    timeLogFilters.data,
    timeLogFilters.dataAprovacao,
    timeLogFilters.responsavel,
    timeLogFilters.statusAprovacao,
    timeLogFilters.tarefa,
    timeLogFilters.tipo,
    timeLogs,
  ]);

  const groupedTimeLogs = useMemo(() => {
    const items = filteredTimeLogs.map(log => {
      const task = log.task_id ? taskById.get(log.task_id) ?? null : null;
      const responsavel = typeof task?.responsavel === 'string' ? task.responsavel.trim() : '';
      const tarefaNome = typeof task?.tarefa === 'string' ? task.tarefa.trim() : '';
      const data = resolveLogDate(log) ?? '';
      const tipo = log.tipo_inclusao ?? '';
      const aprovador = getApproverDisplayName(log);
      const statusAprovacao = log.status_aprovacao ?? '';
      const dataAprov = (log.aprovacao_data ?? log.data_aprovacao ?? '').slice(0, 10);

      return {
        log,
        responsavel: responsavel || 'Responsável não informado',
        tarefa: tarefaNome || 'Tarefa não informada',
        data,
        tipo,
        aprovador: aprovador || 'Aprovador não informado',
        statusAprovacao: statusAprovacao || 'pendente',
        dataAprovacao: dataAprov || 'Sem data',
      };
    });

    if (timeLogGroupBy === 'none') {
      return [
        {
          key: 'all',
          label: '',
          items,
        },
      ];
    }

    const map = new Map<string, { key: string; label: string; items: typeof items }>();

    const formatGroupDate = (value: string, fallback: string) => {
      if (!value || value === 'Sem data') {
        return fallback;
      }

      const parsed = new Date(value.length > 10 ? value : `${value}T00:00:00`);
      if (Number.isNaN(parsed.getTime())) {
        return fallback;
      }

      return format(parsed, 'dd/MM/yyyy', { locale: ptBR });
    };

    items.forEach(item => {
      let key = 'all';
      let label = '';

      switch (timeLogGroupBy) {
        case 'responsavel':
          key = `responsavel-${item.responsavel}`;
          label = item.responsavel;
          break;
        case 'data':
          key = `data-${item.data}`;
          label = formatGroupDate(item.data, 'Data não informada');
          break;
        case 'tarefa':
          key = `tarefa-${item.tarefa}`;
          label = item.tarefa;
          break;
        case 'tipo':
          key = `tipo-${item.tipo}`;
          label = item.tipo || 'Tipo não informado';
          break;
        case 'aprovador':
          key = `aprovador-${item.aprovador}`;
          label = item.aprovador;
          break;
        case 'statusAprovacao':
          key = `status-${item.statusAprovacao}`;
          label = item.statusAprovacao;
          break;
        case 'dataAprovacao':
          key = `data-aprov-${item.dataAprovacao}`;
          label = formatGroupDate(item.dataAprovacao, 'Sem data de aprovação');
          break;
        default:
          break;
      }

      if (!map.has(key)) {
        map.set(key, { key, label, items: [] });
      }

      map.get(key)!.items.push(item);
    });

    return Array.from(map.values());
  }, [
    filteredTimeLogs,
    getApproverDisplayName,
    resolveLogDate,
    taskById,
    timeLogGroupBy,
  ]);

  const selectableLogs = useMemo(() => {
    if (!canManageApprovals) {
      return [] as TimeLog[];
    }

    return filteredTimeLogs.filter(log => log.status_aprovacao !== 'aprovado');
  }, [canManageApprovals, filteredTimeLogs]);

  const selectableLogsSet = useMemo(() => new Set(selectableLogs.map(log => log.id)), [selectableLogs]);

  const selectedLogs = useMemo(() => {
    if (!canManageApprovals || selectedLogIds.length === 0) {
      return [] as TimeLog[];
    }

    const selectedSet = new Set(selectedLogIds.filter(id => selectableLogsSet.has(id)));
    if (selectedSet.size === 0) {
      return [] as TimeLog[];
    }

    return selectableLogs.filter(log => selectedSet.has(log.id));
  }, [canManageApprovals, selectableLogs, selectableLogsSet, selectedLogIds]);

  useEffect(() => {
    if (!canManageApprovals) {
      setSelectedLogIds([]);
      return;
    }

    setSelectedLogIds(prev => prev.filter(id => selectableLogsSet.has(id)));
  }, [canManageApprovals, selectableLogsSet]);

  useEffect(() => {
    if (!selectedLogForDetails) {
      return;
    }

    const updated = timeLogs.find(log => log.id === selectedLogForDetails.id);

    if (!updated) {
      setSelectedLogForDetails(null);
      setIsLogDetailsDialogOpen(false);
      return;
    }

    if (updated.updated_at === selectedLogForDetails.updated_at) {
      return;
    }

    setSelectedLogForDetails(updated);
  }, [selectedLogForDetails, timeLogs]);

  const allSelectableSelected = useMemo(() => {
    if (selectableLogs.length === 0) {
      return false;
    }

    return selectableLogs.every(log => selectedLogIds.includes(log.id));
  }, [selectableLogs, selectedLogIds]);

  const selectedLogsCount = selectedLogs.length;

  const headerCheckboxState = useMemo(() => {
    if (selectableLogs.length === 0) {
      return false;
    }

    if (allSelectableSelected) {
      return true;
    }

    return selectedLogsCount > 0 ? 'indeterminate' : false;
  }, [allSelectableSelected, selectableLogs.length, selectedLogsCount]);

  useEffect(() => {
    if (!selectedLogForEdit) {
      return;
    }

    const updated = timeLogs.find(log => log.id === selectedLogForEdit.id);

    if (!updated && !isUpdatingLogObservation) {
      setIsLogEditDialogOpen(false);
      setSelectedLogForEdit(null);
      setLogEditObservation('');
    }
  }, [isUpdatingLogObservation, selectedLogForEdit, timeLogs]);

  const selectionSummaryLabel = useMemo(() => {
    if (selectedLogsCount === 0) {
      return 'Nenhum registro selecionado.';
    }

    if (selectedLogsCount === 1) {
      return '1 registro selecionado.';
    }

    return `${selectedLogsCount} registros selecionados.`;
  }, [selectedLogsCount]);

  const bulkSelectedLogsPreview = useMemo(() => {
    if (selectedLogsCount === 0) {
      return [] as TimeLog[];
    }

    return selectedLogs.slice(0, 5);
  }, [selectedLogs, selectedLogsCount]);

  const remainingBulkSelectionCount = Math.max(0, selectedLogsCount - bulkSelectedLogsPreview.length);

  const timeLogTableColumnCount = canManageApprovals ? 13 : 11;

  const handleRowSelectionChange = useCallback((log: TimeLog, checked: boolean) => {
    if (!canManageApprovals || log.status_aprovacao === 'aprovado') {
      return;
    }

    setSelectedLogIds(prev => {
      const exists = prev.includes(log.id);
      if (checked) {
        if (exists) {
          return prev;
        }
        return [...prev, log.id];
      }

      if (!exists) {
        return prev;
      }

      return prev.filter(id => id !== log.id);
    });
  }, [canManageApprovals]);

  const handleToggleSelectAll = useCallback((checked: boolean) => {
    if (!canManageApprovals) {
      return;
    }

    if (!checked) {
      setSelectedLogIds([]);
      return;
    }

    setSelectedLogIds(selectableLogs.map(log => log.id));
  }, [canManageApprovals, selectableLogs]);

  const handleOpenBulkApprovalDialog = useCallback((action: 'approve' | 'reject') => {
    if (!canManageApprovals || selectedLogsCount === 0) {
      return;
    }

    setBulkApprovalAction(action);
    setBulkJustification('');
    setIsBulkApprovalDialogOpen(true);
  }, [canManageApprovals, selectedLogsCount]);

  const handleBulkApprovalDialogOpenChange = useCallback((open: boolean) => {
    if (!open) {
      if (isProcessingBulkApproval) {
        return;
      }

      setIsBulkApprovalDialogOpen(false);
      setBulkApprovalAction(null);
      setBulkJustification('');
      return;
    }

    setIsBulkApprovalDialogOpen(true);
  }, [isProcessingBulkApproval]);

  const handleConfirmBulkApproval = useCallback(async () => {
    if (!bulkApprovalAction || selectedLogIds.length === 0) {
      return;
    }

    const logsToUpdate = timeLogs.filter(log => selectedLogIds.includes(log.id) && log.status_aprovacao !== 'aprovado');

    if (logsToUpdate.length === 0) {
      setIsBulkApprovalDialogOpen(false);
      setBulkApprovalAction(null);
      setBulkJustification('');
      return;
    }

    if (bulkApprovalAction === 'reject' && bulkJustification.trim().length === 0) {
      return;
    }

    setIsProcessingBulkApproval(true);

    try {
      let encounteredFailure = false;
      for (const log of logsToUpdate) {
        const updated = await approveTimeLog(
          log.id,
          bulkApprovalAction === 'approve' ? 'aprovado' : 'reprovado',
          bulkApprovalAction === 'reject'
            ? { justificativa: bulkJustification }
            : undefined,
        );

        if (!updated) {
          encounteredFailure = true;
          break;
        }
      }

      if (!encounteredFailure) {
        setSelectedLogIds(prev => prev.filter(id => !logsToUpdate.some(log => log.id === id)));
        setIsBulkApprovalDialogOpen(false);
        setBulkApprovalAction(null);
        setBulkJustification('');
      }
    } finally {
      setIsProcessingBulkApproval(false);
    }
  }, [
    approveTimeLog,
    bulkApprovalAction,
    bulkJustification,
    selectedLogIds,
    timeLogs,
  ]);

  const totalProjectApprovedTime = getProjectTotalApprovedTime();
  const totalProjectPendingTime = getProjectTotalPendingTime();
  const timeLog = selectedLogForDetails;
  const detailTask = timeLog?.task_id
    ? detailTaskData ?? taskById.get(timeLog.task_id) ?? null
    : null;
  const detailApproverName = selectedLogForDetails ? getApproverDisplayName(selectedLogForDetails) : '-';
  const detailDuration = selectedLogForDetails ? getFormattedLogDuration(selectedLogForDetails) : '-';
  const detailPeriod = selectedLogForDetails
    ? `${formatLogCreatedAt(selectedLogForDetails.data_inicio)} → ${formatLogCreatedAt(selectedLogForDetails.data_fim)}`
    : '-';
  const detailTaskDescription = detailTask?.descricao_tarefa?.trim() ?? '';
  const detailApproverDisplay =
    detailApproverName && detailApproverName.trim() !== '-' ? detailApproverName : null;
  const detailLogCreatedAt = selectedLogForDetails
    ? formatLogCreatedAt(selectedLogForDetails.created_at)
    : null;
  const detailApprovalDate =
    selectedLogForDetails && selectedLogForDetails.status_aprovacao !== 'pendente'
      ? formatApprovalDate(
          selectedLogForDetails.aprovacao_data ?? selectedLogForDetails.data_aprovacao,
        )
      : null;
  const detailApprovalTime =
    selectedLogForDetails && selectedLogForDetails.status_aprovacao !== 'pendente'
      ? formatApprovalTime(
          selectedLogForDetails.aprovacao_hora ?? selectedLogForDetails.data_aprovacao,
        )
      : null;
  const detailLogCreatedAtDisplay =
    detailLogCreatedAt && detailLogCreatedAt !== '-' ? detailLogCreatedAt : null;
  const detailApprovalDateDisplay =
    detailApprovalDate && detailApprovalDate !== '-' ? detailApprovalDate : null;
  const detailApprovalTimeDisplay =
    detailApprovalTime && detailApprovalTime !== '-' ? detailApprovalTime : null;
  const detailPeriodDisplay = detailPeriod !== '-' ? detailPeriod : null;
  const detailDurationDisplay =
    detailDuration && detailDuration !== '-' ? detailDuration : '00:00:00';

  useEffect(() => {
    if (!selectedLogForDetails) {
      return;
    }

    const updatedLog = timeLogs.find(log => log.id === selectedLogForDetails.id);
    if (!updatedLog) {
      return;
    }

    setSelectedLogForDetails(prev => {
      if (!prev || prev.id !== updatedLog.id || prev === updatedLog) {
        return prev;
      }

      return updatedLog;
    });
  }, [selectedLogForDetails?.id, timeLogs]);

  const detailStatusInfo = useMemo(() => {
    const baseClass =
      'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold';
    if (!selectedLogForDetails?.status_aprovacao) {
      return {
        label: '—',
        className: `${baseClass} border text-muted-foreground`,
        icon: <Clock className="h-3.5 w-3.5" />,
      };
    }

    switch (selectedLogForDetails.status_aprovacao) {
      case 'aprovado':
        return {
          label: 'Aprovado',
          className: `${baseClass} bg-green-600 text-white`,
          icon: <CheckCircle2 className="h-3.5 w-3.5" />,
        };
      case 'reprovado':
        return {
          label: 'Reprovado',
          className: `${baseClass} bg-red-600 text-white`,
          icon: <XCircle className="h-3.5 w-3.5" />,
        };
      case 'pendente':
      default:
        return {
          label: 'Pendente',
          className: `${baseClass} border border-secondary/60 bg-secondary text-secondary-foreground`,
          icon: <Clock className="h-3.5 w-3.5" />,
        };
    }
  }, [selectedLogForDetails?.status_aprovacao]);

  const parseCommissionedFlag = (value: unknown): boolean => {
    if (typeof value === 'string') {
      const normalized = value
        .trim()
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .toLowerCase();
      return normalized === 'sim';
    }

    if (typeof value === 'boolean') {
      return value;
    }

    return false;
  };

  const [isCommissioned, setIsCommissioned] = useState<boolean>(
    parseCommissionedFlag(timeLog?.comissionado ?? timeLog?.is_billable),
  );
  const [pendingApprovalAction, setPendingApprovalAction] = useState<'approve' | 'reject' | null>(null);
  const [hasPendingApprovalChanges, setHasPendingApprovalChanges] = useState(false);
  const [detailRejectionJustification, setDetailRejectionJustification] = useState('');
  const approvalTargetLogRef = useRef<TimeLog | null>(null);

  useEffect(() => {
    approvalTargetLogRef.current = selectedLogForDetails ?? null;
  }, [selectedLogForDetails]);

  useEffect(() => {
    setIsCommissioned(
      parseCommissionedFlag(timeLog?.comissionado ?? timeLog?.is_billable),
    );
    setPendingApprovalAction(null);
    setHasPendingApprovalChanges(false);
    setDetailRejectionJustification(
      typeof timeLog?.justificativa_reprovacao === 'string'
        ? timeLog.justificativa_reprovacao.trim()
        : '',
    );
  }, [
    timeLog?.id,
    timeLog?.approval_status,
    timeLog?.comissionado,
    timeLog?.is_billable,
    timeLog?.justificativa_reprovacao,
  ]);

  const timeLogActivity = useMemo(() => {
    if (!timeLog) {
      return '';
    }

    if (typeof timeLog.atividade === 'string') {
      const trimmed = timeLog.atividade.trim();
      if (trimmed.length > 0) {
        return trimmed;
      }
    }

    const fallbackActivity = (timeLog as { activity?: string | null | undefined }).activity;
    if (typeof fallbackActivity === 'string') {
      const trimmedFallback = fallbackActivity.trim();
      if (trimmedFallback.length > 0) {
        return trimmedFallback;
      }
    }

    return '';
  }, [timeLog]);

  const normalizedApproverName =
    typeof timeLog?.aprovador_nome === 'string' ? timeLog.aprovador_nome.trim() : '';
  const rawApprovalDate = timeLog?.aprovacao_data ?? timeLog?.data_aprovacao ?? '';
  const normalizedApprovalDate =
    typeof rawApprovalDate === 'string' ? rawApprovalDate.trim() : '';
  const rawApprovalTime = timeLog?.aprovacao_hora ?? timeLog?.data_aprovacao ?? '';
  const normalizedApprovalTime =
    typeof rawApprovalTime === 'string' ? rawApprovalTime.trim() : '';
  const hasApprovalName = normalizedApproverName.length > 0;
  const isLogApprovalInfoComplete = useCallback((log: TimeLog | null | undefined) => {
    if (!log) {
      return false;
    }

    const approverName =
      typeof log.aprovador_nome === 'string' ? log.aprovador_nome.trim() : '';
    const approvalDateRaw = (() => {
      const raw = log.aprovacao_data ?? log.data_aprovacao ?? null;
      if (typeof raw === 'string') {
        return raw.trim();
      }
      return '';
    })();
    const approvalTimeRaw = (() => {
      const raw = log.aprovacao_hora ?? log.data_aprovacao ?? null;
      if (typeof raw === 'string') {
        return raw.trim();
      }
      return '';
    })();

    return approverName.length > 0 && approvalDateRaw.length > 0 && approvalTimeRaw.length > 0;
  }, []);
  const isApprovalInfoComplete = isLogApprovalInfoComplete(timeLog);
  const isApprovalActionDisabled = !timeLog || isApprovalInfoComplete;
  const defaultApproverName = useMemo(() => {
    if (hasApprovalName) {
      return normalizedApproverName;
    }

    const fallbackLoggedUser = getLoggedUserDisplayName();
    if (fallbackLoggedUser.length > 0) {
      return fallbackLoggedUser;
    }

    return '';
  }, [getLoggedUserDisplayName, hasApprovalName, normalizedApproverName]);
  const isApprovalOkButtonDisabled = isApprovalActionDisabled || !hasPendingApprovalChanges;
  const canSubmitDetailApproval =
    !isApprovalOkButtonDisabled && Boolean(approvalTargetLogRef.current ?? timeLog);
  const detailApprovalTargetLog = canSubmitDetailApproval
    ? approvalTargetLogRef.current ?? timeLog ?? null
    : null;
  const detailApprovalAction: ApprovalAction =
    pendingApprovalAction === 'reject'
      ? 'reprovar'
      : pendingApprovalAction === 'approve'
        ? 'aprovar'
        : 'pendente';
  const detailApprovalJustification =
    pendingApprovalAction === 'reject'
      ? detailRejectionJustification.trim()
      : null;
  const detailApprovalApproverName = (() => {
    const normalizedDefault = defaultApproverName.trim();
    if (normalizedDefault.length > 0) {
      return normalizedDefault;
    }

    const supabaseMetadataName =
      typeof supabaseUser?.user_metadata?.full_name === 'string'
        ? supabaseUser.user_metadata.full_name.trim()
        : '';
    if (supabaseMetadataName.length > 0) {
      return supabaseMetadataName;
    }

    const supabaseEmail = typeof supabaseUser?.email === 'string' ? supabaseUser.email.trim() : '';
    return supabaseEmail.length > 0 ? supabaseEmail : undefined;
  })();

  function handleApprove() {
    if (!timeLog || isApprovalInfoComplete) {
      return;
    }

    approvalTargetLogRef.current = timeLog;
    setPendingApprovalAction('approve');
    setHasPendingApprovalChanges(true);
  }

  function handleReject() {
    if (!timeLog || isApprovalInfoComplete) {
      return;
    }

    setIsCommissioned(false);
    approvalTargetLogRef.current = timeLog;
    setPendingApprovalAction('reject');
    setHasPendingApprovalChanges(true);
  }

  function handleToggleCommissioned() {
    if (!timeLog || isApprovalInfoComplete) {
      return;
    }

    const nextValue = !isCommissioned;
    setIsCommissioned(nextValue);
    setHasPendingApprovalChanges(true);
    setPendingApprovalAction(prev => prev ?? 'approve');
  }

  const handleCloseDetailApproval = useCallback(() => {
    setPendingApprovalAction(null);
    setHasPendingApprovalChanges(false);
    setDetailRejectionJustification('');
    handleLogDetailsDialogOpenChange(false);
  }, [handleLogDetailsDialogOpenChange]);

  const getTaskFieldDisplayValue = useCallback(
    (value: Task[keyof Task], definition: TaskFieldDefinition): string | null => {
      if (value === null || value === undefined) {
        return null;
      }

      switch (definition.type) {
        case 'boolean':
          if (typeof value === 'boolean') {
            return value ? 'Sim' : 'Não';
          }
          return null;
        case 'numeric':
          if (typeof value === 'number' && !Number.isNaN(value)) {
            return value.toString();
          }
          return null;
        case 'percentage':
          if (typeof value === 'number' && !Number.isNaN(value)) {
            return `${value}%`;
          }
          return null;
        case 'date':
        case 'datetime':
          if (typeof value === 'string') {
            const trimmed = value.trim();
            if (!trimmed) {
              return null;
            }
            const parsed = parseIsoDate(trimmed);
            if (!parsed) {
              return trimmed;
            }
            return format(parsed, definition.type === 'date' ? 'dd/MM/yyyy' : 'dd/MM/yyyy HH:mm', {
              locale: ptBR,
            });
          }
          return null;
        case 'link':
          if (typeof value === 'string') {
            const trimmed = value.trim();
            return trimmed.length > 0 ? trimmed : null;
          }
          return null;
        default:
          break;
      }

      if (typeof value === 'string') {
        const trimmed = value.trim();
        return trimmed.length > 0 ? trimmed : null;
      }

      if (typeof value === 'number') {
        return Number.isNaN(value) ? null : value.toString();
      }

      if (typeof value === 'boolean') {
        return value ? 'Sim' : 'Não';
      }

      return null;
    },
    [],
  );

  const taskDetailEntries = useMemo<TaskDetailEntry[]>(() => {
    if (!detailTask) {
      return [];
    }

    return TASK_FIELD_DEFINITIONS.reduce<TaskDetailEntry[]>((acc, definition) => {
      const rawValue = detailTask[definition.key];
      let displayValue = getTaskFieldDisplayValue(rawValue, definition);

      if (definition.key === 'user_id') {
        const userId = typeof rawValue === 'string' ? rawValue : null;

        if (userId) {
          const mappedName = taskOwnerNameMap.get(userId);
          displayValue = mappedName ?? displayValue ?? userId;
        }
      }

      if (!displayValue) {
        return acc;
      }

      let valueNode: ReactNode = displayValue;
      if (definition.type === 'link') {
        valueNode = (
          <a
            href={displayValue}
            target="_blank"
            rel="noopener noreferrer"
            className="break-words text-primary underline decoration-primary/60 underline-offset-2 hover:text-primary/80"
          >
            {displayValue}
          </a>
        );
      }

      acc.push({
        key: String(definition.key),
        label: definition.label,
        value: valueNode,
        fullWidth: definition.fullWidth,
        isLongText: definition.isLongText,
      });

      return acc;
    }, []);
  }, [detailTask, getTaskFieldDisplayValue, taskOwnerNameMap]);

  const taskCustomFieldEntries = useMemo<TaskDetailEntry[]>(() => {
    if (!detailTask) {
      return [];
    }

    const customValues = detailTask.custom_fields ?? {};

    return Object.entries(customValues).reduce<TaskDetailEntry[]>((acc, [key, rawValue]) => {
      if (rawValue === null || rawValue === undefined) {
        return acc;
      }

      let displayValue: string | null = null;

      if (typeof rawValue === 'string') {
        const trimmed = rawValue.trim();
        displayValue = trimmed.length > 0 ? trimmed : null;
      } else if (typeof rawValue === 'number') {
        displayValue = Number.isNaN(rawValue) ? null : rawValue.toString();
      } else if (typeof rawValue === 'boolean') {
        displayValue = rawValue ? 'Sim' : 'Não';
      } else if (Array.isArray(rawValue)) {
        const normalized = rawValue
          .map(item => {
            if (item === null || item === undefined) {
              return null;
            }
            const text = typeof item === 'string' ? item.trim() : String(item);
            return text.length > 0 ? text : null;
          })
          .filter((value): value is string => value !== null);

        displayValue = normalized.length > 0 ? normalized.join(', ') : null;
      } else {
        try {
          displayValue = JSON.stringify(rawValue);
        } catch (error) {
          console.error('Erro ao formatar campo personalizado da tarefa:', error);
          displayValue = null;
        }
      }

      if (!displayValue) {
        return acc;
      }

      const label = customFieldMap.get(key) ?? key;

      acc.push({
        key: `custom-${key}`,
        label,
        value: displayValue,
        fullWidth: displayValue.length > 60,
        isLongText: displayValue.length > 120,
      });

      return acc;
    }, []);
  }, [detailTask, customFieldMap]);

  const hasTaskDetailInformation = taskDetailEntries.length > 0 || taskCustomFieldEntries.length > 0;

  const handleAssignmentDialogOpenChange = (open: boolean) => {
    if (!open && isAssigning) {
      return;
    }

    setIsAssignDialogOpen(open);
  };

  const handleStartTimerRequest = (task: Task) => {
    const hasResponsavel = typeof task.responsavel === 'string' && task.responsavel.trim().length > 0;

    if (!hasResponsavel) {
      setTaskPendingAssignment(task);
      setSelectedAssignee('');
      setIsAssignDialogOpen(true);
      return;
    }

    startTimer(task.id);
  };

  const handleConfirmAssignment = async () => {
    if (!taskPendingAssignment) {
      return;
    }

    if (!teamMembers.length) {
      toast({
        title: 'Equipe não encontrada',
        description: 'Não há membros ativos disponíveis para atribuir a tarefa.',
        variant: 'destructive',
      });
      return;
    }

    if (!selectedAssignee) {
      toast({
        title: 'Selecione um responsável',
        description: 'Escolha um membro da equipe para associar à tarefa.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsAssigning(true);
      const updatedTask = await updateTask(taskPendingAssignment.id, { responsavel: selectedAssignee });

      if (!updatedTask) {
        toast({
          title: 'Erro ao atualizar tarefa',
          description: 'Não foi possível associar o responsável selecionado.',
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Responsável definido',
        description: `${selectedAssignee} foi associado à tarefa com sucesso.`,
      });

      setIsAssignDialogOpen(false);
      startTimer(updatedTask.id);
    } finally {
      setIsAssigning(false);
    }
  };

  if (tasksLoading || logsLoading) {
    return <div className="p-4">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header com total de horas do projeto */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Gestão de Tempo do Projeto
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:gap-6">
            <div className="text-2xl font-bold">
              Total Aprovado: {formatMinutes(totalProjectApprovedTime)}
            </div>
            <div className="text-lg font-semibold text-muted-foreground sm:text-xl">
              Total Pendente: {formatMinutes(totalProjectPendingTime)}
            </div>
            <div className="text-lg font-semibold text-destructive sm:text-xl">
              Total em andamento: {formatTime(totalActiveTimerSeconds)}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tempo diário por responsável</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="space-y-1">
              <Label className="text-xs uppercase text-muted-foreground">Responsável</Label>
              <Select
                value={dailyFilters.responsavel}
                onValueChange={value => setDailyFilters(prev => ({ ...prev, responsavel: value }))}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Todos os responsáveis" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {dailyFilterOptions.responsaveis.map(responsavel => (
                    <SelectItem key={responsavel} value={responsavel}>
                      {responsavel}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs uppercase text-muted-foreground">Data</Label>
              <Select
                value={dailyFilters.date}
                onValueChange={value => setDailyFilters(prev => ({ ...prev, date: value }))}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Todas as datas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas</SelectItem>
                  {dailyFilterOptions.dates.map(dateValue => (
                    <SelectItem key={dateValue} value={dateValue}>
                      {formatLogDateOnly(dateValue)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs uppercase text-muted-foreground">Status</Label>
              <Select
                value={dailyFilters.status}
                onValueChange={value => setDailyFilters(prev => ({ ...prev, status: value }))}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Todos os status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {dailyFilterOptions.statuses.map(statusValue => (
                    <SelectItem key={statusValue} value={statusValue}>
                      {dailySummaryStatusLabels[statusValue as DailySummaryStatus]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs uppercase text-muted-foreground">Agrupar por</Label>
              <Select value={dailyGroupBy} onValueChange={value => setDailyGroupBy(value as typeof dailyGroupBy)}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Sem agrupamento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem agrupamento</SelectItem>
                  <SelectItem value="responsavel">Responsável</SelectItem>
                  <SelectItem value="date">Data</SelectItem>
                  <SelectItem value="status">Status</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {dailyUserTimeSummaries.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhum tempo apontado para exibir no período carregado.
            </p>
          ) : (
            <>
              {exceedingDailySummaries.length > 0 ? (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Limite diário excedido</AlertTitle>
                  <AlertDescription>
                    <ul className="list-disc space-y-1 pl-4">
                      {exceedingDailySummaries.map(summary => (
                        <li key={`alert-${summary.key}`}>
                          {summary.userName} em {formatDailySummaryDate(summary.date)} registrou
                          {' '}
                          {formatMinutes(summary.totalMinutes)} (aprovado {formatMinutes(summary.approvedMinutes)}
                          {' '}
                          + pendente {formatMinutes(summary.pendingMinutes)}) e excedeu o limite diário de
                          {' '}
                          {formatMinutes(summary.limitMinutes)} em {formatMinutes(summary.overMinutes)}.
                        </li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              ) : null}

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Responsável</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Tempo aprovado</TableHead>
                      <TableHead>Tempo em cronômetro</TableHead>
                      <TableHead>Total apontado</TableHead>
                      <TableHead>Limite diário</TableHead>
                      <TableHead>Excedente</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {groupedDailySummaries.map(group => (
                      <Fragment key={group.key}>
                        {dailyGroupBy !== 'none' && group.items.length > 0 ? (
                          <TableRow className="bg-muted/40">
                            <TableCell colSpan={7} className="font-semibold uppercase text-muted-foreground">
                              {group.label}
                            </TableCell>
                          </TableRow>
                        ) : null}
                        {group.items.map(({ summary }) => {
                          const isOverLimit = summary.overMinutes > 0;

                          return (
                            <TableRow
                              key={summary.key}
                              className={isOverLimit ? 'bg-red-50 hover:bg-red-50/80' : undefined}
                            >
                              <TableCell className={isOverLimit ? 'font-semibold text-red-700' : undefined}>
                                {summary.userName}
                              </TableCell>
                              <TableCell className={isOverLimit ? 'font-semibold text-red-700' : undefined}>
                                {formatDailySummaryDate(summary.date)}
                              </TableCell>
                              <TableCell>{formatMinutes(summary.approvedMinutes)}</TableCell>
                              <TableCell>
                                {summary.runningSeconds > 0 ? formatTime(summary.runningSeconds) : '–'}
                              </TableCell>
                              <TableCell className="font-semibold">{formatMinutes(summary.totalMinutes)}</TableCell>
                              <TableCell>{formatMinutes(summary.limitMinutes)}</TableCell>
                              <TableCell>
                                {isOverLimit ? (
                                  <span className="font-semibold text-red-700">
                                    {formatMinutes(summary.overMinutes)}
                                  </span>
                                ) : (
                                  '–'
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </Fragment>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Controle de Tempo por Tarefa */}
      <Card>
        <CardHeader>
          <CardTitle>Tarefas e Controle de Tempo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="space-y-1">
              <Label className="text-xs uppercase text-muted-foreground">Responsável</Label>
              <Select
                value={taskFilters.responsavel}
                onValueChange={value => setTaskFilters(prev => ({ ...prev, responsavel: value }))}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Todos os responsáveis" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {taskFilterOptions.responsaveis.map(responsavel => (
                    <SelectItem key={responsavel} value={responsavel}>
                      {responsavel}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs uppercase text-muted-foreground">Status</Label>
              <Select
                value={taskFilters.status}
                onValueChange={value => setTaskFilters(prev => ({ ...prev, status: value }))}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Todos os status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {taskFilterOptions.statuses.map(status => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs uppercase text-muted-foreground">Tarefa</Label>
              <Input
                value={taskFilters.tarefa}
                onChange={event => setTaskFilters(prev => ({ ...prev, tarefa: event.target.value }))}
                placeholder="Buscar tarefa"
                className="h-9"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs uppercase text-muted-foreground">Agrupar por</Label>
              <Select value={taskGroupBy} onValueChange={value => setTaskGroupBy(value as typeof taskGroupBy)}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Sem agrupamento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem agrupamento</SelectItem>
                  <SelectItem value="responsavel">Responsável</SelectItem>
                  <SelectItem value="status">Status</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <span className="text-sm text-muted-foreground">
              Total de tarefas contabilizadas: <span className="font-semibold text-foreground">{tasksWithLoggedTime}</span>
            </span>
            {activeTimerEntries.length > 0 && (
              <div className="flex flex-wrap gap-3">
                {activeTimerEntries.map(([taskId]) => {
                  const task = tasks.find(t => t.id === taskId);
                  const currentSeconds = elapsedSeconds[taskId] || 0;
                  const isActionRunning = Boolean(timerActionsInFlight[taskId]);
                  return (
                    <div key={taskId} className="rounded-md border px-3 py-2 shadow-sm">
                      <div className="text-xs uppercase text-muted-foreground">Timer ativo</div>
                      <div className="font-medium">{task?.tarefa || 'Tarefa'}</div>
                      <div className="font-mono text-sm">{formatTime(currentSeconds)}</div>
                      <div className="mt-2 flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => stopTimer(taskId)}
                          disabled={isActionRunning}
                        >
                          Parar
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => resetTimer(taskId)}
                          disabled={isActionRunning}
                        >
                          Zerar
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tarefa</TableHead>
                <TableHead>Usuário</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Tempo do Log</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Cronômetro</TableHead>
                <TableHead>Tempo Manual</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {groupedTasksForDisplay.map(group => (
                <Fragment key={group.key}>
                  {taskGroupBy !== 'none' && group.items.length > 0 ? (
                    <TableRow className="bg-muted/40">
                      <TableCell colSpan={7} className="font-semibold uppercase text-muted-foreground">
                        {group.label}
                      </TableCell>
                    </TableRow>
                  ) : null}
                  {group.items.map(({ task }) => {
                    const taskTime = getTaskTotalTime(task.id);
                    const isTimerActive = Boolean(activeTimers[task.id]);
                    const manualTimeValue = manualTime[task.id] || { hours: 0, minutes: 0 };
                    const manualOverrideMinutes = (() => {
                      const rawOverride = manualOverrides[task.id] ?? manualOverridesFromLogs[task.id];
                      if (rawOverride === null || rawOverride === undefined) {
                        return undefined;
                      }

                      const numericOverride = typeof rawOverride === 'number'
                        ? rawOverride
                        : Number.parseFloat(String(rawOverride));

                      if (!Number.isFinite(numericOverride) || numericOverride <= 0) {
                        return undefined;
                      }

                      return numericOverride;
                    })();
                    const runningSeconds = elapsedSeconds[task.id] || 0;
                    const requiresResponsavel = !(typeof task.responsavel === 'string' && task.responsavel.trim().length > 0);
                    const startButtonTitle = manualOverrideMinutes !== undefined
                      ? 'Cronômetro bloqueado por registro existente. Remova ou ajuste o registro para iniciar o cronômetro.'
                      : requiresResponsavel
                        ? 'Associe um responsável antes de iniciar o cronômetro.'
                        : undefined;
                    const displayedTime = manualOverrideMinutes !== undefined
                      ? formatMinutes(manualOverrideMinutes)
                      : isTimerActive
                        ? formatTime(taskTime * 60 + runningSeconds)
                        : formatMinutes(taskTime);
                    const latestLogInfo = latestFinalizedLogByTask.get(task.id) ?? null;
                    const usageLogDateIso = latestLogInfo?.logDate ?? null;
                    const usageUserId = latestLogInfo?.userId ?? task.user_id ?? null;
                    const usageRowFromLog = usageUserId && usageLogDateIso
                      ? getDailyUsageFor(usageUserId, usageLogDateIso)
                      : null;
                    const fallbackUsageRow = !usageRowFromLog && usageUserId && todaySaoPauloDate
                      ? getDailyUsageFor(usageUserId, todaySaoPauloDate)
                      : null;
                    const resolvedUsageRow = usageRowFromLog ?? fallbackUsageRow ?? null;
                    const resolvedUsageDateIso = usageRowFromLog
                      ? usageLogDateIso
                      : fallbackUsageRow
                        ? todaySaoPauloDate
                        : null;
                    const tempoEstouradoMinutes = resolvedUsageRow?.tempo_estourado_minutes ?? 0;
                    const overUserLimit = resolvedUsageRow?.over_user_limit ?? false;
                    const isOverLimit = overUserLimit || tempoEstouradoMinutes > 0;
                    const userLimitHours = resolvedUsageRow?.horas_liberadas_por_dia ?? 8;
                    const statusLabel = resolvedUsageRow
                      ? isOverLimit
                        ? 'Ultrapassado o valor de horas limite'
                        : 'OK'
                      : 'Sem registros';
                    const highlightClass = isOverLimit ? 'bg-red-50 text-red-600 font-semibold' : undefined;
                    const highlightRowClass = isOverLimit ? 'bg-red-50 hover:bg-red-50/80' : undefined;
                    const statusTooltip = resolvedUsageRow
                      ? isOverLimit
                        ? `Excedeu o limite de ${userLimitHours}h do usuário.`
                        : `Dentro do limite diário de ${userLimitHours}h.`
                      : 'Nenhum registro finalizado para calcular limites neste dia.';
                    const runningLog = runningTimeLogByTask.get(task.id) ?? null;
                    const latestLogReference = latestLogReferenceByTask.get(task.id) ?? null;
                    const logDateIso = (() => {
                      if (runningLog) {
                        return (
                          runningLog.log_date ??
                          runningLog.data_inicio ??
                          runningLog.started_at ??
                          runningLog.created_at ??
                          null
                        );
                      }

                      if (latestLogReference) {
                        return latestLogReference.iso;
                      }

                      return resolvedUsageDateIso;
                    })();
                    const formattedLogDate = formatLogDateOnly(logDateIso);
                    const normalizedTaskStatus = typeof task.status === 'string' ? task.status.trim() : '';
                    const taskStatusBadgeClass = (() => {
                      if (!normalizedTaskStatus) {
                        return 'border-muted bg-muted text-muted-foreground';
                      }

                      const lowered = normalizedTaskStatus.toLowerCase();
                      if (lowered.includes('atras')) {
                        return 'border-red-200 bg-red-50 text-red-600';
                      }

                      if (lowered.includes('dia')) {
                        return 'border-emerald-200 bg-emerald-50 text-emerald-600';
                      }

                      return 'border-muted bg-muted text-muted-foreground';
                    })();
                    const tempoDoLogDisplay = (() => {
                      if (isTimerActive) {
                        return formatTime(runningSeconds);
                      }

                      if (runningLog) {
                        const baseMinutes = Number.isFinite(runningLog.tempo_trabalhado)
                          ? runningLog.tempo_trabalhado
                          : 0;
                        const startIso =
                          runningLog.started_at ??
                          runningLog.data_inicio ??
                          runningLog.created_at ??
                          null;

                        if (startIso) {
                          const startTimestamp = Date.parse(startIso);
                          if (Number.isFinite(startTimestamp)) {
                            const elapsed = Math.floor((Date.now() - startTimestamp) / 1000);
                            const safeElapsed = elapsed >= 0 ? elapsed : 0;
                            const baseSeconds = Math.max(0, Math.round(baseMinutes * 60));
                            return formatTime(baseSeconds + safeElapsed);
                          }
                        }

                        if (baseMinutes > 0) {
                          return formatMinutes(baseMinutes);
                        }
                      }

                      return formatMinutes(taskTime);
                    })();

                    return (
                      <TableRow key={task.id} className={highlightRowClass}>
                        <TableCell className="font-medium">{task.tarefa}</TableCell>
                        <TableCell className={highlightClass}>
                          {isOverLimit ? (
                            <span className="text-red-600 font-semibold">{task.responsavel || '-'}</span>
                          ) : (
                            task.responsavel || '-'
                          )}
                        </TableCell>
                        <TableCell className={highlightClass}>{formattedLogDate}</TableCell>
                        <TableCell>
                          <span className="font-mono text-sm">{tempoDoLogDisplay}</span>
                        </TableCell>
                        <TableCell className={highlightClass}>
                          {normalizedTaskStatus ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Badge
                                  variant="outline"
                                  className={`w-fit uppercase tracking-wide ${taskStatusBadgeClass}`}
                                >
                                  {normalizedTaskStatus}
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent>{statusTooltip}</TooltipContent>
                            </Tooltip>
                          ) : (
                            <span className="text-muted-foreground">Sem status</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-2">
                            {isTimerActive && (
                              <Badge className="w-fit border-emerald-500/40 bg-emerald-500/15 text-emerald-600">
                                CRONOMETRANDO
                              </Badge>
                            )}
                            <div className="flex items-center justify-between gap-4">
                              <span className="font-mono text-sm">{displayedTime}</span>
                              <div className="flex gap-2">
                                {isTimerActive ? (
                                  <>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => stopTimer(task.id)}
                                      disabled={Boolean(timerActionsInFlight[task.id])}
                                    >
                                      Parar
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      onClick={() => resetTimer(task.id)}
                                      disabled={Boolean(timerActionsInFlight[task.id])}
                                    >
                                      Zerar
                                    </Button>
                                  </>
                                ) : (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleStartTimerRequest(task)}
                                    disabled={manualOverrideMinutes !== undefined}
                                    title={startButtonTitle}
                                  >
                                    {requiresResponsavel ? 'Definir responsável' : 'Iniciar'}
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              min="0"
                              max="23"
                              placeholder="H"
                              className="w-16"
                              value={manualTimeValue.hours || ''}
                              onChange={(e) => setManualTime(prev => ({
                                ...prev,
                                [task.id]: { ...manualTimeValue, hours: parseInt(e.target.value) || 0 }
                              }))}
                            />
                            <span>:</span>
                            <Input
                              type="number"
                              min="0"
                              max="59"
                              placeholder="M"
                              className="w-16"
                              value={manualTimeValue.minutes || ''}
                              onChange={(e) => setManualTime(prev => ({
                                ...prev,
                                [task.id]: { ...manualTimeValue, minutes: parseInt(e.target.value) || 0 }
                              }))}
                            />
                            <Button size="sm" onClick={() => addManualTime(task.id)}>
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </Fragment>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Log de Tempo */}
      <Card>
        <CardHeader>
      <CardTitle>Histórico de Registros de Tempo</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-6">
        <div className="space-y-1">
          <Label className="text-xs uppercase text-muted-foreground">Responsável</Label>
          <Select
            value={timeLogFilters.responsavel}
            onValueChange={value => setTimeLogFilters(prev => ({ ...prev, responsavel: value }))}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Todos os responsáveis" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              {timeLogFilterOptions.responsaveis.map(responsavel => (
                <SelectItem key={responsavel} value={responsavel}>
                  {responsavel}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs uppercase text-muted-foreground">Data</Label>
          <Select value={timeLogFilters.data} onValueChange={value => setTimeLogFilters(prev => ({ ...prev, data: value }))}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Todas as datas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas</SelectItem>
              {timeLogFilterOptions.datas.map(dataValue => (
                <SelectItem key={dataValue} value={dataValue}>
                  {formatLogDateOnly(dataValue)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs uppercase text-muted-foreground">Tarefa</Label>
          <Select
            value={timeLogFilters.tarefa}
            onValueChange={value => setTimeLogFilters(prev => ({ ...prev, tarefa: value }))}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Todas as tarefas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas</SelectItem>
              {timeLogFilterOptions.tarefas.map(tarefaNome => (
                <SelectItem key={tarefaNome} value={tarefaNome}>
                  {tarefaNome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs uppercase text-muted-foreground">Tipo</Label>
          <Select value={timeLogFilters.tipo} onValueChange={value => setTimeLogFilters(prev => ({ ...prev, tipo: value }))}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Todos os tipos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              {timeLogFilterOptions.tipos.map(tipo => (
                <SelectItem key={tipo} value={tipo}>
                  {tipo.toUpperCase()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs uppercase text-muted-foreground">Aprovador</Label>
          <Select
            value={timeLogFilters.aprovador}
            onValueChange={value => setTimeLogFilters(prev => ({ ...prev, aprovador: value }))}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Todos os aprovadores" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              {timeLogFilterOptions.aprovadores.map(aprovador => (
                <SelectItem key={aprovador} value={aprovador}>
                  {aprovador}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs uppercase text-muted-foreground">Status de Aprovação</Label>
          <Select
            value={timeLogFilters.statusAprovacao}
            onValueChange={value => setTimeLogFilters(prev => ({ ...prev, statusAprovacao: value }))}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Todos os status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              {timeLogFilterOptions.statusAprovacoes.map(status => (
                <SelectItem key={status} value={status}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs uppercase text-muted-foreground">Data da Aprovação</Label>
          <Select
            value={timeLogFilters.dataAprovacao}
            onValueChange={value => setTimeLogFilters(prev => ({ ...prev, dataAprovacao: value }))}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Todas as datas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas</SelectItem>
              {timeLogFilterOptions.datasAprovacao.map(dateValue => (
                <SelectItem key={dateValue} value={dateValue}>
                  {formatLogDateOnly(dateValue)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs uppercase text-muted-foreground">Agrupar por</Label>
          <Select value={timeLogGroupBy} onValueChange={value => setTimeLogGroupBy(value as typeof timeLogGroupBy)}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Sem agrupamento" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Sem agrupamento</SelectItem>
              <SelectItem value="responsavel">Responsável</SelectItem>
              <SelectItem value="data">Data</SelectItem>
              <SelectItem value="tarefa">Tarefa</SelectItem>
              <SelectItem value="tipo">Tipo</SelectItem>
              <SelectItem value="aprovador">Aprovador</SelectItem>
              <SelectItem value="statusAprovacao">Status de Aprovação</SelectItem>
              <SelectItem value="dataAprovacao">Data da Aprovação</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      {canManageApprovals ? (
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">{selectionSummaryLabel}</p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              onClick={() => handleOpenBulkApprovalDialog('approve')}
              disabled={selectedLogsCount === 0 || isProcessingBulkApproval}
              className="gap-1.5"
            >
              <CheckCircle2 className="h-4 w-4" />
              Aprovar selecionados
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => handleOpenBulkApprovalDialog('reject')}
              disabled={selectedLogsCount === 0 || isProcessingBulkApproval}
              className="gap-1.5 border-red-600 text-red-700 hover:bg-red-50 hover:text-red-800"
            >
              <XCircle className="h-4 w-4" />
              Reprovar selecionados
            </Button>
          </div>
        </div>
      ) : null}
      <TooltipProvider delayDuration={200}>
        <Table>
          <TableHeader>
            <TableRow>
            {canManageApprovals ? (
              <TableHead className="w-12">
                <Checkbox
                  aria-label="Selecionar todos os registros pendentes"
                  checked={headerCheckboxState}
                  onCheckedChange={checked => handleToggleSelectAll(checked === true)}
                  disabled={selectableLogs.length === 0 || isProcessingBulkApproval}
                />
              </TableHead>
            ) : null}
            <TableHead className="w-24">Ações</TableHead>
            <TableHead>Data</TableHead>
            <TableHead>Tarefa</TableHead>
            <TableHead>Responsável</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Tempo do Log</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Status de Aprovação</TableHead>
            <TableHead>Aprovador</TableHead>
            <TableHead>Data da Aprovação</TableHead>
            <TableHead>Hora da Aprovação</TableHead>
            {canManageApprovals ? <TableHead>Ação</TableHead> : null}
            <TableHead>Atividades</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {groupedTimeLogs.length > 0 ? (
              groupedTimeLogs.map(group => (
                <Fragment key={group.key}>
                  {timeLogGroupBy !== 'none' && group.items.length > 0 ? (
                    <TableRow className="bg-muted/40">
                      <TableCell colSpan={timeLogTableColumnCount} className="font-semibold uppercase text-muted-foreground">
                        {group.label}
                      </TableCell>
                    </TableRow>
                  ) : null}
                  {group.items.map(({ log }) => {
                    const task = log.task_id ? taskById.get(log.task_id) ?? null : null;
                    const activityText = getLogActivity(log);
                    const approverDisplayName = getApproverDisplayName(log);
                    const isPendingApproval = log.status_aprovacao === 'pendente';
                    const isCurrentProcessing = processingApprovalId === log.id;
                    const approvalActionsDisabled = processingApprovalId !== null;
                    const isApproveLoading = isCurrentProcessing && approvalSubmittingType === 'approve';
                    const isApproveButtonDisabled = !isPendingApproval || approvalActionsDisabled;
                    const usage = getLogDailyUsage(log);
                    const tempoEstouradoMinutes = usage?.tempo_estourado_minutes ?? 0;
                    const overUserLimit = usage?.over_user_limit ?? false;
                    const isOverLimit = overUserLimit || tempoEstouradoMinutes > 0;
                    const userLimitHours = usage?.horas_liberadas_por_dia ?? 8;
                    const limitStatusLabel = isOverLimit ? 'Tempo Limite Ultrapassado' : 'OK';
                    const highlightClass = isOverLimit ? 'bg-red-50 text-red-600 font-semibold' : undefined;
                    const highlightRowClass = isOverLimit ? 'bg-red-50 hover:bg-red-50/80' : undefined;
                    const statusTooltip = isOverLimit
                      ? `Excedeu o limite de ${userLimitHours}h do usuário.`
                      : `Dentro do limite diário de ${userLimitHours}h.`;
                    const isTimedEntry = log.tipo_inclusao === 'timer';
                    const logTypeBadgeClass = isTimedEntry
                      ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600'
                      : 'border-sky-500/40 bg-sky-500/10 text-sky-700';

                    return (
                      <TableRow key={log.id} className={highlightRowClass}>
                        {canManageApprovals ? (
                          <TableCell>
                            <Checkbox
                              aria-label="Selecionar registro de tempo"
                              checked={selectedLogIds.includes(log.id)}
                              onCheckedChange={checked => handleRowSelectionChange(log, checked === true)}
                              disabled={log.status_aprovacao === 'aprovado' || isProcessingBulkApproval}
                            />
                          </TableCell>
                        ) : null}
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleOpenLogDetails(log)}
                                  aria-label="Visualizar registro de tempo"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Visualizar registro</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleOpenLogEditDialog(log)}
                                  aria-label="Editar atividades do registro"
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Editar atividades</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleOpenDeleteDialog(log)}
                                  disabled={isDeletingLog}
                                  aria-label="Excluir registro de tempo"
                                >
                                  {isDeletingLog && logPendingDeletion?.id === log.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Trash2 className="h-4 w-4" />
                                  )}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Excluir registro</TooltipContent>
                            </Tooltip>
                          </div>
                        </TableCell>
                        <TableCell className={highlightClass}>{formatLogCreatedAt(log.created_at)}</TableCell>
                        <TableCell>{task?.tarefa || 'Tarefa não encontrada'}</TableCell>
                        <TableCell className={highlightClass}>
                          {isOverLimit ? (
                            <span className="text-red-600 font-semibold">{task?.responsavel || '-'}</span>
                          ) : (
                            task?.responsavel || '-'
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={logTypeBadgeClass}>
                            {isTimedEntry ? 'CRONOMETRADO' : 'MANUAL'}
                          </Badge>
                        </TableCell>
                        <TableCell>{getFormattedLogDuration(log)}</TableCell>
                        <TableCell className={highlightClass}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span>{limitStatusLabel}</span>
                            </TooltipTrigger>
                            <TooltipContent>{statusTooltip}</TooltipContent>
                          </Tooltip>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">{getStatusBadge(log)}</div>
                        </TableCell>
                        <TableCell>{approverDisplayName}</TableCell>
                        <TableCell>
                          {log.status_aprovacao !== 'pendente'
                            ? formatApprovalDate(log.aprovacao_data ?? log.data_aprovacao)
                            : '-'}
                        </TableCell>
                        <TableCell>
                          {log.status_aprovacao !== 'pendente'
                            ? formatApprovalTime(log.aprovacao_hora ?? log.data_aprovacao)
                            : '-'}
                        </TableCell>
                        {canManageApprovals ? (
                          <TableCell>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenApprovalDialog(log, 'approve')}
                              disabled={isApproveButtonDisabled}
                              className="gap-1.5 border-green-600 text-green-700 hover:bg-green-50 hover:text-green-800"
                            >
                              {isApproveLoading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <CheckCircle2 className="h-4 w-4" />
                              )}
                              Aprovar
                            </Button>
                          </TableCell>
                        ) : null}
                        <TableCell>
                          {activityText ? (
                            <span className="block max-w-[220px] break-words text-xs">{activityText}</span>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </Fragment>
              ))
              ) : (
                <TableRow>
                  <TableCell colSpan={timeLogTableColumnCount} className="text-center text-muted-foreground">
                    Nenhum log de tempo registrado.
                  </TableCell>
                </TableRow>
              )}
          </TableBody>
        </Table>
      </TooltipProvider>
        </CardContent>
      </Card>

      <Dialog open={isLogDetailsDialogOpen} onOpenChange={handleLogDetailsDialogOpenChange}>
        <DialogContent className="sm:max-w-[640px]">
          <DialogHeader className="space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-1">
                <DialogTitle>Detalhes do registro de tempo</DialogTitle>
                <DialogDescription>
                  Consulte as informações registradas para o apontamento selecionado.
                </DialogDescription>
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="uppercase tracking-wide"
                disabled={!selectedLogForDetails?.task_id}
                onClick={() => {
                  if (!selectedLogForDetails?.task_id) {
                    return;
                  }

                  setIsTaskDetailsVisible(prev => !prev);
                }}
              >
                <span className="flex items-center gap-2">
                  {isTaskDetailsVisible && isDetailTaskLoading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : null}
                  VER TAREFA
                </span>
              </Button>
            </div>
          </DialogHeader>
          <div className="space-y-4 py-2 text-sm">
            <section className="rounded-2xl border bg-card p-4 sm:p-6 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold">Detalhes do registro</h3>
                  <p className="text-sm text-muted-foreground">
                    Consulte as informações registradas para o apontamento.
                  </p>
                </div>
                <div className={detailStatusInfo.className}>
                  {detailStatusInfo.icon}
                  {detailStatusInfo.label}
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <DetailItem label="Tarefa" value={detailTask?.tarefa ?? 'Tarefa não encontrada'} />
                <DetailItem label="Responsável" value={detailTask?.responsavel ?? null} />
                <DetailItem
                  label="Tipo de registro"
                  value={
                    selectedLogForDetails
                      ? getLogTypeLabel(selectedLogForDetails.tipo_inclusao)
                      : null
                  }
                />
                <DetailItem label="Tempo registrado" value={detailDurationDisplay} mono />
                <DetailItem label="Data do registro" value={detailLogCreatedAtDisplay} />
                <DetailItem label="Período" value={detailPeriodDisplay} />
                <DetailItem label="Aprovador" value={detailApproverDisplay} />
                <DetailItem label="Data da aprovação" value={detailApprovalDateDisplay} />
                <DetailItem label="Hora da aprovação" value={detailApprovalTimeDisplay} />
                <DetailItem
                  label="Descrição da tarefa"
                  value={
                    detailTaskDescription
                      ? detailTaskDescription
                      : 'Nenhuma descrição registrada.'
                  }
                  span2
                />
              </div>
            </section>
            {isTaskDetailsVisible ? (
              <div className="space-y-4 rounded-lg border border-border/60 bg-muted/40 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-semibold uppercase text-muted-foreground">Informações da tarefa</span>
                  {isDetailTaskLoading ? (
                    <span className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Carregando...
                    </span>
                  ) : null}
                </div>
                {isDetailTaskLoading ? (
                  <p className="text-sm text-muted-foreground">Carregando dados da tarefa...</p>
                ) : detailTask ? (
                  hasTaskDetailInformation ? (
                    <div className="space-y-4">
                      {taskDetailEntries.length > 0 ? (
                        <div className="grid gap-3 sm:grid-cols-2">
                          {taskDetailEntries.map(entry => (
                            <div
                              key={entry.key}
                              className={`space-y-1 ${entry.fullWidth ? 'sm:col-span-2' : ''}`}
                            >
                              <span className="text-xs font-semibold uppercase text-muted-foreground">
                                {entry.label}
                              </span>
                              <div
                                className={`text-sm text-foreground ${
                                  entry.isLongText ? 'whitespace-pre-wrap leading-relaxed' : 'break-words'
                                }`}
                              >
                                {entry.value}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : null}
                      {taskCustomFieldEntries.length > 0 ? (
                        <div className="space-y-3">
                          <span className="text-xs font-semibold uppercase text-muted-foreground">
                            Campos personalizados
                          </span>
                          <div className="grid gap-3 sm:grid-cols-2">
                            {taskCustomFieldEntries.map(entry => (
                              <div
                                key={entry.key}
                                className={`space-y-1 ${entry.fullWidth ? 'sm:col-span-2' : ''}`}
                              >
                                <span className="text-xs font-semibold uppercase text-muted-foreground">
                                  {entry.label}
                                </span>
                                <div
                                  className={`text-sm text-foreground ${
                                    entry.isLongText ? 'whitespace-pre-wrap leading-relaxed' : 'break-words'
                                  }`}
                                >
                                  {entry.value}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Nenhuma informação adicional encontrada para esta tarefa.
                    </p>
                  )
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Não foi possível localizar a tarefa associada a este registro de tempo.
                  </p>
                )}
              </div>
            ) : null}
            <section className="rounded-2xl border bg-card shadow-sm">
              <header className="flex items-center justify-between px-4 py-3 sm:px-6">
                <h4 className="text-sm font-semibold tracking-wide">Atividade realizada</h4>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleToggleCommissioned}
                    disabled={isApprovalActionDisabled}
                    aria-pressed={isCommissioned}
                    className={`rounded-full px-4 py-1 text-xs font-medium transition-colors ${
                      isCommissioned
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'border border-blue-400 text-blue-600 hover:bg-blue-50'
                    } disabled:cursor-not-allowed disabled:opacity-60`}
                  >
                    Comissionado
                  </button>
                  <button
                    type="button"
                    onClick={handleApprove}
                    disabled={isApprovalActionDisabled}
                    className="rounded-full px-4 py-1 text-xs font-medium text-white transition-colors bg-green-600 hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Aprovado
                  </button>
                  <button
                    type="button"
                    onClick={handleReject}
                    disabled={isApprovalActionDisabled}
                    className="rounded-full px-4 py-1 text-xs font-medium text-white transition-colors bg-red-600 hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Reprovado
                  </button>
                </div>
              </header>
              <div className="border-t px-4 py-4 sm:px-6">
                <pre className="whitespace-pre-wrap text-sm leading-relaxed">{timeLogActivity.length > 0 ? timeLogActivity : '—'}</pre>
              </div>
            </section>
            {pendingApprovalAction === 'reject' ? (
              <div className="space-y-2 rounded-2xl border border-border/60 bg-muted/40 p-4">
                <Label htmlFor="log-detail-rejection-justification" className="text-sm font-medium">
                  Justificativa da reprovação
                </Label>
                <Textarea
                  id="log-detail-rejection-justification"
                  value={detailRejectionJustification}
                  onChange={(event) => setDetailRejectionJustification(event.target.value)}
                  placeholder="Descreva o motivo da reprovação"
                  disabled={isApprovalActionDisabled}
                />
                <p className="text-xs text-muted-foreground">
                  Esta justificativa será registrada junto ao log de tempo.
                </p>
              </div>
            ) : null}
          </div>
          <DialogFooter className="w-full">
            <div className="flex w-full justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseDetailApproval}
              >
                Fechar
              </Button>
              <OkApproveButton
                /* 🔧 Mapeamento automático de estados comuns. */
                selectedTimeLog={detailApprovalTargetLog}
                acaoSelecionada={detailApprovalAction}
                comissionado={isCommissioned}
                justificativa={detailApprovalJustification ?? undefined}
                aprovadorNomeUI={detailApprovalApproverName}
                onClose={handleCloseDetailApproval}
                refetchList={refreshTimeLogs}
                toast={toast}
              />
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isLogEditDialogOpen} onOpenChange={handleLogEditDialogOpenChange}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Editar registro de tempo</DialogTitle>
            <DialogDescription>
              Atualize as atividades registradas para este apontamento de horas.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2 text-sm">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <span className="text-xs font-medium uppercase text-muted-foreground">Tarefa</span>
                <span className="font-medium">
                  {selectedLogForEdit?.task_id ? (taskById.get(selectedLogForEdit.task_id)?.tarefa ?? 'Tarefa não encontrada') : '-'}
                </span>
              </div>
              <div className="space-y-1">
                <span className="text-xs font-medium uppercase text-muted-foreground">Tempo registrado</span>
                <span className="font-mono">
                  {selectedLogForEdit ? getFormattedLogDuration(selectedLogForEdit) : '-'}
                </span>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="log-observations" className="text-sm font-medium">
                Atividades
              </Label>
              <Textarea
                id="log-observations"
                value={logEditObservation}
                onChange={(event) => setLogEditObservation(event.target.value)}
                placeholder="Registre um contexto adicional para este apontamento"
                rows={4}
                disabled={isUpdatingLogObservation}
              />
              <p className="text-xs text-muted-foreground">
                Esta atividade ficará disponível no histórico do registro.
              </p>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleLogEditDialogOpenChange(false)}
              disabled={isUpdatingLogObservation}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={() => void handleSubmitLogEdit()}
              disabled={isUpdatingLogObservation || !selectedLogForEdit}
            >
              {isUpdatingLogObservation ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Salvar alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={handleDeleteDialogOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir registro de tempo</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza de que deseja remover este apontamento? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingLog}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleConfirmDeleteLog()} disabled={isDeletingLog || !logPendingDeletion}>
              {isDeletingLog ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isApprovalDialogOpen} onOpenChange={handleApprovalDialogOpenChange}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>{approvalDialogTitle}</DialogTitle>
            <DialogDescription>
              Confirme a atualização do status deste registro de tempo.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2 text-sm">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <span className="text-xs font-medium uppercase text-muted-foreground">Tarefa</span>
                <span className="font-medium">
                  {approvalDialogTask?.tarefa ?? 'Tarefa não encontrada'}
                </span>
              </div>
              <div className="space-y-1">
                <span className="text-xs font-medium uppercase text-muted-foreground">Responsável</span>
                <span>{approvalDialogTask?.responsavel ?? '-'}</span>
              </div>
              <div className="space-y-1">
                <span className="text-xs font-medium uppercase text-muted-foreground">Data do registro</span>
                <span>
                  {approvalDialogLog ? formatLogCreatedAt(approvalDialogLog.created_at) : '-'}
                </span>
              </div>
              <div className="space-y-1">
                <span className="text-xs font-medium uppercase text-muted-foreground">Tempo registrado</span>
                <span>{approvalDialogFormattedTime}</span>
              </div>
            </div>
            {approvalDialogAction ? (
              <div className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
                {approvalDialogAction === 'approve'
                  ? 'Confirme a aprovação deste apontamento de horas.'
                  : 'Confirme a reprovação deste apontamento de horas.'}
              </div>
            ) : null}
            {approvalDialogAction === 'reject' ? (
              <div className="space-y-2">
                <Label htmlFor="approval-justification" className="text-sm font-medium">
                  Justificativa da reprovação
                </Label>
                <Textarea
                  id="approval-justification"
                  value={approvalDialogJustification}
                  onChange={(event) => setApprovalDialogJustification(event.target.value)}
                  placeholder="Descreva o motivo da reprovação"
                  disabled={processingApprovalId !== null && processingApprovalId !== approvalDialogLog?.id}
                />
                <p className="text-xs text-muted-foreground">
                  Esta justificativa será registrada junto ao log de tempo.
                </p>
              </div>
            ) : null}
          </div>
          <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleApprovalDialogOpenChange(false)}
              disabled={processingApprovalId !== null && approvalDialogLog?.id === processingApprovalId}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={() => void handleConfirmApprovalDialogAction()}
              disabled={
                (processingApprovalId !== null && approvalDialogLog?.id !== processingApprovalId) ||
                approvalDialogAction === null ||
                (approvalDialogAction === 'reject' && approvalDialogJustification.trim().length === 0)
              }
            >
              {processingApprovalId !== null && approvalDialogLog?.id === processingApprovalId ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isBulkApprovalDialogOpen} onOpenChange={handleBulkApprovalDialogOpenChange}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>{bulkApprovalDialogTitle}</DialogTitle>
            <DialogDescription>
              {bulkApprovalDialogDescription}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2 text-sm">
            <div className="rounded-md border border-dashed border-muted-foreground/30 p-3">
              <p className="text-xs font-medium uppercase text-muted-foreground">Registros selecionados</p>
              {selectedLogsCount === 0 ? (
                <p className="mt-2 text-xs text-muted-foreground">Nenhum registro selecionado.</p>
              ) : (
                <ul className="mt-2 space-y-2">
                  {bulkSelectedLogsPreview.map((log) => {
                    const task = log.task_id ? taskById.get(log.task_id) ?? null : null;
                    const taskName = task?.tarefa ?? 'Tarefa não encontrada';
                    const responsavel = task?.responsavel ?? '-';
                    const formattedTime = getFormattedLogDuration(log);

                    return (
                      <li key={log.id} className="flex flex-col text-sm">
                        <span className="font-medium">{taskName}</span>
                        <span className="text-xs text-muted-foreground">
                          {formatLogCreatedAt(log.created_at)} • {responsavel} • {formattedTime}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
              {remainingBulkSelectionCount > 0 ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  +{remainingBulkSelectionCount} outros registros selecionados.
                </p>
              ) : null}
            </div>
            {bulkApprovalAction === 'reject' ? (
              <div className="space-y-2">
                <Label htmlFor="bulk-approval-justification" className="text-sm font-medium">
                  Justificativa da reprovação
                </Label>
                <Textarea
                  id="bulk-approval-justification"
                  value={bulkJustification}
                  onChange={(event) => setBulkJustification(event.target.value)}
                  placeholder="Descreva o motivo da reprovação"
                  disabled={isProcessingBulkApproval}
                />
                <p className="text-xs text-muted-foreground">
                  Esta justificativa será aplicada a todos os registros selecionados.
                </p>
              </div>
            ) : null}
          </div>
          <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleBulkApprovalDialogOpenChange(false)}
              disabled={isProcessingBulkApproval}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={() => void handleConfirmBulkApproval()}
              disabled={
                isProcessingBulkApproval ||
                !bulkApprovalAction ||
                selectedLogsCount === 0 ||
                (bulkApprovalAction === 'reject' && bulkJustification.trim().length === 0)
              }
            >
              {isProcessingBulkApproval ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isAssignDialogOpen} onOpenChange={handleAssignmentDialogOpenChange}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Definir responsável</DialogTitle>
            <DialogDescription>
              Selecione um membro da equipe para associar à tarefa "{taskPendingAssignment?.tarefa ?? ''}" antes de iniciar o cronômetro.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {allocationsLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Carregando membros da equipe...
              </div>
            ) : teamMembers.length > 0 ? (
              <Select
                value={selectedAssignee || undefined}
                onValueChange={setSelectedAssignee}
                disabled={isAssigning}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um responsável" />
                </SelectTrigger>
                <SelectContent>
                  {teamMembers.map((member) => (
                    <SelectItem key={member.id} value={member.name}>
                      {member.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <p className="text-sm text-muted-foreground">
                Nenhum membro ativo foi encontrado para este projeto. Cadastre ou ative um membro para prosseguir.
              </p>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setIsAssignDialogOpen(false)}
              disabled={isAssigning}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmAssignment}
              disabled={
                isAssigning ||
                allocationsLoading ||
                !teamMembers.length ||
                selectedAssignee.length === 0
              }
            >
              {isAssigning ? 'Salvando...' : 'Atribuir e iniciar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
