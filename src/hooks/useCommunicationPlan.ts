import { useState, useEffect } from 'react';
import { CommunicationPlan, CommunicationPlanFormData } from '@/types/communication-plan';
import { supabase } from '@/integrations/supabase/client';

export function useCommunicationPlan(projectId: string) {
  const [communicationPlans, setCommunicationPlans] = useState<CommunicationPlan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projectId) return;
    loadCommunicationPlans();

    const channel = supabase
      .channel(`communication-plan-realtime-${projectId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'communication_plan', filter: `project_id=eq.${projectId}` }, (payload) => {
        const plan = payload.new as CommunicationPlan;
        setCommunicationPlans((prev) => [plan, ...prev.filter((p) => p.id !== plan.id)]);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'communication_plan', filter: `project_id=eq.${projectId}` }, (payload) => {
        const plan = payload.new as CommunicationPlan;
        setCommunicationPlans((prev) => prev.map((p) => (p.id === plan.id ? plan : p)));
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'communication_plan', filter: `project_id=eq.${projectId}` }, (payload) => {
        const planId = payload.old.id;
        setCommunicationPlans((prev) => prev.filter((p) => p.id !== planId));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId]);

  const loadCommunicationPlans = async () => {
    try {
      const { data, error } = await supabase
        .from('communication_plan')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCommunicationPlans(data || []);
    } catch (error) {
      console.error('Erro ao carregar planos de comunicação:', error);
    } finally {
      setLoading(false);
    }
  };

  const createCommunicationPlan = async (data: CommunicationPlanFormData): Promise<CommunicationPlan | null> => {
    try {
      const { data: newPlan, error } = await supabase
        .from('communication_plan')
        .insert([data])
        .select()
        .single();

      if (error) throw error;
      
      setCommunicationPlans(prev => [newPlan, ...prev]);
      return newPlan;
    } catch (error) {
      console.error('Erro ao criar plano de comunicação:', error);
      return null;
    }
  };

  const updateCommunicationPlan = async (id: string, data: Partial<CommunicationPlanFormData>): Promise<CommunicationPlan | null> => {
    try {
      const { data: updatedPlan, error } = await supabase
        .from('communication_plan')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      setCommunicationPlans(prev => 
        prev.map(p => p.id === id ? updatedPlan : p)
      );
      return updatedPlan;
    } catch (error) {
      console.error('Erro ao atualizar plano de comunicação:', error);
      return null;
    }
  };

  const deleteCommunicationPlan = async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('communication_plan')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setCommunicationPlans(prev => prev.filter(p => p.id !== id));
      return true;
    } catch (error) {
      console.error('Erro ao excluir plano de comunicação:', error);
      return false;
    }
  };

  return {
    communicationPlans,
    loading,
    createCommunicationPlan,
    updateCommunicationPlan,
    deleteCommunicationPlan,
  };
}