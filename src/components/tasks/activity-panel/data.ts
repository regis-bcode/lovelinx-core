import { supabase } from '@/integrations/supabase/client';
import type { TaskActivity } from '@/types/task-activity';

export async function listTaskActivities(taskId: string, limit = 200): Promise<TaskActivity[]> {
  const { data, error } = await supabase
    .from('task_activities')
    .select('*')
    .eq('task_id', taskId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  return (data ?? []) as TaskActivity[];
}

export async function addTaskComment(taskId: string, body: string): Promise<TaskActivity> {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) {
    throw authError;
  }

  const actorId = authData.user?.id;
  if (!actorId) {
    throw new Error('Usuário não autenticado. Faça login para comentar.');
  }

  const { data, error } = await supabase
    .from('task_activities')
    .insert([
      {
        task_id: taskId,
        actor_id: actorId,
        kind: 'comment',
        title: 'Novo comentário',
        comment_body: body,
        message: null,
        payload: null,
      },
    ])
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return data as TaskActivity;
}
