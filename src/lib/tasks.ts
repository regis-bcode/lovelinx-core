import { supabase } from '@/integrations/supabase/client';

interface CreateTaskParams {
  projectId: string;
  userId: string;
  nome: string;
  prioridade?: string;
  vencimento?: string;
  status?: string;
  extras?: Record<string, unknown>;
}

export async function createTask(params: CreateTaskParams): Promise<{ id: string; task_id: string }> {
  const payload: Record<string, unknown> = {
    project_id: params.projectId,
    user_id: params.userId,
    nome: params.nome,
    prioridade: params.prioridade ?? null,
    status: params.status ?? null,
    ...(params.vencimento ? { data_vencimento: params.vencimento } : {}),
  };

  if (params.extras) {
    Object.assign(payload, params.extras);
  }

  const { data, error } = await supabase
    .from('tasks')
    .insert(payload)
    .select('id, task_id')
    .single();

  if (error) {
    throw error;
  }

  if (!data?.task_id) {
    throw new Error('INSERT ok, mas task_id não retornou (trigger ausente?).');
  }

  return data as { id: string; task_id: string };
}
