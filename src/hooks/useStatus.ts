import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Status, StatusFormData } from '@/types/status';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { DEFAULT_STATUS_COLOR_BY_NAME, FALLBACK_STATUS_COLOR, getStatusColorValue } from '@/lib/status-colors';

type SupabaseStatusRecord = Status & {
  tipo_aplicacao?: string[] | null;
  cor?: string | null;
};

const normalizeAplicacao = (tipo?: string[] | null): string[] =>
  Array.isArray(tipo)
    ? tipo.filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    : [];

const normalizeStatusRecord = (status: SupabaseStatusRecord): Status => ({
  ...status,
  tipo_aplicacao: normalizeAplicacao(status.tipo_aplicacao),
  cor: getStatusColorValue(status),
});

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
  ].map((status) => ({
    ...status,
    cor: DEFAULT_STATUS_COLOR_BY_NAME[status.nome] ?? FALLBACK_STATUS_COLOR,
  }));

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

      const normalized = (data as SupabaseStatusRecord[]).map((status) => normalizeStatusRecord(status));
      setStatuses(normalized);
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
      await loadStatuses();
      
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
      const payload = {
        ...statusData,
        tipo_aplicacao: normalizeAplicacao(statusData.tipo_aplicacao),
        cor: getStatusColorValue(statusData),
      };

      const { data, error } = await supabase
        .from('status')
        .insert([{ ...payload, user_id: user.id }])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Status criado",
        description: `Status "${statusData.nome}" foi criado com sucesso.`,
      });

      // Atualização otimista da lista
      const normalized = data ? normalizeStatusRecord(data as SupabaseStatusRecord) : null;

      setStatuses((prev) => (normalized ? [normalized, ...prev] : prev));

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
      let payload: Partial<StatusFormData> =
        Object.prototype.hasOwnProperty.call(statusData, 'cor')
          ? { ...statusData, cor: getStatusColorValue(statusData) }
          : { ...statusData };

      if (Object.prototype.hasOwnProperty.call(statusData, 'tipo_aplicacao')) {
        payload = {
          ...payload,
          tipo_aplicacao: normalizeAplicacao(statusData.tipo_aplicacao as string[] | null | undefined),
        };
      }

      const { data, error } = await supabase
        .from('status')
        .update(payload)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Status atualizado",
        description: "Status foi atualizado com sucesso.",
      });

      // Atualização otimista da lista
      const normalized = data ? normalizeStatusRecord(data as SupabaseStatusRecord) : null;

      setStatuses((prev) => (normalized ? prev.map((s) => (s.id === id ? normalized : s)) : prev));

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
      if (!user?.id) return false;

      // Buscar o registro para saber o nome e os tipos de aplicação
      const { data: statusRecord, error: statusFetchError } = await supabase
        .from('status')
        .select('nome,tipo_aplicacao')
        .eq('id', id)
        .maybeSingle();

      if (statusFetchError) throw statusFetchError;
      if (!statusRecord) {
        toast({
          title: 'Aviso',
          description: 'Status não encontrado.',
          variant: 'destructive',
        });
        return false;
      }

      // Verificações de consistência: tarefas e projetos que usam este status
      let tasksCount = 0;
      let projectsCount = 0;

      // Se o status se aplica a tarefas, verificar tabela tasks
      if (Array.isArray(statusRecord.tipo_aplicacao) && (statusRecord.tipo_aplicacao.includes('tarefa_projeto') || statusRecord.tipo_aplicacao.includes('tarefa_suporte'))) {
        const { count, error: tasksErr } = await supabase
          .from('tasks')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('status', statusRecord.nome);
        if (tasksErr) throw tasksErr;
        tasksCount = count ?? 0;
      }

      // Se o status se aplica a projetos, verificar tabela projects
      if (Array.isArray(statusRecord.tipo_aplicacao) && statusRecord.tipo_aplicacao.includes('projeto')) {
        const { count, error: projErr } = await supabase
          .from('projects')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('status', statusRecord.nome);
        if (projErr) throw projErr;
        projectsCount = count ?? 0;
      }

      if (tasksCount > 0 || projectsCount > 0) {
        const detalhes = [
          tasksCount > 0 ? `${tasksCount} tarefa(s)` : null,
          projectsCount > 0 ? `${projectsCount} projeto(s)` : null,
        ].filter(Boolean).join(' e ');

        toast({
          title: 'Não é possível excluir',
          description: `Este status está associado a ${detalhes}. Altere os registros antes de excluir.`,
          variant: 'destructive',
        });
        return false;
      }

      // Pode excluir
      const { error } = await supabase
        .from('status')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);
      if (error) throw error;

      // Atualização otimista
      setStatuses((prev) => prev.filter((s) => s.id !== id));

      toast({
        title: 'Status excluído',
        description: 'Status foi excluído com sucesso.',
      });

      return true;
    } catch (error) {
      console.error('Erro ao excluir status:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível excluir o status.',
        variant: 'destructive',
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