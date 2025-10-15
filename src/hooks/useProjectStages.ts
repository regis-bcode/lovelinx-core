import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import {
  ProjectStage,
  ProjectSubStage,
  ProjectStageFormData,
  ProjectSubStageFormData,
} from '@/types/project-stage';

const DEFAULT_STAGES: Array<{ nome: string; descricao?: string }> = [
  { nome: 'Iniciação' },
  { nome: 'Planejamento' },
  { nome: 'Controle' },
  { nome: 'Execução' },
  { nome: 'Encerramento' },
];

export function useProjectStages() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [stages, setStages] = useState<ProjectStage[]>([]);
  const [subStages, setSubStages] = useState<ProjectSubStage[]>([]);
  const [loading, setLoading] = useState(true);

  const loadStages = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('project_stages')
        .select('*')
        .eq('user_id', user.id)
        .order('ordem', { ascending: true });

      if (error) throw error;

      if (!data || data.length === 0) {
        await bootstrapStages();
        return;
      }

      setStages(data as ProjectStage[]);
    } catch (error) {
      console.error('Erro ao carregar etapas:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as etapas do projeto.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadSubStages = async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('project_substages')
        .select('*')
        .eq('user_id', user.id)
        .order('ordem', { ascending: true });

      if (error) throw error;

      setSubStages(data as ProjectSubStage[]);
    } catch (error) {
      console.error('Erro ao carregar sub-etapas:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as sub-etapas do projeto.',
        variant: 'destructive',
      });
    }
  };

  const bootstrapStages = async () => {
    if (!user?.id) return;

    try {
      const stagedData = DEFAULT_STAGES.map((stage, index) => ({
        user_id: user.id,
        nome: stage.nome,
        descricao: stage.descricao ?? null,
        ordem: index + 1,
        ativo: true,
      }));

      const { error } = await supabase.from('project_stages').insert(stagedData as ProjectStageFormData[]);

      if (error) throw error;

      await loadStages();
    } catch (error) {
      console.error('Erro ao criar etapas padrão:', error);
    }
  };

  const createStage = async (payload: Omit<ProjectStageFormData, 'ativo' | 'ordem'> & { ordem?: number }) => {
    if (!user?.id) return null;

    try {
      const ordem = payload.ordem ?? stages.length + 1;
      const { data, error } = await supabase
        .from('project_stages')
        .insert({
          user_id: user.id,
          nome: payload.nome,
          descricao: payload.descricao ?? null,
          ordem,
          ativo: true,
        })
        .select()
        .single();

      if (error) throw error;

      setStages(prev => [...prev, data as ProjectStage]);

      toast({
        title: 'Etapa criada',
        description: `A etapa "${payload.nome}" foi criada com sucesso.`,
      });

      return data as ProjectStage;
    } catch (error) {
      console.error('Erro ao criar etapa:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível criar a etapa.',
        variant: 'destructive',
      });
      return null;
    }
  };

  const updateStage = async (id: string, updates: Partial<ProjectStageFormData>) => {
    try {
      const { data, error } = await supabase
        .from('project_stages')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      setStages(prev => prev.map(stage => (stage.id === id ? (data as ProjectStage) : stage)));

      toast({
        title: 'Etapa atualizada',
        description: 'As informações da etapa foram atualizadas.',
      });

      return data as ProjectStage;
    } catch (error) {
      console.error('Erro ao atualizar etapa:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar a etapa.',
        variant: 'destructive',
      });
      return null;
    }
  };

  const deleteStage = async (id: string) => {
    try {
      const { error } = await supabase
        .from('project_stages')
        .update({ ativo: false })
        .eq('id', id);

      if (error) throw error;

      setStages(prev => prev.filter(stage => stage.id !== id));
      setSubStages(prev => prev.filter(subStage => subStage.stage_id !== id));

      toast({
        title: 'Etapa removida',
        description: 'A etapa foi removida com sucesso.',
      });

      return true;
    } catch (error) {
      console.error('Erro ao remover etapa:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível remover a etapa.',
        variant: 'destructive',
      });
      return false;
    }
  };

  const createSubStage = async (stageId: string, payload: Omit<ProjectSubStageFormData, 'stage_id' | 'ativo' | 'ordem'> & { ordem?: number }) => {
    if (!user?.id) return null;

    try {
      const ordem = payload.ordem ?? subStages.filter(item => item.stage_id === stageId).length + 1;
      const { data, error } = await supabase
        .from('project_substages')
        .insert({
          user_id: user.id,
          stage_id: stageId,
          nome: payload.nome,
          descricao: payload.descricao ?? null,
          ordem,
          ativo: true,
        })
        .select()
        .single();

      if (error) throw error;

      setSubStages(prev => [...prev, data as ProjectSubStage]);

      toast({
        title: 'Sub-etapa criada',
        description: `A sub-etapa "${payload.nome}" foi criada com sucesso.`,
      });

      return data as ProjectSubStage;
    } catch (error) {
      console.error('Erro ao criar sub-etapa:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível criar a sub-etapa.',
        variant: 'destructive',
      });
      return null;
    }
  };

  const updateSubStage = async (id: string, updates: Partial<ProjectSubStageFormData>) => {
    try {
      const { data, error } = await supabase
        .from('project_substages')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      setSubStages(prev => prev.map(subStage => (subStage.id === id ? (data as ProjectSubStage) : subStage)));

      toast({
        title: 'Sub-etapa atualizada',
        description: 'As informações da sub-etapa foram atualizadas.',
      });

      return data as ProjectSubStage;
    } catch (error) {
      console.error('Erro ao atualizar sub-etapa:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar a sub-etapa.',
        variant: 'destructive',
      });
      return null;
    }
  };

  const deleteSubStage = async (id: string) => {
    try {
      const { error } = await supabase
        .from('project_substages')
        .update({ ativo: false })
        .eq('id', id);

      if (error) throw error;

      setSubStages(prev => prev.filter(subStage => subStage.id !== id));

      toast({
        title: 'Sub-etapa removida',
        description: 'A sub-etapa foi removida com sucesso.',
      });

      return true;
    } catch (error) {
      console.error('Erro ao remover sub-etapa:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível remover a sub-etapa.',
        variant: 'destructive',
      });
      return false;
    }
  };

  useEffect(() => {
    if (!user?.id) return;

    loadStages();
    loadSubStages();

    const stagesChannel = supabase
      .channel(`project-stages-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'project_stages', filter: `user_id=eq.${user.id}` },
        () => {
          loadStages();
        },
      )
      .subscribe();

    const subStagesChannel = supabase
      .channel(`project-substages-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'project_substages', filter: `user_id=eq.${user.id}` },
        () => {
          loadSubStages();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(stagesChannel);
      supabase.removeChannel(subStagesChannel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const activeStages = useMemo(() => stages.filter(stage => stage.ativo), [stages]);
  const activeSubStages = useMemo(() => subStages.filter(subStage => subStage.ativo), [subStages]);

  const getStageById = (stageId?: string | null) => activeStages.find(stage => stage.id === stageId);

  const getSubStagesByStage = (stageId?: string | null) =>
    activeSubStages.filter(subStage => subStage.stage_id === stageId);

  return {
    stages: activeStages,
    subStages: activeSubStages,
    loading,
    createStage,
    updateStage,
    deleteStage,
    createSubStage,
    updateSubStage,
    deleteSubStage,
    getStageById,
    getSubStagesByStage,
    refreshStages: loadStages,
    refreshSubStages: loadSubStages,
  };
}
