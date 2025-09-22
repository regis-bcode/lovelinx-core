import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { TAP, TAPFormData } from '@/types/tap';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useProjects } from '@/hooks/useProjects';

export function useTAP(projectId?: string) {
  const [tap, setTap] = useState<TAP | null>(null);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const { createProject } = useProjects();

  useEffect(() => {
    if (!projectId || !user) return;
    loadTAP();

    const channel = supabase
      .channel(`tap-realtime-${projectId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'tap', filter: `project_id=eq.${projectId}` }, (payload) => {
        const newTap = payload.new as TAP;
        setTap(newTap);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'tap', filter: `project_id=eq.${projectId}` }, (payload) => {
        const updatedTap = payload.new as TAP;
        setTap(updatedTap);
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'tap', filter: `project_id=eq.${projectId}` }, () => {
        setTap(null);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId, user]);

  const loadTAP = async () => {
    if (!projectId || !user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tap')
        .select('*')
        .eq('project_id', projectId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Erro ao carregar TAP:', error);
        toast({
          title: "Erro",
          description: "Erro ao carregar TAP.",
          variant: "destructive",
        });
        return;
      }

      setTap(data);
    } catch (error) {
      console.error('Erro ao carregar TAP:', error);
    } finally {
      setLoading(false);
    }
  };

  const createTAP = async (tapData: TAPFormData): Promise<TAP | null> => {
    if (!user?.id) {
      toast({
        title: "Erro",
        description: "Usuário deve estar logado para criar TAP.",
        variant: "destructive",
      });
      return null;
    }

    try {
      // Primeiro criar o projeto associado à TAP
      const projectData = {
        folder_id: null, // Será definido se necessário
        data: tapData.data,
        cod_cliente: tapData.cod_cliente,
        nome_projeto: tapData.nome_projeto,
        cliente: tapData.cod_cliente, // Usando cod_cliente como nome do cliente por enquanto
        gpp: tapData.gpp,
        coordenador: tapData.coordenador,
        produto: tapData.produto,
        esn: tapData.esn,
        arquiteto: tapData.arquiteto,
        criticidade: tapData.criticidade_totvs as 'Baixa' | 'Média' | 'Alta' | 'Crítica',
        status: tapData.status,
        drive: tapData.drive,
        valor_projeto: tapData.valor_projeto || 0,
        receita_atual: tapData.receita_atual || 0,
        margem_venda_percent: tapData.margem_venda_percent || 0,
        margem_atual_percent: tapData.margem_atual_percent || 0,
        margem_venda_reais: tapData.margem_venda_valor || 0,
        margem_atual_reais: tapData.margem_atual_valor || 0,
        mrr: tapData.mrr || 0,
        investimento_perdas: tapData.investimento_perdas || 0,
        mrr_total: tapData.mrr_total || 0,
        investimento_comercial: tapData.investimento_comercial || 0,
        psa_planejado: tapData.psa_planejado || 0,
        investimento_erro_produto: tapData.investimento_erro_produto || 0,
        diferenca_psa_projeto: tapData.diferenca_psa_projeto || 0,
        projeto_em_perda: tapData.projeto_em_perda || false,
        data_inicio: tapData.data_inicio,
        go_live_previsto: tapData.go_live_previsto,
        duracao_pos_producao: tapData.duracao_pos_producao || 0,
        encerramento: tapData.encerramento,
        escopo: tapData.escopo,
        objetivo: tapData.objetivo,
        observacao: tapData.observacoes,
      };

      const newProject = await createProject(projectData);
      
      if (!newProject) {
        toast({
          title: "Erro",
          description: "Erro ao criar projeto associado à TAP.",
          variant: "destructive",
        });
        return null;
      }

      // Agora criar a TAP com o ID do projeto criado
      const { data, error } = await supabase
        .from('tap')
        .insert({
          ...tapData,
          project_id: newProject.id,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) {
        console.error('Erro ao criar TAP:', error);
        toast({
          title: "Erro",
          description: "Erro ao criar TAP.",
          variant: "destructive",
        });
        return null;
      }

      setTap(data);
      toast({
        title: "Sucesso",
        description: "TAP e projeto criados com sucesso!",
      });
      return data;
    } catch (error) {
      console.error('Erro ao criar TAP:', error);
      return null;
    }
  };

  const updateTAP = async (id: string, tapData: Partial<TAPFormData>): Promise<TAP | null> => {
    try {
      const { data, error } = await supabase
        .from('tap')
        .update(tapData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Erro ao atualizar TAP:', error);
        toast({
          title: "Erro",
          description: "Erro ao atualizar TAP.",
          variant: "destructive",
        });
        return null;
      }

      setTap(data);
      toast({
        title: "Sucesso",
        description: "TAP atualizado com sucesso!",
      });
      return data;
    } catch (error) {
      console.error('Erro ao atualizar TAP:', error);
      return null;
    }
  };

  const deleteTAP = async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('tap')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Erro ao deletar TAP:', error);
        toast({
          title: "Erro",
          description: "Erro ao deletar TAP.",
          variant: "destructive",
        });
        return false;
      }

      setTap(null);
      toast({
        title: "Sucesso",
        description: "TAP deletado com sucesso!",
      });
      return true;
    } catch (error) {
      console.error('Erro ao deletar TAP:', error);
      return false;
    }
  };

  const refreshTAP = () => {
    if (projectId) {
      loadTAP();
    }
  };

  return {
    tap,
    loading,
    createTAP,
    updateTAP,
    deleteTAP,
    refreshTAP,
  };
}