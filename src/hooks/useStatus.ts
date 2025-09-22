import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Status, StatusFormData } from '@/types/status';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export const useStatus = () => {
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();

  // Dados padrão para serem criados na primeira vez
  const DEFAULT_STATUSES: Omit<StatusFormData, 'user_id'>[] = [
    { nome: 'Não Iniciado', tipo_aplicacao: ['projeto', 'tarefa_suporte', 'tarefa_projeto'], ativo: true },
    { nome: 'Conforme Planejado', tipo_aplicacao: ['projeto', 'tarefa_suporte', 'tarefa_projeto'], ativo: true },
    { nome: 'Atenção', tipo_aplicacao: ['projeto', 'tarefa_suporte', 'tarefa_projeto'], ativo: true },
    { nome: 'Atrasado', tipo_aplicacao: ['projeto', 'tarefa_suporte', 'tarefa_projeto'], ativo: true },
    { nome: 'Pausado', tipo_aplicacao: ['projeto', 'tarefa_suporte', 'tarefa_projeto'], ativo: true },
    { nome: 'Cancelado', tipo_aplicacao: ['projeto', 'tarefa_suporte', 'tarefa_projeto'], ativo: true },
  ];

  useEffect(() => {
    if (user?.id) {
      loadStatuses();
      
      // Configurar listener em tempo real
      const subscription = supabase
        .channel('status_changes')
        .on('postgres_changes', 
          { 
            event: '*', 
            schema: 'public', 
            table: 'status',
            filter: `user_id=eq.${user.id}`
          }, 
          () => {
            loadStatuses();
          }
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [user?.id]);

  const loadStatuses = async () => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('status')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Se não há status cadastrados, criar os padrões
      if (!data || data.length === 0) {
        await createDefaultStatuses();
        return;
      }

      setStatuses(data as Status[]);
    } catch (error) {
      console.error('Erro ao carregar status:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os status.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createDefaultStatuses = async () => {
    if (!user?.id) return;

    try {
      const statusesWithUserId = DEFAULT_STATUSES.map(status => ({
        ...status,
        user_id: user.id
      }));

      const { error } = await supabase
        .from('status')
        .insert(statusesWithUserId);

      if (error) throw error;

      // Recarregar a lista
      loadStatuses();
      
      toast({
        title: "Status criados",
        description: "Status padrão foram criados automaticamente.",
      });
    } catch (error) {
      console.error('Erro ao criar status padrão:', error);
      toast({
        title: "Erro",
        description: "Não foi possível criar os status padrão.",
        variant: "destructive",
      });
    }
  };

  const createStatus = async (statusData: StatusFormData): Promise<Status | null> => {
    if (!user?.id) return null;

    try {
      const { data, error } = await supabase
        .from('status')
        .insert([{ ...statusData, user_id: user.id }])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Status criado",
        description: `Status "${statusData.nome}" foi criado com sucesso.`,
      });

      return data as Status;
    } catch (error) {
      console.error('Erro ao criar status:', error);
      toast({
        title: "Erro",
        description: "Não foi possível criar o status.",
        variant: "destructive",
      });
      return null;
    }
  };

  const updateStatus = async (id: string, statusData: Partial<StatusFormData>): Promise<Status | null> => {
    try {
      const { data, error } = await supabase
        .from('status')
        .update(statusData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Status atualizado",
        description: "Status foi atualizado com sucesso.",
      });

      return data as Status;
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o status.",
        variant: "destructive",
      });
      return null;
    }
  };

  const deleteStatus = async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('status')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Status excluído",
        description: "Status foi excluído com sucesso.",
      });

      return true;
    } catch (error) {
      console.error('Erro ao excluir status:', error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir o status.",
        variant: "destructive",
      });
      return false;
    }
  };

  const refreshStatuses = () => {
    loadStatuses();
  };

  return {
    statuses,
    loading,
    createStatus,
    updateStatus,
    deleteStatus,
    refreshStatuses,
  };
};