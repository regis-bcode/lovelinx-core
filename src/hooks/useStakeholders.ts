import { useState, useEffect } from 'react';
import { Stakeholder, StakeholderFormData } from '@/types/stakeholder';
import { supabase } from '@/integrations/supabase/client';

export function useStakeholders(projectId: string) {
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStakeholders();
  }, [projectId]);

  const loadStakeholders = async () => {
    try {
      const { data, error } = await supabase
        .from('stakeholders')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setStakeholders(data || []);
    } catch (error) {
      console.error('Erro ao carregar stakeholders:', error);
    } finally {
      setLoading(false);
    }
  };

  const createStakeholder = async (data: StakeholderFormData): Promise<Stakeholder | null> => {
    try {
      const { data: newStakeholder, error } = await supabase
        .from('stakeholders')
        .insert([data])
        .select()
        .single();

      if (error) throw error;
      
      setStakeholders(prev => [newStakeholder, ...prev]);
      return newStakeholder;
    } catch (error) {
      console.error('Erro ao criar stakeholder:', error);
      return null;
    }
  };

  const updateStakeholder = async (id: string, data: Partial<StakeholderFormData>): Promise<Stakeholder | null> => {
    try {
      const { data: updatedStakeholder, error } = await supabase
        .from('stakeholders')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      setStakeholders(prev => 
        prev.map(s => s.id === id ? updatedStakeholder : s)
      );
      return updatedStakeholder;
    } catch (error) {
      console.error('Erro ao atualizar stakeholder:', error);
      return null;
    }
  };

  const deleteStakeholder = async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('stakeholders')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setStakeholders(prev => prev.filter(s => s.id !== id));
      return true;
    } catch (error) {
      console.error('Erro ao excluir stakeholder:', error);
      return false;
    }
  };

  return {
    stakeholders,
    loading,
    createStakeholder,
    updateStakeholder,
    deleteStakeholder,
  };
}