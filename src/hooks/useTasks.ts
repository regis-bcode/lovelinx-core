import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Task, TaskFormData, CustomField, CustomFieldFormData } from '@/types/task';
import { ensureTaskIdentifier } from '@/lib/taskIdentifier';
import { createTask as createTaskService, normalizeDatabaseTaskRecord } from '@/lib/tasks';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';
import type { PostgrestError } from '@supabase/supabase-js';
import { SAO_PAULO_TIMEZONE, getIsoDateInTimeZone } from '@/utils/timezone';

export type TasksRow = Database['public']['Tables']['tasks']['Row'];
export type TimeLogsRow = Database['public']['Tables']['time_logs']['Row'];
export type UsersRow = Database['public']['Tables']['users']['Row'];
type TimeDailyUsageRow = Database['public']['Functions']['get_time_daily_usage']['Returns'][number];

export type TaskInsertPayload = Omit<TasksRow, 'id' | 'created_at' | 'updated_at'>;

const logAndThrow = (context: string, error: PostgrestError | Error): never => {
  console.error(context, error);
  throw error;
};

const nowUTC = () => new Date().toISOString();

export const getTaskById = async (taskId: string) => {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('id', taskId)
    .single();

  if (error) {
    logAndThrow('Erro ao buscar tarefa por ID', error);
  }

  return { data: data as TasksRow, error: null };
};

export const insertTask = async (payload: TaskInsertPayload) => {
  const { data, error } = await supabase
    .from('tasks')
    .insert([payload])
    .select('id')
    .single();

  if (error) {
    logAndThrow('Erro ao inserir tarefa', error);
  }

  return { data, error: null };
};

export const updateTaskRecord = async (taskId: string, patch: Partial<TasksRow>) => {
  const { data, error } = await supabase
    .from('tasks')
    .update(patch)
    .eq('id', taskId)
    .select()
    .single();

  if (error) {
    logAndThrow('Erro ao atualizar tarefa', error);
  }

  return { data: data as TasksRow, error: null };
};

export const deleteTaskIfOnlyPendingApprovals = async (taskId: string) => {
  const { data: logs, error: logsError } = await supabase
    .from('time_logs')
    .select('id, status_aprovacao, aprovado')
    .eq('task_id', taskId);

  if (logsError) {
    logAndThrow('Erro ao carregar apontamentos da tarefa antes da exclusão', logsError);
  }

  const hasBlockedLogs = (logs ?? []).some(log => {
    const status = (log.status_aprovacao ?? '').toLowerCase();
    const aprovado = (log.aprovado ?? '').toLowerCase();
    return status !== 'pendente' || aprovado === 'sim';
  });

  if (hasBlockedLogs) {
    const error = new Error('Não é possível excluir: existem apontamentos já aprovados ou não-pendentes.');
    console.error(error.message);
    throw error;
  }

  const { error } = await supabase.from('tasks').delete().eq('id', taskId);

  if (error) {
    logAndThrow('Erro ao excluir tarefa', error);
  }

  return { data: true, error: null };
};

export const resolveResponsibleUserId = async (task: TasksRow): Promise<string> => {
  if (task.user_id) {
    return task.user_id;
  }

  const responsavel = typeof task.responsavel === 'string' ? task.responsavel.trim() : '';
  if (!responsavel) {
    const resolutionError = new Error(
      'Defina user_id ou um responsável que corresponda a um único usuário.',
    );
    console.error(resolutionError.message);
    throw resolutionError;
  }

  const { data, error } = await supabase
    .from('users')
    .select('id, nome_completo')
    .ilike('nome_completo', responsavel)
    .limit(2);

  if (error) {
    logAndThrow('Erro ao resolver usuário responsável pela tarefa', error);
  }

  if (!data || data.length !== 1) {
    const resolutionError = new Error('Defina user_id ou um responsável que corresponda a um único usuário.');
    console.error(resolutionError.message);
    throw resolutionError;
  }

  return data[0].id;
};

const normalizeResponsible = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

export const canStartTimer = (task: TasksRow): boolean => {
  if (!task || !task.id) {
    return false;
  }

  const responsavelRaw = typeof task.responsavel === 'string' ? task.responsavel : '';
  const normalizedResponsavel = responsavelRaw ? normalizeResponsible(responsavelRaw) : '';

  if (normalizedResponsavel === 'sem responsavel') {
    return false;
  }

  if (task.user_id) {
    return true;
  }

  return normalizedResponsavel.length > 0;
};

const LEGACY_SCHEMA_ERROR_CODES = new Set(['42703', 'PGRST204']);

export const startTimer = async (taskId: string, projectId: string, userId: string) => {
  const nowIso = nowUTC();

  const { data: existing, error: existingError } = await supabase
    .from('time_logs')
    .select('id, data_inicio')
    .eq('task_id', taskId)
    .eq('project_id', projectId)
    .eq('user_id', userId)
    .is('data_fim', null)
    .maybeSingle();

  if (existingError) {
    logAndThrow('Erro ao verificar apontamentos ativos', existingError);
  }

  if (existing) {
    return { data: existing as Pick<TimeLogsRow, 'id' | 'data_inicio'>, error: null };
  }

  const baseInsertPayload = {
    task_id: taskId,
    project_id: projectId,
    user_id: userId,
    data_inicio: nowIso,
    data_fim: null,
    started_at: nowIso,
    ended_at: null,
    duration_minutes: null,
    tempo_minutos: 0,
    tempo_trabalhado: 0,
    status_aprovacao: 'pendente',
    aprovado: 'não',
    comissionado: 'não',
  } satisfies Partial<TimeLogsRow>;

  const attemptInsert = async (
    payload: Partial<TimeLogsRow>,
    allowRetry: boolean,
  ): Promise<Pick<TimeLogsRow, 'id' | 'data_inicio'>> => {
    const { data, error } = await supabase
      .from('time_logs')
      .insert([payload])
      .select('id, data_inicio')
      .single();

    if (error) {
      if (allowRetry && LEGACY_SCHEMA_ERROR_CODES.has(error.code ?? '')) {
        const legacyPayload = { ...payload };
        delete legacyPayload.duration_minutes;
        delete legacyPayload.started_at;
        delete legacyPayload.ended_at;
        return attemptInsert(legacyPayload, false);
      }

      logAndThrow('Erro ao iniciar apontamento de tempo', error);
    }

    if (!data) {
      const nullDataError = new Error(
        'A resposta do Supabase não retornou dados para o apontamento.',
      );
      console.error(nullDataError.message);
      throw nullDataError;
    }

    return data as Pick<TimeLogsRow, 'id' | 'data_inicio'>;
  };

  const inserted = await attemptInsert(baseInsertPayload, true);

  return { data: inserted, error: null };
};

export const stopTimer = async (activeLogId: string, atividade: string) => {
  const endIso = nowUTC();

  const { data: log, error: logError } = await supabase
    .from('time_logs')
    .select('data_inicio')
    .eq('id', activeLogId)
    .single();

  if (logError) {
    logAndThrow('Erro ao carregar log ativo para finalização', logError);
  }

  const startIso = log?.data_inicio;
  if (!startIso) {
    const missingStartError = new Error('Apontamento sem data de início registrada.');
    console.error(missingStartError.message);
    throw missingStartError;
  }

  const durationMinutes = Math.max(
    1,
    Math.ceil((new Date(endIso).getTime() - new Date(startIso).getTime()) / 60000),
  );

  const baseUpdatePayload = {
    data_fim: endIso,
    ended_at: endIso,
    tempo_minutos: durationMinutes,
    tempo_trabalhado: durationMinutes,
    duration_minutes: durationMinutes,
    atividade,
  } satisfies Partial<TimeLogsRow>;

  const attemptUpdate = async (
    payload: Partial<TimeLogsRow>,
    allowRetry: boolean,
  ): Promise<void> => {
    const { error } = await supabase
      .from('time_logs')
      .update(payload)
      .eq('id', activeLogId);

    if (error) {
      if (allowRetry && LEGACY_SCHEMA_ERROR_CODES.has(error.code ?? '')) {
        const legacyPayload = { ...payload };
        delete legacyPayload.duration_minutes;
        delete legacyPayload.ended_at;
        await attemptUpdate(legacyPayload, false);
        return;
      }

      logAndThrow('Erro ao finalizar apontamento de tempo', error);
    }
  };

  await attemptUpdate(baseUpdatePayload, true);

  return { data: { tempo_minutos: durationMinutes }, error: null };
};

export const sumDailyMinutes = async (userId: string, dayUTC: string) => {
  const reference = new Date(dayUTC);

  if (Number.isNaN(reference.getTime())) {
    return { data: 0, error: null };
  }

  const logDate = getIsoDateInTimeZone(reference, SAO_PAULO_TIMEZONE);

  const { data, error } = await supabase.rpc('get_time_daily_usage', {
    p_date_from: logDate,
    p_date_to: logDate,
  });

  if (error) {
    logAndThrow('Erro ao somar minutos diários de apontamentos', error);
  }

  const rows = (data as TimeDailyUsageRow[] | null) ?? [];
  const usage = rows.find(row => row.user_id === userId);
  const totalMinutes = usage?.total_minutes ?? 0;

  return { data: totalMinutes, error: null };
};

export function useTasks(projectId?: string) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const normalizeTask = (task: Task | (Task & { nome?: string | null })): Task => {
    const normalizedRecord = normalizeDatabaseTaskRecord(task);
    return {
      ...normalizedRecord,
      task_id: ensureTaskIdentifier(normalizedRecord.task_id, normalizedRecord.id),
    };
  };

  const sanitizeTaskUpdatePayload = (data: Partial<TaskFormData>): Record<string, unknown> => {
    return Object.entries(data).reduce<Record<string, unknown>>((acc, [key, value]) => {
      if (value === undefined) {
        return acc;
      }

      if (typeof value === 'string') {
        acc[key] = value.trim();
        return acc;
      }

      acc[key] = value as unknown;
      return acc;
    }, {});
  };

  const shouldRetryWithNomeColumn = (error: unknown): boolean => {
    if (typeof error !== 'object' || error === null) {
      return false;
    }

    const typedError = error as { code?: string; message?: string };
    return typedError.code === 'PGRST204' && typeof typedError.message === 'string'
      ? typedError.message.includes("'tarefa' column")
      : false;
  };

  const buildUpdatePayload = (
    payload: Record<string, unknown>,
    useNomeColumn: boolean,
  ): Record<string, unknown> => {
    const updatePayload: Record<string, unknown> = { ...payload };

    if ('tarefa' in updatePayload) {
      const raw = updatePayload.tarefa;

      if (useNomeColumn) {
        updatePayload.nome = raw;
        delete updatePayload.tarefa;
      } else if (typeof raw === 'string') {
        updatePayload.tarefa = raw.trim();
      }
    }

    return updatePayload;
  };

  useEffect(() => {
    if (!projectId || !user) return;
    loadTasks();
    loadCustomFields();

    const tasksChannel = supabase
      .channel(`tasks-realtime-${projectId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'tasks', filter: `project_id=eq.${projectId}` }, (payload) => {
        const task = payload.new as Task;
        const normalized = normalizeTask(task);
        setTasks((prev) => [normalized, ...prev.filter((t) => t.id !== normalized.id)]);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'tasks', filter: `project_id=eq.${projectId}` }, (payload) => {
        const task = payload.new as Task;
        const normalized = normalizeTask(task);
        setTasks((prev) => prev.map((t) => (t.id === normalized.id ? normalized : t)));
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'tasks', filter: `project_id=eq.${projectId}` }, (payload) => {
        const taskId = payload.old.id;
        setTasks((prev) => prev.filter((t) => t.id !== taskId));
      })
      .subscribe();

    const customFieldsChannel = supabase
      .channel(`custom-fields-realtime-${projectId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'custom_fields', filter: `project_id=eq.${projectId}` }, (payload) => {
        const field = payload.new as CustomField;
        setCustomFields((prev) => [field, ...prev.filter((cf) => cf.id !== field.id)]);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'custom_fields', filter: `project_id=eq.${projectId}` }, (payload) => {
        const field = payload.new as CustomField;
        setCustomFields((prev) => prev.map((cf) => (cf.id === field.id ? field : cf)));
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'custom_fields', filter: `project_id=eq.${projectId}` }, (payload) => {
        const fieldId = payload.old.id;
        setCustomFields((prev) => prev.filter((cf) => cf.id !== fieldId));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(tasksChannel);
      supabase.removeChannel(customFieldsChannel);
    };
  }, [projectId, user]);

  const loadTasks = async () => {
    if (!projectId) return;

    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('tasks')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao carregar tarefas:', error);
        toast({
          title: "Erro",
          description: "Erro ao carregar tarefas.",
          variant: "destructive",
        });
        return;
      }

      const normalizedTasks = (data as (Task | (Task & { nome?: string | null }))[]).map(normalizeTask);
      setTasks(normalizedTasks);
    } catch (error) {
      console.error('Erro ao carregar tarefas:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCustomFields = async () => {
    if (!projectId) return;

    try {
      const { data, error } = await (supabase as any)
        .from('custom_fields')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Erro ao carregar campos personalizados:', error);
        return;
      }

      setCustomFields(data as CustomField[]);
    } catch (error) {
      console.error('Erro ao carregar campos personalizados:', error);
    }
  };

  const createTask = async (taskData: Partial<TaskFormData>): Promise<Task | null> => {
    if (!user || !projectId) {
      toast({
        title: "Erro",
        description: "Usuário não autenticado ou projeto não definido.",
        variant: "destructive",
      });
      return null;
    }

    const tarefa = typeof taskData.tarefa === 'string' ? taskData.tarefa.trim() : '';

    if (!tarefa) {
      toast({
        title: "Erro",
        description: "Informe uma tarefa para criar o registro.",
        variant: "destructive",
      });
      return null;
    }

    try {
      const {
        project_id: _ignoredProjectId,
        tarefa: _ignoredTarefa,
        data_vencimento,
        prioridade,
        status,
        ...extras
      } = taskData;

      const createdTask = await createTaskService({
        projectId,
        userId: user.id,
        tarefa,
        prioridade,
        status,
        vencimento: data_vencimento ?? null,
        extras: extras as Record<string, unknown>,
      });

      setTasks(prev => [createdTask, ...prev.filter(task => task.id !== createdTask.id)]);
      return createdTask;
    } catch (error) {
      console.error('Erro ao criar tarefa:', error);

      const supabaseError =
        typeof error === 'object' && error !== null && 'code' in error
          ? (error as { code?: string; message?: string })
          : null;

      const description = supabaseError?.code === '42501'
        ? 'Você não tem permissão para criar tarefas neste projeto.'
        : supabaseError?.message ?? 'Erro inesperado ao criar tarefa.';

      toast({
        title: "Erro",
        description,
        variant: "destructive",
      });
      return null;
    }
  };

  const updateTask = async (id: string, taskData: Partial<TaskFormData>): Promise<Task | null> => {
    try {
      const sanitizedPayload = sanitizeTaskUpdatePayload(taskData);

      const executeUpdate = async (useNomeColumn: boolean) => {
        const payload = buildUpdatePayload(sanitizedPayload, useNomeColumn);
        return (supabase as any)
          .from('tasks')
          .update(payload)
          .eq('id', id)
          .select()
          .single();
      };

      let { data, error } = await executeUpdate(false);

      if (error && shouldRetryWithNomeColumn(error)) {
        ({ data, error } = await executeUpdate(true));
      }

      if (error) {
        console.error('Erro ao atualizar tarefa:', error);
        toast({
          title: "Erro",
          description: "Erro ao atualizar tarefa.",
          variant: "destructive",
        });
        return null;
      }

      const normalized = normalizeTask(data as Task);
      setTasks(prev => prev.map(task => (task.id === id ? normalized : task)));
      return normalized;
    } catch (error) {
      console.error('Erro ao atualizar tarefa:', error);
      return null;
    }
  };

  const deleteTask = async (id: string): Promise<boolean> => {
    try {
      await deleteTaskIfOnlyPendingApprovals(id);

      setTasks(prev => prev.filter(task => task.id !== id));
      toast({
        title: "Sucesso",
        description: "Tarefa deletada com sucesso!",
      });
      return true;
    } catch (error) {
      console.error('Erro ao deletar tarefa:', error);
      const description =
        error instanceof Error ? error.message : 'Erro ao deletar tarefa. Verifique os apontamentos vinculados.';
      toast({
        title: "Erro",
        description,
        variant: "destructive",
      });
      return false;
    }
  };

  const createCustomField = async (fieldData: Partial<CustomFieldFormData>): Promise<CustomField | null> => {
    if (!user || !projectId) {
      toast({
        title: "Erro",
        description: "Usuário não autenticado ou projeto não definido.",
        variant: "destructive",
      });
      return null;
    }

    try {
      const { data, error } = await (supabase as any)
        .from('custom_fields')
        .insert({
          ...fieldData,
          project_id: projectId,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) {
        console.error('Erro ao criar campo personalizado:', error);
        toast({
          title: "Erro",
          description: "Erro ao criar campo personalizado.",
          variant: "destructive",
        });
        return null;
      }

      const newField = data as CustomField;
      setCustomFields(prev => [...prev, newField]);
      toast({
        title: "Sucesso",
        description: "Campo personalizado criado com sucesso!",
      });
      return newField;
    } catch (error) {
      console.error('Erro ao criar campo personalizado:', error);
      return null;
    }
  };

  const updateCustomField = async (
    id: string,
    fieldData: Partial<CustomFieldFormData>,
  ): Promise<CustomField | null> => {
    if (!id) {
      toast({
        title: "Erro",
        description: "Campo personalizado inválido.",
        variant: "destructive",
      });
      return null;
    }

    try {
      const { data, error } = await (supabase as any)
        .from('custom_fields')
        .update(fieldData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Erro ao atualizar campo personalizado:', error);
        toast({
          title: "Erro",
          description: "Erro ao atualizar campo personalizado.",
          variant: "destructive",
        });
        return null;
      }

      const updatedField = data as CustomField;
      setCustomFields(prev => prev.map(field => (field.id === id ? updatedField : field)));
      toast({
        title: "Sucesso",
        description: "Campo personalizado atualizado com sucesso!",
      });
      return updatedField;
    } catch (error) {
      console.error('Erro ao atualizar campo personalizado:', error);
      return null;
    }
  };

  const deleteCustomField = async (id: string): Promise<boolean> => {
    try {
      const { error } = await (supabase as any)
        .from('custom_fields')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Erro ao deletar campo personalizado:', error);
        toast({
          title: "Erro",
          description: "Erro ao deletar campo personalizado.",
          variant: "destructive",
        });
        return false;
      }

      setCustomFields(prev => prev.filter(field => field.id !== id));
      toast({
        title: "Sucesso",
        description: "Campo personalizado deletado com sucesso!",
      });
      return true;
    } catch (error) {
      console.error('Erro ao deletar campo personalizado:', error);
      return false;
    }
  };

  return {
    tasks,
    customFields,
    loading,
    createTask,
    updateTask,
    deleteTask,
    createCustomField,
    updateCustomField,
    deleteCustomField,
    refreshTasks: loadTasks,
    refreshCustomFields: loadCustomFields,
    setTasks,
  };
}

