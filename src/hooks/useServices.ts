import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CreateServiceData, Service, ServiceWithProduct } from '@/types/service';
import { useToast } from '@/hooks/use-toast';

export function useServices() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch services with product information
  const { data: services, isLoading, error } = useQuery({
    queryKey: ['services'],
    queryFn: async (): Promise<ServiceWithProduct[]> => {
      const { data, error } = await supabase
        .from('services')
        .select(`
          *,
          products!fk_services_produto (
            descricao
          )
        `)
        .eq('ativo', true)
        .order('descricao');

      if (error) throw error;
      return data || [];
    },
  });

  // Create service mutation
  const createServiceMutation = useMutation({
    mutationFn: async (serviceData: CreateServiceData): Promise<Service> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase
        .from('services')
        .insert({
          ...serviceData,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
      toast({
        title: "Sucesso!",
        description: "Serviço criado com sucesso.",
      });
    },
    onError: (error: any) => {
      console.error('Erro ao criar serviço:', error);
      toast({
        title: "Erro",
        description: "Erro ao criar serviço.",
        variant: "destructive",
      });
    },
  });

  // Update service mutation
  const updateServiceMutation = useMutation({
    mutationFn: async ({ id, serviceData }: { id: string; serviceData: Partial<CreateServiceData> }): Promise<Service> => {
      const { data, error } = await supabase
        .from('services')
        .update(serviceData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
      toast({
        title: "Sucesso!",
        description: "Serviço atualizado com sucesso.",
      });
    },
    onError: (error: any) => {
      console.error('Erro ao atualizar serviço:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar serviço.",
        variant: "destructive",
      });
    },
  });

  // Delete service mutation (soft delete)
  const deleteServiceMutation = useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase
        .from('services')
        .update({ ativo: false })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
      toast({
        title: "Sucesso!",
        description: "Serviço excluído com sucesso.",
      });
    },
    onError: (error: any) => {
      console.error('Erro ao excluir serviço:', error);
      toast({
        title: "Erro",
        description: "Erro ao excluir serviço.",
        variant: "destructive",
      });
    },
  });

  return {
    services,
    isLoading,
    error,
    createService: createServiceMutation.mutateAsync,
    updateService: updateServiceMutation.mutateAsync,
    deleteService: deleteServiceMutation.mutateAsync,
    isCreating: createServiceMutation.isPending,
    isUpdating: updateServiceMutation.isPending,
    isDeleting: deleteServiceMutation.isPending,
  };
}