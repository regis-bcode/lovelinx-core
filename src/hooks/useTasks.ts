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
    if (projectId && user) {
      loadTasks();
      loadCustomFields();
    }
  }, [projectId, user]);

  const loadTasks = async () => {
    if (!projectId || !user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('project_id', projectId)
        .eq('user_id', user.id)
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
    if (!projectId || !user) return;
    
    try {
      const { data, error } = await supabase
        .from('custom_fields')
        .select('*')
        .eq('project_id', projectId)
        .eq('user_id', user.id)
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

    try {
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          ...taskData,
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
      const { data, error } = await supabase
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
      const { error } = await supabase
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
      const { data, error } = await supabase
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

  const deleteCustomField = async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
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
    deleteCustomField,
    refreshTasks: loadTasks,
    refreshCustomFields: loadCustomFields,
  };
}