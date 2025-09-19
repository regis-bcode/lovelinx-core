import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { UserType, CreateUserTypeData } from '@/types/user-type';
import { useToast } from '@/hooks/use-toast';

export function useUserTypes() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: userTypes, isLoading, error } = useQuery({
    queryKey: ['user-types'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_types')
        .select('*')
        .eq('ativo', true)
        .order('descricao');
      
      if (error) throw error;
      return data as UserType[];
    }
  });

  const createUserType = useMutation({
    mutationFn: async (userData: CreateUserTypeData) => {
      const { data, error } = await supabase
        .from('user_types')
        .insert([userData])
        .select()
        .single();
      
      if (error) throw error;
      return data as UserType;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-types'] });
      toast({
        title: "Sucesso!",
        description: "Tipo de usuário criado com sucesso."
      });
    },
    onError: (error: any) => {
      console.error('Erro ao criar tipo de usuário:', error);
      toast({
        title: "Erro",
        description: "Erro ao criar tipo de usuário.",
        variant: "destructive"
      });
    }
  });

  const updateUserType = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CreateUserTypeData> }) => {
      const { data: result, error } = await supabase
        .from('user_types')
        .update(data)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return result as UserType;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-types'] });
      toast({
        title: "Sucesso!",
        description: "Tipo de usuário atualizado com sucesso."
      });
    },
    onError: (error: any) => {
      console.error('Erro ao atualizar tipo de usuário:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar tipo de usuário.",
        variant: "destructive"
      });
    }
  });

  const deleteUserType = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('user_types')
        .update({ ativo: false })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-types'] });
      toast({
        title: "Sucesso!",
        description: "Tipo de usuário removido com sucesso."
      });
    },
    onError: (error: any) => {
      console.error('Erro ao remover tipo de usuário:', error);
      toast({
        title: "Erro",
        description: "Erro ao remover tipo de usuário.",
        variant: "destructive"
      });
    }
  });

  return {
    userTypes,
    isLoading,
    error,
    createUserType: createUserType.mutateAsync,
    updateUserType: updateUserType.mutateAsync,
    deleteUserType: deleteUserType.mutateAsync,
    isCreating: createUserType.isPending,
    isUpdating: updateUserType.isPending,
    isDeleting: deleteUserType.isPending
  };
}