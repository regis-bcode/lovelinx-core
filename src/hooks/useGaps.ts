import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Gap, GapFormData } from '@/types/gap';
import { Task } from '@/types/task';
import { useToast } from '@/hooks/use-toast';

export function useGaps(projectId?: string) {
  const { toast } = useToast();
  const [gaps, setGaps] = useState<Gap[]>([]);
  const [loading, setLoading] = useState(false);

  const loadGaps = async () => {
    if (!projectId) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('gaps')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const normalized = (data ?? []).map(item => ({
        ...item,
        impacto: Array.isArray(item.impacto) ? (item.impacto as string[]) : item.impacto ? (item.impacto as string[]) : null,
        anexos: Array.isArray(item.anexos) ? (item.anexos as string[]) : item.anexos ? (item.anexos as string[]) : null,
      })) as Gap[];

      setGaps(normalized);
    } catch (error) {
      console.error('Erro ao carregar GAPs:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os GAPs do projeto.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!projectId) return;

    loadGaps();

    const channel = supabase
      .channel(`gaps-${projectId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'gaps', filter: `project_id=eq.${projectId}` },
        () => {
          loadGaps();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const createGap = async (payload: Partial<GapFormData>): Promise<Gap | null> => {
    if (!projectId) {
      toast({
        title: 'Erro',
        description: 'Projeto não informado para criar GAP.',
        variant: 'destructive',
      });
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('gaps')
        .insert({
          project_id: projectId,
          titulo: payload.titulo ?? 'GAP sem título',
          task_id: payload.task_id,
          descricao: payload.descricao ?? null,
          tipo: payload.tipo ?? null,
          origem: payload.origem ?? null,
          severidade: payload.severidade ?? null,
          urgencia: payload.urgencia ?? null,
          prioridade: payload.prioridade ?? null,
          impacto: payload.impacto ?? null,
          faturavel: payload.faturavel ?? null,
          valor_impacto_financeiro: payload.valor_impacto_financeiro ?? null,
          causa_raiz: payload.causa_raiz ?? null,
          plano_acao: payload.plano_acao ?? null,
          responsavel: payload.responsavel ?? null,
          data_prometida: payload.data_prometida ?? null,
          status: payload.status ?? null,
          necessita_aprovacao: payload.necessita_aprovacao ?? null,
          decisao: payload.decisao ?? null,
          aprovado_por: payload.aprovado_por ?? null,
          data_aprovacao: payload.data_aprovacao ?? null,
          anexos: payload.anexos ?? null,
          observacoes: payload.observacoes ?? null,
          impacto_financeiro_descricao: payload.impacto_financeiro_descricao ?? null,
          impacto_resumo: payload.impacto_resumo ?? null,
        } as GapFormData)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'GAP criado',
        description: 'O registro de GAP foi criado com sucesso.',
      });

      return data as Gap;
    } catch (error) {
      console.error('Erro ao criar GAP:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível criar o GAP.',
        variant: 'destructive',
      });
      return null;
    }
  };

  const updateGap = async (id: string, updates: Partial<GapFormData>): Promise<Gap | null> => {
    try {
      const { data, error } = await supabase
        .from('gaps')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'GAP atualizado',
        description: 'As informações do GAP foram atualizadas.',
      });

      return data as Gap;
    } catch (error) {
      console.error('Erro ao atualizar GAP:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar o GAP.',
        variant: 'destructive',
      });
      return null;
    }
  };

  const deleteGap = async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('gaps')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'GAP removido',
        description: 'O registro de GAP foi removido com sucesso.',
      });

      return true;
    } catch (error) {
      console.error('Erro ao remover GAP:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível remover o GAP.',
        variant: 'destructive',
      });
      return false;
    }
  };

  const ensureGapForTask = async (task: Task): Promise<Gap | null> => {
    if (!task?.id || !projectId) return null;

    const existingGap = gaps.find(gap => gap.task_id === task.id);
    if (existingGap) {
      return existingGap;
    }

    const payload: Partial<GapFormData> = {
      task_id: task.id,
      titulo: task.nome,
      descricao: task.descricao_detalhada ?? null,
      tipo: 'Escopo',
      origem: 'Escopo',
      status: 'Aberto',
      impacto: ['Escopo'],
      necessita_aprovacao: false,
      faturavel: false,
    };

    const created = await createGap(payload);
    if (created) {
      await loadGaps();
    }

    return created;
  };

  const gapsByTask = useMemo(() => {
    return gaps.reduce<Record<string, Gap[]>>((acc, gap) => {
      if (!acc[gap.task_id]) {
        acc[gap.task_id] = [];
      }
      acc[gap.task_id].push(gap);
      return acc;
    }, {});
  }, [gaps]);

  return {
    gaps,
    loading,
    gapsByTask,
    createGap,
    updateGap,
    deleteGap,
    ensureGapForTask,
    refreshGaps: loadGaps,
  };
}
