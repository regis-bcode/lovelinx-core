import { useEffect, useMemo, useState } from 'react';
import type { PostgrestError } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Gap, GapFormData } from '@/types/gap';
import { Task } from '@/types/task';
import { useToast } from '@/hooks/use-toast';

export function useGaps(projectId?: string) {
  const { toast } = useToast();
  const [gaps, setGaps] = useState<Gap[]>([]);
  const [loading, setLoading] = useState(false);
  const [isRemoteAvailable, setIsRemoteAvailable] = useState(true);

  const generateLocalId = () => `gap-${Math.random().toString(36).slice(2, 10)}`;

  const isTableMissingError = (error: unknown): error is PostgrestError => {
    const parsed = error as PostgrestError | undefined;
    return parsed?.code === 'PGRST205';
  };

  const normalizePercentageValue = (value: unknown): number | null => {
    if (value === null || value === undefined) {
      return null;
    }

    if (typeof value === 'number') {
      if (!Number.isFinite(value)) return null;
      return Math.min(Math.max(value, 0), 100);
    }

    const parsed = Number.parseFloat(String(value).replace(',', '.'));
    if (!Number.isFinite(parsed)) {
      return null;
    }

    return Math.min(Math.max(parsed, 0), 100);
  };

  const normalizeGap = (gap: any): Gap => {
    const impactoValue = Array.isArray(gap.impacto)
      ? (gap.impacto as string[])
      : gap.impacto
        ? [gap.impacto as string]
        : null;

    const anexosValue = Array.isArray(gap.anexos)
      ? (gap.anexos as string[])
      : gap.anexos
        ? [gap.anexos as string]
        : null;

    return {
      ...gap,
      impacto: impactoValue,
      anexos: anexosValue,
      percentual_previsto: normalizePercentageValue(gap.percentual_previsto),
      percentual_planejado: normalizePercentageValue(gap.percentual_planejado),
    } as Gap;
  };

  const createLocalGap = (payload: Partial<GapFormData>): Gap => {
    const timestamp = new Date().toISOString();
    return normalizeGap({
      id: generateLocalId(),
      project_id: projectId!,
      titulo: payload.titulo ?? 'GAP sem título',
      task_id: payload.task_id ?? '',
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
      data_prevista_solucao: payload.data_prevista_solucao ?? null,
      data_realizada_solucao: payload.data_realizada_solucao ?? null,
      status: payload.status ?? null,
      necessita_aprovacao: payload.necessita_aprovacao ?? null,
      decisao: payload.decisao ?? null,
      aprovado_por: payload.aprovado_por ?? null,
      data_aprovacao: payload.data_aprovacao ?? null,
      anexos: payload.anexos ?? null,
      observacoes: payload.observacoes ?? null,
      impacto_financeiro_descricao: payload.impacto_financeiro_descricao ?? null,
      impacto_resumo: payload.impacto_resumo ?? null,
      percentual_previsto: normalizePercentageValue(payload.percentual_previsto ?? null),
      percentual_planejado: normalizePercentageValue(payload.percentual_planejado ?? null),
      created_at: timestamp,
      updated_at: timestamp,
    });
  };

  const loadGaps = async () => {
    if (!projectId) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('gaps')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) {
        if (isTableMissingError(error)) {
          console.warn('Tabela gaps não encontrada. Usando dados locais.', error);
          setIsRemoteAvailable(false);
          return;
        }
        throw error;
      }

      setIsRemoteAvailable(true);

      const normalized = (data ?? []).map(item => normalizeGap(item));

      setGaps(normalized);
    } catch (error) {
      if (isTableMissingError(error)) {
        console.warn('Tabela gaps indisponível durante o carregamento. Mantendo dados locais.', error);
        setIsRemoteAvailable(false);
      } else {
        console.error('Erro ao carregar GAPs:', error);
        toast({
          title: 'Erro',
          description: 'Não foi possível carregar os GAPs do projeto.',
          variant: 'destructive',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!projectId) return;

    loadGaps();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  useEffect(() => {
    if (!projectId || !isRemoteAvailable) return;

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
  }, [projectId, isRemoteAvailable]);

  const createGap = async (payload: Partial<GapFormData>): Promise<Gap | null> => {
    if (!projectId) {
      toast({
        title: 'Erro',
        description: 'Projeto não informado para criar GAP.',
        variant: 'destructive',
      });
      return null;
    }

    if (!isRemoteAvailable) {
      const localGap = createLocalGap(payload);
      setGaps(prev => [localGap, ...prev]);

      toast({
        title: 'GAP criado',
        description: 'O registro de GAP foi criado em modo offline.',
      });

      return localGap;
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
          data_prevista_solucao: payload.data_prevista_solucao ?? null,
          data_realizada_solucao: payload.data_realizada_solucao ?? null,
          status: payload.status ?? null,
          necessita_aprovacao: payload.necessita_aprovacao ?? null,
          decisao: payload.decisao ?? null,
          aprovado_por: payload.aprovado_por ?? null,
          data_aprovacao: payload.data_aprovacao ?? null,
          anexos: payload.anexos ?? null,
          observacoes: payload.observacoes ?? null,
          impacto_financeiro_descricao: payload.impacto_financeiro_descricao ?? null,
          impacto_resumo: payload.impacto_resumo ?? null,
          percentual_previsto: normalizePercentageValue(payload.percentual_previsto ?? null),
          percentual_planejado: normalizePercentageValue(payload.percentual_planejado ?? null),
        } as GapFormData)
        .select()
        .single();

      if (error) throw error;

      const normalized = normalizeGap(data);

      setGaps(prev => [normalized, ...prev]);

      toast({
        title: 'GAP criado',
        description: 'O registro de GAP foi criado com sucesso.',
      });

      return normalized;
    } catch (error) {
      if (isTableMissingError(error)) {
        setIsRemoteAvailable(false);
        return createGap(payload);
      }

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
    if (!isRemoteAvailable) {
      let updated: Gap | null = null;
      setGaps(prev =>
        prev.map(gap => {
          if (gap.id !== id) return gap;
          updated = normalizeGap({
            ...gap,
            ...updates,
            updated_at: new Date().toISOString(),
          });
          return updated;
        }),
      );

      if (updated) {
        toast({
          title: 'GAP atualizado',
          description: 'As informações do GAP foram atualizadas em modo offline.',
        });
      }

      return updated;
    }

    try {
      const preparedUpdates: Partial<GapFormData> = { ...updates };

      if (Object.prototype.hasOwnProperty.call(updates, 'percentual_previsto')) {
        preparedUpdates.percentual_previsto = normalizePercentageValue(updates.percentual_previsto ?? null);
      }

      if (Object.prototype.hasOwnProperty.call(updates, 'percentual_planejado')) {
        preparedUpdates.percentual_planejado = normalizePercentageValue(updates.percentual_planejado ?? null);
      }

      const { data, error } = await supabase
        .from('gaps')
        .update(preparedUpdates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      const normalized = normalizeGap(data);

      setGaps(prev => prev.map(gap => (gap.id === id ? normalized : gap)));

      toast({
        title: 'GAP atualizado',
        description: 'As informações do GAP foram atualizadas.',
      });

      return normalized;
    } catch (error) {
      if (isTableMissingError(error)) {
        setIsRemoteAvailable(false);
        return updateGap(id, updates);
      }

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
    if (!isRemoteAvailable) {
      setGaps(prev => prev.filter(gap => gap.id !== id));

      toast({
        title: 'GAP removido',
        description: 'O registro de GAP foi removido em modo offline.',
      });

      return true;
    }

    try {
      const { error } = await supabase
        .from('gaps')
        .delete()
        .eq('id', id);

      if (error) {
        if (isTableMissingError(error)) {
          setIsRemoteAvailable(false);
          return deleteGap(id);
        }
        throw error;
      }

      setGaps(prev => prev.filter(gap => gap.id !== id));

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
      titulo: task.tarefa,
      descricao: task.descricao_tarefa ?? task.descricao_detalhada ?? null,
      tipo: 'Escopo',
      origem: 'Escopo',
      status: 'Aberto',
      impacto: ['Escopo'],
      necessita_aprovacao: false,
      faturavel: false,
    };

    const created = await createGap(payload);
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
