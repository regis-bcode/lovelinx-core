import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { TimeLog, TimeLogFormData, ApprovalStatus } from '@/types/time-log';
import { useToast } from '@/hooks/use-toast';

export function useTimeLogs(projectId?: string) {
  const [timeLogs, setTimeLogs] = useState<TimeLog[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (!projectId) {
      setLoading(false);
      return;
    }

    loadTimeLogs();

    const channel = supabase
      .channel('time_logs_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'time_logs',
          filter: `project_id=eq.${projectId}`,
        },
        () => {
          loadTimeLogs();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId]);

  const loadTimeLogs = async () => {
    if (!projectId) return;

    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.error('Usuário não autenticado');
        return;
      }

      const { data, error } = await supabase
        .from('time_logs')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setTimeLogs(data || []);
    } catch (error) {
      console.error('Erro ao carregar logs de tempo:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os logs de tempo',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const createTimeLog = async (logData: Partial<TimeLogFormData>): Promise<TimeLog | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: 'Erro',
          description: 'Você precisa estar autenticado',
          variant: 'destructive',
        });
        return null;
      }

      const { data, error } = await supabase
        .from('time_logs')
        .insert({
          ...logData,
          user_id: user.id,
          project_id: projectId,
        } as any)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Tempo registrado com sucesso',
      });

      return data;
    } catch (error) {
      console.error('Erro ao criar log de tempo:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível registrar o tempo',
        variant: 'destructive',
      });
      return null;
    }
  };

  const updateTimeLog = async (id: string, updates: Partial<TimeLogFormData>): Promise<TimeLog | null> => {
    try {
      const { data, error } = await supabase
        .from('time_logs')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Log de tempo atualizado',
      });

      return data;
    } catch (error) {
      console.error('Erro ao atualizar log de tempo:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar o log de tempo',
        variant: 'destructive',
      });
      return null;
    }
  };

  const approveTimeLog = async (id: string, status: ApprovalStatus): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: 'Erro',
          description: 'Você precisa estar autenticado',
          variant: 'destructive',
        });
        return false;
      }

      const { error } = await supabase
        .from('time_logs')
        .update({
          status_aprovacao: status,
          aprovador_id: user.id,
          data_aprovacao: new Date().toISOString(),
        } as any)
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: `Tempo ${status === 'aprovado' ? 'aprovado' : 'reprovado'} com sucesso`,
      });

      return true;
    } catch (error) {
      console.error('Erro ao aprovar/reprovar tempo:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar o status',
        variant: 'destructive',
      });
      return false;
    }
  };

  const deleteTimeLog = async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('time_logs')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Log de tempo deletado',
      });

      return true;
    } catch (error) {
      console.error('Erro ao deletar log de tempo:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível deletar o log de tempo',
        variant: 'destructive',
      });
      return false;
    }
  };

  const getTaskTotalTime = (taskId: string): number => {
    return timeLogs
      .filter(log => log.task_id === taskId && log.status_aprovacao === 'aprovado')
      .reduce((total, log) => total + log.tempo_minutos, 0);
  };

  const getProjectTotalTime = (): number => {
    return timeLogs
      .filter(log => log.status_aprovacao === 'aprovado')
      .reduce((total, log) => total + log.tempo_minutos, 0);
  };

  return {
    timeLogs,
    loading,
    createTimeLog,
    updateTimeLog,
    approveTimeLog,
    deleteTimeLog,
    getTaskTotalTime,
    getProjectTotalTime,
    refreshTimeLogs: loadTimeLogs,
  };
}
