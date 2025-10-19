import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Task, TaskFormData, CustomField, CustomFieldFormData } from '@/types/task';
import { ensureTaskIdentifier } from '@/lib/taskIdentifier';
import { createTask as createTaskService } from '@/lib/tasks';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export function useTasks(projectId?: string) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  useEffect(() => {
    if (!projectId || !user) return;
    loadTasks();
    loadCustomFields();

    const tasksChannel = supabase
      .channel(`tasks-realtime-${projectId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'tasks', filter: `project_id=eq.${projectId}` }, (payload) => {
        const task = payload.new as Task;
        const normalized: Task = {
          ...task,
          task_id: ensureTaskIdentifier(task.task_id, task.id),
        };
        setTasks((prev) => [normalized, ...prev.filter((t) => t.id !== normalized.id)]);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'tasks', filter: `project_id=eq.${projectId}` }, (payload) => {
        const task = payload.new as Task;
        const normalized: Task = {
          ...task,
          task_id: ensureTaskIdentifier(task.task_id, task.id),
        };
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

      const normalizedTasks = (data as Task[]).map(task => ({
        ...task,
        task_id: ensureTaskIdentifier(task.task_id, task.id),
      }));
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
      const { data, error } = await (supabase as any)
        .from('tasks')
        .update(taskData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Erro ao atualizar tarefa:', error);
        toast({
          title: "Erro",
          description: "Erro ao atualizar tarefa.",
          variant: "destructive",
        });
        return null;
      }

      const updatedTask = data as Task;
      const normalized: Task = {
        ...updatedTask,
        task_id: ensureTaskIdentifier(updatedTask.task_id, updatedTask.id),
      };
      setTasks(prev => prev.map(task => (task.id === id ? normalized : task)));
      return normalized;
    } catch (error) {
      console.error('Erro ao atualizar tarefa:', error);
      return null;
    }
  };

  const deleteTask = async (id: string): Promise<boolean> => {
    try {
      const { error } = await (supabase as any)
        .from('tasks')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Erro ao deletar tarefa:', error);
        toast({
          title: "Erro",
          description: "Erro ao deletar tarefa.",
          variant: "destructive",
        });
        return false;
      }

      setTasks(prev => prev.filter(task => task.id !== id));
      toast({
        title: "Sucesso",
        description: "Tarefa deletada com sucesso!",
      });
      return true;
    } catch (error) {
      console.error('Erro ao deletar tarefa:', error);
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

