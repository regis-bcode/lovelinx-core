import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { ProjectAllocation, ProjectAllocationWithDetails, ProjectAllocationFormData } from '@/types/project-allocation';

export function useProjectAllocations(projectId?: string, tapId?: string) {
  const [allocations, setAllocations] = useState<ProjectAllocationWithDetails[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!user) return;
    loadAllocations();

    const channel = supabase
      .channel(`allocations-realtime`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'project_allocations' 
      }, () => loadAllocations())
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'project_allocations' 
      }, () => loadAllocations())
      .on('postgres_changes', { 
        event: 'DELETE', 
        schema: 'public', 
        table: 'project_allocations' 
      }, () => loadAllocations())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, projectId, tapId]);

  const loadAllocations = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      let query = supabase
        .from('project_allocations')
        .select(`
          *,
          projects!project_allocations_project_id_fkey(nome_projeto, cliente),
          tap!project_allocations_tap_id_fkey(nome_projeto),
          users!project_allocations_allocated_user_id_fkey(id, nome_completo, email, client_id)
        `)
        .order('created_at', { ascending: false });

      // Filtrar por projeto se especificado
      if (projectId) {
        query = query.eq('project_id', projectId);
      }

      // Filtrar por TAP se especificado
      if (tapId) {
        query = query.eq('tap_id', tapId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Erro ao carregar alocações:', error);
        toast({
          title: "Erro",
          description: "Erro ao carregar alocações de equipe",
          variant: "destructive",
        });
        return;
      }

      // Buscar informações dos clientes
      const allocationsWithClients = await Promise.all(
        (data || []).map(async (allocation: any) => {
          if (allocation.users?.client_id) {
            const { data: clientData } = await supabase
              .from('clients')
              .select('nome')
              .eq('id', allocation.users.client_id)
              .single();
            
            return {
              ...allocation,
              project: allocation.projects,
              tap: allocation.tap,
              user: allocation.users,
              client: clientData
            };
          }
          return {
            ...allocation,
            project: allocation.projects,
            tap: allocation.tap,
            user: allocation.users
          };
        })
      );

      setAllocations(allocationsWithClients);
    } catch (error) {
      console.error('Erro ao carregar alocações:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar alocações de equipe",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createAllocation = async (allocationData: ProjectAllocationFormData): Promise<ProjectAllocation | null> => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('project_allocations')
        .insert({
          ...allocationData,
        })
        .select()
        .single();

      if (error) {
        console.error('Erro ao criar alocação:', error);
        toast({
          title: "Erro",
          description: error.message || "Erro ao criar alocação de equipe",
          variant: "destructive",
        });
        return null;
      }

      toast({
        title: "Sucesso",
        description: "Membro alocado com sucesso",
      });

      loadAllocations();
      return data as ProjectAllocation;
    } catch (error) {
      console.error('Erro ao criar alocação:', error);
      toast({
        title: "Erro",
        description: "Erro ao criar alocação de equipe",
        variant: "destructive",
      });
      return null;
    }
  };

  const updateAllocation = async (id: string, allocationData: Partial<ProjectAllocationFormData>): Promise<ProjectAllocation | null> => {
    try {
      const { data, error } = await supabase
        .from('project_allocations')
        .update(allocationData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Erro ao atualizar alocação:', error);
        toast({
          title: "Erro",
          description: "Erro ao atualizar alocação de equipe",
          variant: "destructive",
        });
        return null;
      }

      toast({
        title: "Sucesso",
        description: "Alocação atualizada com sucesso",
      });

      loadAllocations();
      return data as ProjectAllocation;
    } catch (error) {
      console.error('Erro ao atualizar alocação:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar alocação de equipe",
        variant: "destructive",
      });
      return null;
    }
  };

  const deleteAllocation = async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('project_allocations')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Erro ao deletar alocação:', error);
        toast({
          title: "Erro",
          description: "Erro ao deletar alocação de equipe",
          variant: "destructive",
        });
        return false;
      }

      toast({
        title: "Sucesso",
        description: "Alocação deletada com sucesso",
      });

      loadAllocations();
      return true;
    } catch (error) {
      console.error('Erro ao deletar alocação:', error);
      toast({
        title: "Erro",
        description: "Erro ao deletar alocação de equipe",
        variant: "destructive",
      });
      return false;
    }
  };

  return {
    allocations,
    loading,
    createAllocation,
    updateAllocation,
    deleteAllocation,
    refreshAllocations: loadAllocations,
  };
}
