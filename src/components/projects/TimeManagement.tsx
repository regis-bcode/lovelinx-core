import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Clock, Plus, Check, X, Loader2 } from 'lucide-react';
import { useTasks } from '@/hooks/useTasks';
import { useTimeLogs } from '@/hooks/useTimeLogs';
import { useUserRoles } from '@/hooks/useUserRoles';
import { notifyProjectActiveTimersChange } from '@/hooks/useProjectActiveTimersIndicator';
import { Task } from '@/types/task';
import { TimeLog, ApprovalStatus } from '@/types/time-log';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useProjectAllocations } from '@/hooks/useProjectAllocations';
import { useToast } from '@/hooks/use-toast';

interface TimeManagementProps {
  projectId: string;
}

export function TimeManagement({ projectId }: TimeManagementProps) {
  const { tasks, loading: tasksLoading, updateTask } = useTasks(projectId);
  const { timeLogs, createTimeLog, approveTimeLog, getTaskTotalTime, getProjectTotalTime, loading: logsLoading } = useTimeLogs(projectId);
  const { isGestor, isAdmin } = useUserRoles();
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
  const activeTimersStorageKey = useMemo(() => `task-active-timers-${projectId}`, [projectId]);

  useEffect(() => {
    notifyProjectActiveTimersChange(projectId, Object.keys(activeTimers).length > 0);
  }, [activeTimers, projectId]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const sanitizeNumberRecord = (value: unknown): Record<string, number> => {
      if (!value || typeof value !== 'object') {
        return {};
      }

      return Object.entries(value as Record<string, unknown>)
        .filter(([, entryValue]) => typeof entryValue === 'number' && Number.isFinite(entryValue) && entryValue > 0)
        .reduce<Record<string, number>>((acc, [taskId, entryValue]) => {
          acc[taskId] = entryValue as number;
          return acc;
        }, {});
    };

    const applyRestoredTimers = (restored: Record<string, number>) => {
      setActiveTimers(prev => {
        const prevEntries = Object.entries(prev);
        const restoredEntries = Object.entries(restored);
        if (prevEntries.length === restoredEntries.length && restoredEntries.every(([key, value]) => prev[key] === value)) {
          return prev;
        }
        return restored;
      });

      setElapsedSeconds(() => {
        const now = Date.now();
        return Object.entries(restored).reduce<Record<string, number>>((acc, [taskId, start]) => {
          const elapsed = Math.floor((now - start) / 1000);
          acc[taskId] = elapsed >= 0 ? elapsed : 0;
          return acc;
        }, {});
      });
    };

    const restoreActiveTimers = () => {
      try {
        const stored = window.localStorage.getItem(activeTimersStorageKey);
        if (!stored) {
          applyRestoredTimers({});
          return;
        }

        const parsed = JSON.parse(stored);
        if (!parsed || typeof parsed !== 'object') {
          window.localStorage.removeItem(activeTimersStorageKey);
          applyRestoredTimers({});
          return;
        }

        const normalized = (parsed && typeof parsed === 'object' && 'active' in parsed)
          ? (parsed as { active?: unknown }).active
          : parsed;

        const restored = sanitizeNumberRecord(normalized);
        applyRestoredTimers(restored);

        if (Object.keys(restored).length === 0) {
          window.localStorage.removeItem(activeTimersStorageKey);
        }
      } catch (error) {
        console.error('Erro ao restaurar temporizadores compartilhados:', error);
        window.localStorage.removeItem(activeTimersStorageKey);
        applyRestoredTimers({});
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
  }, [activeTimersStorageKey]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const entries = Object.entries(activeTimers).filter(([, value]) => typeof value === 'number' && Number.isFinite(value) && value > 0);
    if (entries.length === 0) {
      window.localStorage.removeItem(activeTimersStorageKey);
      return;
    }

    const sanitized = entries.reduce<Record<string, number>>((acc, [taskId, value]) => {
      acc[taskId] = value;
      return acc;
    }, {});

    try {
      window.localStorage.setItem(activeTimersStorageKey, JSON.stringify({ active: sanitized }));
    } catch (error) {
      console.error('Erro ao persistir temporizadores compartilhados:', error);
    }
  }, [activeTimers, activeTimersStorageKey]);

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

  const startTimer = (taskId: string) => {
    setActiveTimers(prev => {
      if (prev[taskId]) {
        return prev;
      }
      return { ...prev, [taskId]: Date.now() };
    });
    setElapsedSeconds(prev => ({ ...prev, [taskId]: 0 }));
    setManualOverrides(prev => {
      if (!(taskId in prev)) return prev;
      const updated = { ...prev };
      delete updated[taskId];
      return updated;
    });
  };

  const stopTimer = async (taskId: string) => {
    const startTimestamp = activeTimers[taskId];
    if (!startTimestamp) return;

    const totalMilliseconds = Math.max(0, Date.now() - startTimestamp);
    const minutes = Math.max(1, Math.round(totalMilliseconds / 60000));
    if (minutes > 0) {
      await createTimeLog({
        task_id: taskId,
        tipo_inclusao: 'automatico',
        tempo_minutos: minutes,
        data_inicio: new Date(startTimestamp).toISOString(),
        data_fim: new Date().toISOString(),
      });
    }

    setActiveTimers(prev => {
      const updated = { ...prev };
      delete updated[taskId];
      return updated;
    });
    setElapsedSeconds(prev => {
      const updated = { ...prev };
      delete updated[taskId];
      return updated;
    });
  };

  const addManualTime = async (taskId: string) => {
    const time = manualTime[taskId];
    if (!time || (time.hours === 0 && time.minutes === 0)) return;

    const totalMinutes = time.hours * 60 + time.minutes;
    const result = await createTimeLog({
      task_id: taskId,
      tipo_inclusao: 'manual',
      tempo_minutos: totalMinutes,
    });

    if (result) {
      setManualOverrides(prev => ({ ...prev, [taskId]: totalMinutes }));
      setActiveTimers(prev => {
        if (!prev[taskId]) return prev;
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
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatMinutes = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const manualOverridesFromLogs = useMemo(() => {
    const overrides: Record<string, number> = {};
    timeLogs.forEach((log) => {
      if (log.tipo_inclusao === 'manual' && overrides[log.task_id] === undefined) {
        overrides[log.task_id] = log.tempo_minutos;
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
    const variants = {
      pendente: 'secondary',
      aprovado: 'default',
      reprovado: 'destructive',
    } as const;

    return <Badge variant={variants[status]}>{status.toUpperCase()}</Badge>;
  };

  const totalProjectTime = getProjectTotalTime();
  const isGestorUser = isGestor();
  const isAdminUser = isAdmin();

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
                      <Badge variant="outline">{task.status}</Badge>
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
                <TableHead>Tipo</TableHead>
                <TableHead>Tempo</TableHead>
                <TableHead>Status</TableHead>
                {isGestorUser && <TableHead>Ações</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {timeLogs.length > 0 ? (
                timeLogs.map((log) => {
                  const task = tasks.find(t => t.id === log.task_id);
                  return (
                    <TableRow key={log.id}>
                      <TableCell>
                        {format(new Date(log.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                      </TableCell>
                      <TableCell>{task?.nome || 'Tarefa não encontrada'}</TableCell>
                      <TableCell>
                        <Badge variant={log.tipo_inclusao === 'automatico' ? 'default' : 'secondary'}>
                          {log.tipo_inclusao === 'manual' ? 'MANUAL' : 'CRONOMETRADO'}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatMinutes(log.tempo_minutos)}</TableCell>
                      <TableCell>{getStatusBadge(log.status_aprovacao)}</TableCell>
                      {isGestorUser && (
                        <TableCell>
                          {log.status_aprovacao === 'pendente' && (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => approveTimeLog(log.id, 'aprovado')}
                                disabled={!isAdminUser}
                              >
                                <Check className="h-4 w-4 text-green-600" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => approveTimeLog(log.id, 'reprovado')}
                                disabled={!isAdminUser}
                              >
                                <X className="h-4 w-4 text-red-600" />
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={isGestorUser ? 6 : 5} className="text-center text-muted-foreground">
                    Nenhum log de tempo registrado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

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
