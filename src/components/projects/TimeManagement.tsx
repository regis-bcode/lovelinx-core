import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Play, Square, Clock, Plus, Check, X } from 'lucide-react';
import { useTasks } from '@/hooks/useTasks';
import { useTimeLogs } from '@/hooks/useTimeLogs';
import { useUserRoles } from '@/hooks/useUserRoles';
import { Task } from '@/types/task';
import { TimeLog, ApprovalStatus } from '@/types/time-log';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface TimeManagementProps {
  projectId: string;
}

export function TimeManagement({ projectId }: TimeManagementProps) {
  const { tasks, loading: tasksLoading } = useTasks(projectId);
  const { timeLogs, createTimeLog, approveTimeLog, getTaskTotalTime, getProjectTotalTime, loading: logsLoading } = useTimeLogs(projectId);
  const { isGestor } = useUserRoles();
  
  const [activeTimer, setActiveTimer] = useState<{ taskId: string; startTime: Date } | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [manualTime, setManualTime] = useState<{ [taskId: string]: { hours: number; minutes: number } }>({});

  const timerActionButtonBase =
    'h-9 w-9 rounded-full text-white shadow-sm transition-transform duration-200 hover:scale-105 hover:text-white focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-60 disabled:hover:scale-100';

  // Timer effect
  useEffect(() => {
    if (!activeTimer) return;

    const interval = setInterval(() => {
      const now = new Date();
      const elapsed = Math.floor((now.getTime() - activeTimer.startTime.getTime()) / 1000);
      setElapsedSeconds(elapsed);
    }, 1000);

    return () => clearInterval(interval);
  }, [activeTimer]);

  const startTimer = (taskId: string) => {
    setActiveTimer({ taskId, startTime: new Date() });
    setElapsedSeconds(0);
  };

  const stopTimer = async () => {
    if (!activeTimer) return;

    const minutes = Math.floor(elapsedSeconds / 60);
    if (minutes > 0) {
      await createTimeLog({
        task_id: activeTimer.taskId,
        tipo_inclusao: 'automatico',
        tempo_minutos: minutes,
        data_inicio: activeTimer.startTime.toISOString(),
        data_fim: new Date().toISOString(),
      });
    }

    setActiveTimer(null);
    setElapsedSeconds(0);
  };

  const addManualTime = async (taskId: string) => {
    const time = manualTime[taskId];
    if (!time || (time.hours === 0 && time.minutes === 0)) return;

    const totalMinutes = time.hours * 60 + time.minutes;
    await createTimeLog({
      task_id: taskId,
      tipo_inclusao: 'manual',
      tempo_minutos: totalMinutes,
    });

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

  const getStatusBadge = (status: ApprovalStatus) => {
    const variants = {
      pendente: 'secondary',
      aprovado: 'default',
      reprovado: 'destructive',
    } as const;

    return <Badge variant={variants[status]}>{status.toUpperCase()}</Badge>;
  };

  const totalProjectTime = getProjectTotalTime();

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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tarefa</TableHead>
                <TableHead>Responsável</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Tempo Total</TableHead>
                <TableHead>Timer</TableHead>
                <TableHead>Adicionar Manual</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks.map((task) => {
                const taskTime = getTaskTotalTime(task.id);
                const isTimerActive = activeTimer?.taskId === task.id;
                const manualTimeValue = manualTime[task.id] || { hours: 0, minutes: 0 };

                return (
                  <TableRow key={task.id}>
                    <TableCell className="font-medium">{task.nome}</TableCell>
                    <TableCell>{task.responsavel || '-'}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{task.status}</Badge>
                    </TableCell>
                    <TableCell>{formatMinutes(taskTime)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {isTimerActive ? (
                          <>
                            <span className="font-mono text-sm">{formatTime(elapsedSeconds)}</span>
                            <Button
                              size="icon"
                              variant="ghost"
                              className={`${timerActionButtonBase} bg-rose-500 hover:bg-rose-600 focus-visible:ring-rose-500 disabled:bg-rose-300 disabled:text-rose-700`}
                              onClick={stopTimer}
                            >
                              <Square className="h-4 w-4" />
                            </Button>
                          </>
                        ) : (
                          <Button
                            size="icon"
                            variant="ghost"
                            className={`${timerActionButtonBase} bg-emerald-500 hover:bg-emerald-600 focus-visible:ring-emerald-500 disabled:bg-emerald-300 disabled:text-emerald-700`}
                            onClick={() => startTimer(task.id)}
                            disabled={activeTimer !== null}
                          >
                            <Play className="h-4 w-4" />
                          </Button>
                        )}
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
                {isGestor() && <TableHead>Ações</TableHead>}
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
                          {log.tipo_inclusao}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatMinutes(log.tempo_minutos)}</TableCell>
                      <TableCell>{getStatusBadge(log.status_aprovacao)}</TableCell>
                      {isGestor() && (
                        <TableCell>
                          {log.status_aprovacao === 'pendente' && (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => approveTimeLog(log.id, 'aprovado')}
                              >
                                <Check className="h-4 w-4 text-green-600" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => approveTimeLog(log.id, 'reprovado')}
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
                  <TableCell colSpan={isGestor() ? 6 : 5} className="text-center text-muted-foreground">
                    Nenhum log de tempo registrado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
