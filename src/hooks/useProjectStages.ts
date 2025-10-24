import { useEffect, useMemo, useState } from 'react';
import type { PostgrestError } from '@supabase/supabase-js';
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
  const [isRemoteAvailable, setIsRemoteAvailable] = useState(true);

  const generateLocalId = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 10)}`;

  const createLocalStage = (userId: string, nome: string, descricao: string | undefined, ordem: number): ProjectStage => {
    const timestamp = new Date().toISOString();
    return {
      id: generateLocalId('stage'),
      user_id: userId,
      nome,
      descricao: descricao ?? null,
      ordem,
      ativo: true,
      created_at: timestamp,
      updated_at: timestamp,
    };
  };

  const createLocalSubStage = (
    userId: string,
    stageId: string,
    nome: string,
    descricao: string | undefined,
    ordem: number,
  ): ProjectSubStage => {
    const timestamp = new Date().toISOString();
    return {
      id: generateLocalId('substage'),
      stage_id: stageId,
      user_id: userId,
      nome,
      descricao: descricao ?? null,
      ordem,
      ativo: true,
      created_at: timestamp,
      updated_at: timestamp,
    };
  };

  const isTableMissingError = (error: unknown, tableName: string): error is PostgrestError => {
    const parsed = error as PostgrestError | undefined;

    if (parsed?.code !== 'PGRST205') {
      return false;
    }

    const normalizedTableName = tableName.toLowerCase();
    const includesTableName = (value?: string | null) => {
      if (!value) return false;
      const normalized = value.toLowerCase();

      return [
        `'public.${normalizedTableName}'`,
        `"public.${normalizedTableName}"`,
        `'${normalizedTableName}'`,
        `"${normalizedTableName}"`,
        `public.${normalizedTableName}`,
        normalizedTableName,
      ].some(token => normalized.includes(token));
    };

    return (
      includesTableName(parsed?.message) ||
      includesTableName(parsed?.details) ||
      includesTableName(parsed?.hint)
    );
  };

  const loadFallbackStages = (userId: string) => {
    const fallback = DEFAULT_STAGES.map((stage, index) =>
      createLocalStage(userId, stage.nome, stage.descricao, index + 1),
    );
    setStages(fallback);
  };

  const loadStages = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('project_stages')
        .select('*')
        .eq('user_id', user.id)
        .order('ordem', { ascending: true });

      if (error) {
        if (isTableMissingError(error, 'project_stages')) {
          console.warn('Tabela project_stages não encontrada. Usando dados locais.', error);
          setIsRemoteAvailable(false);
          loadFallbackStages(user.id);
          return;
        }
        throw error;
      }

      setIsRemoteAvailable(true);

      if (!data || data.length === 0) {
        await bootstrapStages();
        return;
      }

      setStages(data as ProjectStage[]);
    } catch (error) {
      if (user?.id && isTableMissingError(error, 'project_stages')) {
        console.warn('Tabela project_stages indisponível durante o carregamento. Usando dados locais.', error);
        setIsRemoteAvailable(false);
        loadFallbackStages(user.id);
      } else {
        console.error('Erro ao carregar etapas:', error);
        toast({
          title: 'Erro',
          description: 'Não foi possível carregar as etapas do projeto.',
          variant: 'destructive',
        });
      }
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

      if (error) {
        if (isTableMissingError(error, 'project_substages')) {
          console.warn('Tabela project_substages não encontrada. Usando dados locais.', error);
          setIsRemoteAvailable(false);
          setSubStages([]);
          return;
        }
        throw error;
      }

      setSubStages(data as ProjectSubStage[]);
    } catch (error) {
      if (isTableMissingError(error, 'project_substages')) {
        console.warn('Tabela project_substages indisponível durante o carregamento. Mantendo dados locais.', error);
        setIsRemoteAvailable(false);
        setSubStages([]);
      } else {
        console.error('Erro ao carregar sub-etapas:', error);
        toast({
          title: 'Erro',
          description: 'Não foi possível carregar as sub-etapas do projeto.',
          variant: 'destructive',
        });
      }
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
      if (isTableMissingError(error, 'project_stages')) {
        setIsRemoteAvailable(false);
        loadFallbackStages(user.id);
      } else {
        console.error('Erro ao criar etapas padrão:', error);
      }
    }
  };

  const createStage = async (payload: Omit<ProjectStageFormData, 'ativo' | 'ordem'> & { ordem?: number }) => {
    if (!user?.id) return null;

    const ordem = payload.ordem ?? stages.length + 1;

    if (!isRemoteAvailable) {
      const localStage = createLocalStage(user.id, payload.nome, payload.descricao, ordem);
      setStages(prev => [...prev, localStage]);

      toast({
        title: 'Etapa criada',
        description: `A etapa "${payload.nome}" foi criada em modo offline.`,
      });

      return localStage;
    }

    try {
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
      if (isTableMissingError(error, 'project_stages')) {
        const localStage = createLocalStage(user.id, payload.nome, payload.descricao, ordem);
        setIsRemoteAvailable(false);
        setStages(prev => [...prev, localStage]);
        toast({
          title: 'Etapa criada',
          description: `A etapa "${payload.nome}" foi criada em modo offline.`,
        });
        return localStage;
      }

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
    if (!isRemoteAvailable) {
      let updatedStage: ProjectStage | null = null;
      setStages(prev =>
        prev.map(stage => {
          if (stage.id !== id) return stage;
          updatedStage = {
            ...stage,
            ...updates,
            updated_at: new Date().toISOString(),
          } as ProjectStage;
          return updatedStage;
        }),
      );

      if (updatedStage) {
        toast({
          title: 'Etapa atualizada',
          description: 'As informações da etapa foram atualizadas em modo offline.',
        });
      }

      return updatedStage;
    }

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
      if (isTableMissingError(error, 'project_stages')) {
        setIsRemoteAvailable(false);
        return updateStage(id, updates);
      }

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
    if (!isRemoteAvailable) {
      setStages(prev => prev.filter(stage => stage.id !== id));
      setSubStages(prev => prev.filter(subStage => subStage.stage_id !== id));

      toast({
        title: 'Etapa removida',
        description: 'A etapa foi removida em modo offline.',
      });

      return true;
    }

    try {
      const { error } = await supabase
        .from('project_stages')
        .update({ ativo: false })
        .eq('id', id);

      if (error) {
        if (isTableMissingError(error, 'project_stages')) {
          setIsRemoteAvailable(false);
          return deleteStage(id);
        }
        throw error;
      }

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

    const ordem = payload.ordem ?? subStages.filter(item => item.stage_id === stageId).length + 1;

    if (!isRemoteAvailable) {
      const localSubStage = createLocalSubStage(user.id, stageId, payload.nome, payload.descricao, ordem);
      setSubStages(prev => [...prev, localSubStage]);

      toast({
        title: 'Sub-etapa criada',
        description: `A sub-etapa "${payload.nome}" foi criada em modo offline.`,
      });

      return localSubStage;
    }

    try {
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
      if (isTableMissingError(error, 'project_substages')) {
        const localSubStage = createLocalSubStage(user.id, stageId, payload.nome, payload.descricao, ordem);
        setIsRemoteAvailable(false);
        setSubStages(prev => [...prev, localSubStage]);
        toast({
          title: 'Sub-etapa criada',
          description: `A sub-etapa "${payload.nome}" foi criada em modo offline.`,
        });
        return localSubStage;
      }

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
    if (!isRemoteAvailable) {
      let updatedSubStage: ProjectSubStage | null = null;
      setSubStages(prev =>
        prev.map(subStage => {
          if (subStage.id !== id) return subStage;
          updatedSubStage = {
            ...subStage,
            ...updates,
            updated_at: new Date().toISOString(),
          } as ProjectSubStage;
          return updatedSubStage;
        }),
      );

      if (updatedSubStage) {
        toast({
          title: 'Sub-etapa atualizada',
          description: 'As informações da sub-etapa foram atualizadas em modo offline.',
        });
      }

      return updatedSubStage;
    }

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
      if (isTableMissingError(error, 'project_substages')) {
        setIsRemoteAvailable(false);
        return updateSubStage(id, updates);
      }

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
    if (!isRemoteAvailable) {
      setSubStages(prev => prev.filter(subStage => subStage.id !== id));

      toast({
        title: 'Sub-etapa removida',
        description: 'A sub-etapa foi removida em modo offline.',
      });

      return true;
    }

    try {
      const { error } = await supabase
        .from('project_substages')
        .update({ ativo: false })
        .eq('id', id);

      if (error) {
        if (isTableMissingError(error, 'project_substages')) {
          setIsRemoteAvailable(false);
          return deleteSubStage(id);
        }
        throw error;
      }

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id || !isRemoteAvailable) return;

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
  }, [user?.id, isRemoteAvailable]);

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
