import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Task, TaskFormData, CustomField, CustomFieldFormData } from '@/types/task';
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
        setTasks((prev) => [task, ...prev.filter((t) => t.id !== task.id)]);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'tasks', filter: `project_id=eq.${projectId}` }, (payload) => {
        const task = payload.new as Task;
        setTasks((prev) => prev.map((t) => (t.id === task.id ? task : t)));
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

      setTasks(data as Task[]);
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

  const getNextTaskId = async (): Promise<string> => {
    let nextId = 1;

    if (!projectId) {
      return `TASK-${nextId.toString().padStart(3, '0')}`;
    }

    try {
      const { data: taskIdRows, error: fetchError } = await (supabase as any)
        .from('tasks')
        .select('task_id')
        .eq('project_id', projectId)
        .order('task_id', { ascending: false })
        .limit(1);

      if (fetchError) {
        console.error('Erro ao buscar último identificador de tarefa:', fetchError);
      }

      const existingTaskId = taskIdRows?.[0]?.task_id as string | undefined;
      if (existingTaskId) {
        const match = existingTaskId.match(/TASK-(\d+)/);
        if (match) {
          nextId = parseInt(match[1], 10) + 1;
        }
      } else if (tasks.length > 0) {
        const maxFromState = tasks.reduce((max, task) => {
          const match = task.task_id?.match(/TASK-(\d+)/);
          if (!match) return max;
          const value = parseInt(match[1], 10);
          return Number.isFinite(value) && value > max ? value : max;
        }, 0);
        if (maxFromState > 0) {
          nextId = maxFromState + 1;
        }
      }
    } catch (error) {
      console.error('Erro inesperado ao calcular próximo identificador de tarefa:', error);
    }

    return `TASK-${nextId.toString().padStart(3, '0')}`;
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

    try {
      const taskId = await getNextTaskId();

      const { data, error } = await (supabase as any)
        .from('tasks')
        .insert({
          ...taskData,
          task_id: taskId,
          project_id: projectId,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) {
        console.error('Erro ao criar tarefa:', error);
        toast({
          title: "Erro",
          description: "Erro ao criar tarefa.",
          variant: "destructive",
        });
        return null;
      }

      const newTask = data as Task;
      setTasks(prev => [newTask, ...prev]);
      toast({
        title: "Sucesso",
        description: "Tarefa criada com sucesso!",
      });
      return newTask;
    } catch (error) {
      console.error('Erro ao criar tarefa:', error);
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
      setTasks(prev => prev.map(task => task.id === id ? updatedTask : task));
      toast({
        title: "Sucesso",
        description: "Tarefa atualizada com sucesso!",
      });
      return updatedTask;
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
  };
}