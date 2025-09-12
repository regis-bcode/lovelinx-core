import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { TAP, TAPFormData } from '@/types/tap';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export function useTAP(projectId?: string) {
  const [tap, setTap] = useState<TAP | null>(null);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (projectId && user) {
      loadTAP();
    }
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

      setTap(data as TAP);
    } catch (error) {
      console.error('Erro ao carregar TAP:', error);
    } finally {
      setLoading(false);
    }
  };

  const createTAP = async (tapData: TAPFormData): Promise<TAP | null> => {
    if (!user) {
      toast({
        title: "Erro",
        description: "Usuário não autenticado.",
        variant: "destructive",
      });
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('tap')
        .insert({
          ...tapData,
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

      setTap(data as TAP);
      toast({
        title: "Sucesso",
        description: "TAP criado com sucesso!",
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