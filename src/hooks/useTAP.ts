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
    
    // Verificar se projectId é um UUID válido
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(projectId)) {
      console.error('[useTAP] Invalid project ID format:', projectId);
      return;
    }
    
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
    
    // Verificar se projectId é um UUID válido
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(projectId)) {
      console.error('[useTAP] Invalid project ID format:', projectId);
      toast({
        title: "Erro",
        description: "ID do projeto inválido.",
        variant: "destructive",
      });
      return;
    }
    
    setLoading(true);
    try {
      console.log('[useTAP] Loading TAP for project:', projectId);
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

      console.log('[useTAP] TAP loaded:', data);
      setTap(data as TAP);
    } catch (error) {
      console.error('Erro ao carregar TAP:', error);
    } finally {
      setLoading(false);
    }
  };

  const createTAP = async (tapData: TAPFormData, folderId?: string | null): Promise<TAP | null> => {
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
      // Sanitize valores para evitar erros de casting no Postgres ('' -> NULL)
      const toNumP = (v: any) => (v === '' || v === null || v === undefined ? undefined : Number(v));
      const toIntP = (v: any) => (v === '' || v === null || v === undefined ? undefined : parseInt(v, 10));
      const toDateP = (v: any) => (v === '' || v === null || v === undefined ? undefined : v);

      const projectData = {
        folder_id: folderId || null, // Usar o folderId passado como parâmetro
        data: toDateP(tapData.data)!, // obrigatório
        cod_cliente: tapData.cod_cliente,
        nome_projeto: tapData.nome_projeto,
        cliente: tapData.cod_cliente, // Usando cod_cliente como nome do cliente por enquanto
        gpp: tapData.gpp,
        coordenador: tapData.coordenador,
        produto: tapData.produto,
        esn: tapData.esn,
        arquiteto: tapData.arquiteto,
        criticidade: tapData.criticidade_totvs as 'Baixa' | 'Média' | 'Alta' | 'Crítica',
        status: tapData.status || undefined,
        drive: tapData.drive || undefined,
        valor_projeto: toNumP(tapData.valor_projeto),
        receita_atual: toNumP(tapData.receita_atual),
        margem_venda_percent: toNumP(tapData.margem_venda_percent),
        margem_atual_percent: toNumP(tapData.margem_atual_percent),
        margem_venda_reais: toNumP(tapData.margem_venda_valor),
        margem_atual_reais: toNumP(tapData.margem_atual_valor),
        mrr: toNumP(tapData.mrr),
        investimento_perdas: toNumP(tapData.investimento_perdas),
        mrr_total: toNumP(tapData.mrr_total),
        investimento_comercial: toNumP(tapData.investimento_comercial),
        psa_planejado: toNumP(tapData.psa_planejado),
        investimento_erro_produto: toNumP(tapData.investimento_erro_produto),
        diferenca_psa_projeto: toNumP(tapData.diferenca_psa_projeto),
        projeto_em_perda: !!tapData.projeto_em_perda,
        data_inicio: toDateP(tapData.data_inicio),
        go_live_previsto: toDateP(tapData.go_live_previsto),
        duracao_pos_producao: toIntP(tapData.duracao_pos_producao),
        encerramento: toDateP(tapData.encerramento),
        escopo: tapData.escopo || undefined,
        objetivo: tapData.objetivo || undefined,
        observacao: tapData.observacoes || undefined,
      } as const;

      console.log('[useTAP] Creating project with data', projectData);
      const newProject = await createProject(projectData as any);
      console.log('[useTAP] Project create response', newProject);
      
      if (!newProject) {
        toast({
          title: "Erro",
          description: "Erro ao criar projeto associado à TAP.",
          variant: "destructive",
        });
        return null;
      }

      // Agora criar a TAP com o ID do projeto criado
      console.log('[useTAP] Inserting TAP row');
      const { status: _tapStatus, ...tapPayload } = tapData as any;

      // Normalize numeric, boolean and date fields to avoid "invalid input syntax" on Supabase
      const toNum = (v: any) => (v === '' || v === null || v === undefined ? undefined : Number(v));
      const toInt = (v: any) => (v === '' || v === null || v === undefined ? undefined : parseInt(v, 10));
      const toDate = (v: any) => (v === '' || v === null || v === undefined ? undefined : v);

      const sanitizedTap = {
        ...tapPayload,
        valor_projeto: toNum(tapPayload.valor_projeto),
        receita_atual: toNum(tapPayload.receita_atual),
        margem_venda_percent: toNum(tapPayload.margem_venda_percent),
        margem_atual_percent: toNum(tapPayload.margem_atual_percent),
        margem_venda_valor: toNum(tapPayload.margem_venda_valor),
        margem_atual_valor: toNum(tapPayload.margem_atual_valor),
        mrr: toNum(tapPayload.mrr),
        investimento_perdas: toNum(tapPayload.investimento_perdas),
        mrr_total: toNum(tapPayload.mrr_total),
        investimento_comercial: toNum(tapPayload.investimento_comercial),
        psa_planejado: toNum(tapPayload.psa_planejado),
        investimento_erro_produto: toNum(tapPayload.investimento_erro_produto),
        diferenca_psa_projeto: toNum(tapPayload.diferenca_psa_projeto),
        duracao_pos_producao: toInt(tapPayload.duracao_pos_producao),
        projeto_em_perda: !!tapPayload.projeto_em_perda,
        data: toDate(tapPayload.data),
        data_inicio: toDate(tapPayload.data_inicio),
        go_live_previsto: toDate(tapPayload.go_live_previsto),
        encerramento: toDate(tapPayload.encerramento),
      };

      console.log('[useTAP] TAP payload (sanitized)', sanitizedTap);

      const { data, error } = await supabase
        .from('tap')
        .insert({
          ...sanitizedTap,
          project_id: newProject.id,
          user_id: user.id,
        })
        .select()
        .single();
      console.log('[useTAP] TAP insert response', { data, error });

      if (error) {
        console.error('Erro ao criar TAP:', error);
        toast({
          title: "Erro ao criar TAP",
          description: (error as any)?.message || "Falha ao criar TAP.",
          variant: "destructive",
        });
        return null;
      }

      setTap(data as TAP);
      toast({
        title: "Sucesso",
        description: "TAP e projeto criados com sucesso!",
      });
      return data as TAP;
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

      setTap(data as TAP);
      toast({
        title: "Sucesso",
        description: "TAP atualizado com sucesso!",
      });
      return data as TAP;
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