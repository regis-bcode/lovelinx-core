import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { CheckCircle2, Clock, Loader2, Plus, ThumbsDown, ThumbsUp, XCircle } from 'lucide-react';
import { useTasks } from '@/hooks/useTasks';
import { useTimeLogs, formatHMS } from '@/hooks/useTimeLogs';
import { useUserRoles } from '@/hooks/useUserRoles';
import { notifyProjectActiveTimersChange } from '@/hooks/useProjectActiveTimersIndicator';
import { Task } from '@/types/task';
import { TimeLog, ApprovalStatus } from '@/types/time-log';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useProjectAllocations } from '@/hooks/useProjectAllocations';
import { useToast } from '@/hooks/use-toast';
import {
  areActiveTimerRecordsEqual,
  persistActiveTimerRecord,
  readActiveTimerRecord,
  sanitizeActiveTimerRecord,
  type ActiveTimerRecord,
} from '@/lib/active-timers';

interface TimeManagementProps {
  projectId: string;
}

export function TimeManagement({ projectId }: TimeManagementProps) {
  const { tasks, loading: tasksLoading, updateTask } = useTasks(projectId);
  const {
    timeLogs,
    createTimeLog,
    approveTimeLog,
    getTaskTotalTime,
    getProjectTotalTime,
    startTimerLog,
    stopTimerLog,
    loading: logsLoading,
  } = useTimeLogs(projectId);
  const { isAdmin, isGestor } = useUserRoles();
  const { allocations: projectAllocations, loading: allocationsLoading } = useProjectAllocations(projectId);
  const { toast } = useToast();

  const [activeTimers, setActiveTimers] = useState<Record<string, number>>({});
  const [elapsedSeconds, setElapsedSeconds] = useState<Record<string, number>>({});
  const [manualTime, setManualTime] = useState<{ [taskId: string]: { hours: number; minutes: number } }>({});
  const [manualOverrides, setManualOverrides] = useState<Record<string, number>>({});
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [taskPendingAssignment, setTaskPendingAssignment] = useState<Task | null>(null);
  const [selectedAssignee, setSelectedAssignee] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);
  const [processingApprovalId, setProcessingApprovalId] = useState<string | null>(null);
  const [approvalSubmittingType, setApprovalSubmittingType] = useState<'approve' | 'reject' | null>(null);
  const [isRejectionDialogOpen, setIsRejectionDialogOpen] = useState(false);
  const [rejectionDialogLog, setRejectionDialogLog] = useState<TimeLog | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isRejectionSubmitting, setIsRejectionSubmitting] = useState(false);
  const rejectionDialogTask = useMemo(() => {
    if (!rejectionDialogLog?.task_id) {
      return null;
    }

    const task = tasks.find(t => t.id === rejectionDialogLog.task_id);
    return task ?? null;
  }, [rejectionDialogLog, tasks]);
  const rejectionDialogFormattedTime = useMemo(() => {
    if (!rejectionDialogLog) {
      return '-';
    }

    if (
      typeof rejectionDialogLog.tempo_formatado === 'string' &&
      rejectionDialogLog.tempo_formatado.trim().length > 0
    ) {
      return rejectionDialogLog.tempo_formatado;
    }

    return formatMinutes(rejectionDialogLog.tempo_trabalhado);
  }, [rejectionDialogLog]);
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

        persistActiveTimerRecord(activeTimersStorageKey, sanitizedNext);
        notifyProjectActiveTimersChange(projectId, Object.keys(sanitizedNext).length > 0);
        return sanitizedNext;
      });
    },
    [activeTimersStorageKey, projectId],
  );

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const restoreActiveTimers = () => {
      try {
        const restored = readActiveTimerRecord(activeTimersStorageKey);
        applyActiveTimersUpdate(restored);
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
  }, [activeTimersStorageKey, applyActiveTimersUpdate]);

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

  const startTimer = async (taskId: string) => {
    if (activeTimers[taskId]) {
      return;
    }

    const tentativeStart = Date.now();
    const startedLog = await startTimerLog(taskId, {
      tipoInclusao: 'timer',
      startedAt: new Date(tentativeStart),
      observacoes: 'Registro automático pela Gestão de Tempo',
    });

    if (!startedLog) {
      return;
    }

    const normalizedStart =
      typeof startedLog.data_inicio === 'string' && startedLog.data_inicio
        ? new Date(startedLog.data_inicio).getTime()
        : tentativeStart;

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
  };

  const stopTimer = async (taskId: string) => {
    if (!activeTimers[taskId]) {
      return;
    }

    const result = await stopTimerLog(taskId);

    if (!result) {
      return;
    }

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
  };

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

  const manualOverridesFromLogs = useMemo(() => {
    const overrides: Record<string, number> = {};
    timeLogs.forEach((log) => {
      if (log.tipo_inclusao === 'manual' && overrides[log.task_id] === undefined) {
        overrides[log.task_id] = log.tempo_trabalhado;
      }
    });
    return overrides;
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

  const getLogObservation = useCallback((log: TimeLog) => {
    const rejection = typeof log.justificativa_reprovacao === 'string'
      ? log.justificativa_reprovacao.trim()
      : '';

    if (rejection.length > 0) {
      return rejection;
    }

    const observation = typeof log.observacoes === 'string' ? log.observacoes.trim() : '';
    return observation;
  }, []);

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
  const canManageApprovals = isAdmin() || isGestor();

  const showActionsColumn = useMemo(() => (
    canManageApprovals && timeLogs.some(log => log.status_aprovacao === 'pendente')
  ), [canManageApprovals, timeLogs]);

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

  const getStatusBadge = (status: ApprovalStatus) => {
    switch (status) {
      case 'pendente':
        return (
          <Badge variant="secondary" className="gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            Aguarda aprovação
          </Badge>
        );
      case 'aprovado':
        return (
          <Badge className="border border-emerald-200 bg-emerald-100 text-emerald-700 hover:bg-emerald-100 gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Aprovado
          </Badge>
        );
      case 'reprovado':
        return (
          <Badge className="border border-red-200 bg-red-100 text-red-700 hover:bg-red-100 gap-1.5">
            <XCircle className="h-3.5 w-3.5" />
            Reprovado
          </Badge>
        );
      default:
        return <Badge variant="secondary">-</Badge>;
    }
  };

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

  const formatLogCreatedAt = (value?: string | null) => {
    const parsed = parseIsoDate(value);
    if (!parsed) {
      return '-';
    }

    return format(parsed, 'dd/MM/yyyy HH:mm', { locale: ptBR });
  };

  const totalProjectTime = getProjectTotalTime();

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

  const handleApproveLog = async (log: TimeLog) => {
    if (!canManageApprovals || log.status_aprovacao !== 'pendente') {
      return;
    }

    setProcessingApprovalId(log.id);
    setApprovalSubmittingType('approve');
    try {
      await approveTimeLog(log.id, 'aprovado');
    } finally {
      setProcessingApprovalId(null);
      setApprovalSubmittingType(null);
    }
  };

  const handleOpenRejectionDialog = (log: TimeLog) => {
    if (!canManageApprovals || log.status_aprovacao !== 'pendente') {
      return;
    }

    setRejectionDialogLog(log);
    setRejectionReason('');
    setIsRejectionDialogOpen(true);
  };

  const handleRejectionDialogOpenChange = (open: boolean) => {
    if (!open) {
      if (isRejectionSubmitting) {
        return;
      }

      setIsRejectionDialogOpen(false);
      setRejectionDialogLog(null);
      setRejectionReason('');
      return;
    }

    setIsRejectionDialogOpen(true);
  };

  const handleConfirmRejection = async () => {
    if (!rejectionDialogLog) {
      return;
    }

    if (!rejectionReason.trim()) {
      toast({
        title: 'Justificativa obrigatória',
        description: 'Informe a justificativa para reprovar o tempo registrado.',
        variant: 'destructive',
      });
      return;
    }

    setProcessingApprovalId(rejectionDialogLog.id);
    setApprovalSubmittingType('reject');
    setIsRejectionSubmitting(true);
    try {
      const success = await approveTimeLog(rejectionDialogLog.id, 'reprovado', {
        justificativa: rejectionReason,
      });

      if (success) {
        setIsRejectionDialogOpen(false);
        setRejectionDialogLog(null);
        setRejectionReason('');
      }
    } finally {
      setIsRejectionSubmitting(false);
      setProcessingApprovalId(null);
      setApprovalSubmittingType(null);
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
          <div className="text-2xl font-bold">
            Total Aprovado: {formatMinutes(totalProjectTime)}
          </div>
        </CardContent>
      </Card>

      {/* Controle de Tempo por Tarefa */}
      <Card>
        <CardHeader>
          <CardTitle>Tarefas e Controle de Tempo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <span className="text-sm text-muted-foreground">
              Total de tarefas contabilizadas: <span className="font-semibold text-foreground">{tasksWithLoggedTime}</span>
            </span>
            {activeTimerEntries.length > 0 && (
              <div className="flex flex-wrap gap-3">
                {activeTimerEntries.map(([taskId]) => {
                  const task = tasks.find(t => t.id === taskId);
                  const currentSeconds = elapsedSeconds[taskId] || 0;
                  return (
                    <div key={taskId} className="rounded-md border px-3 py-2 shadow-sm">
                      <div className="text-xs uppercase text-muted-foreground">Timer ativo</div>
                      <div className="font-medium">{task?.nome || 'Tarefa'}</div>
                      <div className="font-mono text-sm">{formatTime(currentSeconds)}</div>
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
                <TableHead>Responsável</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Tempo Total</TableHead>
                <TableHead>Adicionar Manual</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks.map((task) => {
                const taskTime = getTaskTotalTime(task.id);
                const isTimerActive = Boolean(activeTimers[task.id]);
                const manualTimeValue = manualTime[task.id] || { hours: 0, minutes: 0 };
                const manualOverrideMinutes = manualOverrides[task.id] ?? manualOverridesFromLogs[task.id];
                const runningSeconds = elapsedSeconds[task.id] || 0;
                const requiresResponsavel = !(typeof task.responsavel === 'string' && task.responsavel.trim().length > 0);
                const startButtonTitle = manualOverrideMinutes !== undefined
                  ? 'Tempo manual aplicado. Remova ou ajuste o registro manual para iniciar o cronômetro.'
                  : requiresResponsavel
                    ? 'Associe um responsável antes de iniciar o cronômetro.'
                    : undefined;
                const displayedTime = manualOverrideMinutes !== undefined
                  ? `Manual: ${formatMinutes(manualOverrideMinutes)}`
                  : isTimerActive
                    ? formatTime(taskTime * 60 + runningSeconds)
                    : formatMinutes(taskTime);

                return (
                  <TableRow key={task.id}>
                    <TableCell className="font-medium">{task.nome}</TableCell>
                    <TableCell>{task.responsavel || '-'}</TableCell>
                    <TableCell>
                      {isTimerActive ? (
                        <Badge className="border-emerald-500/40 bg-emerald-500/15 text-emerald-600">
                          CRONOMETRANDO
                        </Badge>
                      ) : (
                        <Badge variant="outline">{task.status || 'Sem status'}</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-between gap-4">
                        <span className="font-mono text-sm">{displayedTime}</span>
                        <div className="flex gap-2">
                          {isTimerActive ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => stopTimer(task.id)}
                            >
                              Parar
                            </Button>
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Tarefa</TableHead>
                <TableHead>Responsável</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Tempo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Aprovador</TableHead>
                <TableHead>Data da Aprovação</TableHead>
                <TableHead>Hora da Aprovação</TableHead>
                <TableHead>Observações</TableHead>
                {showActionsColumn && <TableHead>AÇÃO</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {timeLogs.length > 0 ? (
                timeLogs.map((log) => {
                  const task = tasks.find(t => t.id === log.task_id);
                  const observationText = getLogObservation(log);
                  const approverDisplayName = getApproverDisplayName(log);
                  const isPendingApproval = log.status_aprovacao === 'pendente';
                  const isCurrentProcessing = processingApprovalId === log.id;
                  const isDialogOpenForLog = isRejectionDialogOpen && rejectionDialogLog?.id === log.id;
                  const actionsDisabled = !isPendingApproval || processingApprovalId !== null || isDialogOpenForLog;
                  const approveButtonTitle = !isPendingApproval
                    ? 'Somente registros pendentes podem ser aprovados.'
                    : processingApprovalId !== null
                      ? 'Aguarde o processamento atual finalizar.'
                      : isDialogOpenForLog
                        ? 'Finalize a reprovação em andamento.'
                        : 'Aprovar registro de tempo';
                  const rejectButtonTitle = !isPendingApproval
                    ? 'Somente registros pendentes podem ser reprovados.'
                    : processingApprovalId !== null
                      ? 'Aguarde o processamento atual finalizar.'
                      : isDialogOpenForLog
                        ? 'Conclua a justificativa antes de continuar.'
                        : 'Reprovar registro de tempo';

                  return (
                    <TableRow key={log.id}>
                      <TableCell>{formatLogCreatedAt(log.created_at)}</TableCell>
                      <TableCell>{task?.nome || 'Tarefa não encontrada'}</TableCell>
                      <TableCell>{task?.responsavel || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={log.tipo_inclusao === 'automatico' ? 'default' : 'secondary'}>
                          {log.tipo_inclusao === 'manual' ? 'MANUAL' : 'CRONOMETRADO'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {typeof log.tempo_formatado === 'string' && log.tempo_formatado.trim().length > 0
                          ? log.tempo_formatado
                          : formatMinutes(log.tempo_trabalhado)}
                      </TableCell>
                      <TableCell>{getStatusBadge(log.status_aprovacao)}</TableCell>
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
                      <TableCell>
                        {observationText ? (
                          <span className="block max-w-[220px] break-words text-xs">{observationText}</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      {showActionsColumn && (
                        <TableCell>
                          {isPendingApproval ? (
                            <div className="flex items-center gap-2">
                              <Button
                                size="icon"
                                variant="outline"
                                className="h-8 w-8 border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                                onClick={() => void handleApproveLog(log)}
                                disabled={actionsDisabled}
                                title={approveButtonTitle}
                              >
                                {isCurrentProcessing && approvalSubmittingType === 'approve' ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <ThumbsUp className="h-4 w-4" />
                                )}
                                <span className="sr-only">Aprovar registro de tempo</span>
                              </Button>
                              <Button
                                size="icon"
                                variant="outline"
                                className="h-8 w-8 border-red-200 text-red-600 hover:bg-red-50"
                                onClick={() => handleOpenRejectionDialog(log)}
                                disabled={actionsDisabled}
                                title={rejectButtonTitle}
                              >
                                {isCurrentProcessing && approvalSubmittingType === 'reject' ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <ThumbsDown className="h-4 w-4" />
                                )}
                                <span className="sr-only">Reprovar registro de tempo</span>
                              </Button>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={showActionsColumn ? 11 : 10} className="text-center text-muted-foreground">
                    Nenhum log de tempo registrado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isRejectionDialogOpen} onOpenChange={handleRejectionDialogOpenChange}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Reprovar registro de tempo</DialogTitle>
            <DialogDescription>
              Informe a justificativa para reprovar o tempo selecionado.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2 text-sm">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <span className="text-xs font-medium uppercase text-muted-foreground">Tarefa</span>
                <span className="font-medium">
                  {rejectionDialogTask?.nome ?? 'Tarefa não encontrada'}
                </span>
              </div>
              <div className="space-y-1">
                <span className="text-xs font-medium uppercase text-muted-foreground">Responsável</span>
                <span>{rejectionDialogTask?.responsavel ?? '-'}</span>
              </div>
              <div className="space-y-1">
                <span className="text-xs font-medium uppercase text-muted-foreground">Tipo de registro</span>
                <span>
                  {rejectionDialogLog
                    ? rejectionDialogLog.tipo_inclusao === 'manual'
                      ? 'Manual'
                      : 'Cronometrado'
                    : '-'}
                </span>
              </div>
              <div className="space-y-1">
                <span className="text-xs font-medium uppercase text-muted-foreground">Tempo registrado</span>
                <span>{rejectionDialogFormattedTime}</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="rejection-reason" className="text-sm font-medium">
                Justificativa da reprovação
              </Label>
              <Textarea
                id="rejection-reason"
                value={rejectionReason}
                onChange={(event) => setRejectionReason(event.target.value)}
                placeholder="Descreva o motivo da reprovação"
                disabled={isRejectionSubmitting}
              />
              <p className="text-xs text-muted-foreground">
                Esta justificativa será registrada junto ao log de tempo.
              </p>
            </div>
          </div>
          <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleRejectionDialogOpenChange(false)}
              disabled={isRejectionSubmitting}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void handleConfirmRejection()}
              disabled={isRejectionSubmitting}
            >
              {isRejectionSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Confirmar reprovação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isAssignDialogOpen} onOpenChange={handleAssignmentDialogOpenChange}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Definir responsável</DialogTitle>
            <DialogDescription>
              Selecione um membro da equipe para associar à tarefa "{taskPendingAssignment?.nome}" antes de iniciar o cronômetro.
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
