import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export type UserType = 
  | 'cliente'
  | 'analista'
  | 'gerente_projetos'
  | 'gerente_portfolio'
  | 'coordenador_consultoria'
  | 'gerente_cliente'
  | 'arquiteto'
  | 'sponsor'
  | 'vendedor';

export type ProfileType = 'visualizador' | 'editor' | 'administrador';

export interface User {
  id: string;
  user_id: string;
  cpf: string;
  nome_completo: string;
  email: string;
  telefone: string;
  tipo_usuario: UserType;
  tipo_perfil: ProfileType;
  ativo: boolean;
  observacoes?: string;
  client_id?: string;
  horas_diarias_aprovadas?: number;
  client?: {
    id: string;
    nome: string;
    cod_int_cli: string;
  };
  created_at: string;
  updated_at: string;
}

export interface CreateUserData {
  cpf: string;
  nome_completo: string;
  email: string;
  telefone: string;
  tipo_usuario: UserType;
  tipo_perfil: ProfileType;
  client_id?: string;
  observacoes?: string;
  horas_diarias_aprovadas?: number;
}

export const useUsers = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const {
    data: users = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("users")
        .select(`
          *,
          client:clients(
            id,
            nome,
            cod_int_cli
          )
        `)
        .order("nome_completo");
      
      if (error) throw error;
      return data as User[];
    },
  });

  const createUserMutation = useMutation({
    mutationFn: async (userData: CreateUserData) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase
        .from("users")
        .insert({
          ...userData,
          user_id: user.id,
          tipo_usuario: userData.tipo_usuario as any, // Casting temporário
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast({
        title: "Usuário criado com sucesso!",
        description: "O usuário foi cadastrado no sistema.",
      });
    },
    onError: (error: any) => {
      console.error("Erro ao criar usuário:", error);
      toast({
        title: "Erro ao criar usuário",
        description: error.message || "Não foi possível criar o usuário.",
        variant: "destructive",
      });
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<CreateUserData> }) => {
      const updateData: any = { ...updates };
      if (updateData.tipo_usuario) {
        updateData.tipo_usuario = updateData.tipo_usuario as any; // Casting temporário
      }
      
      const { data, error } = await supabase
        .from("users")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast({
        title: "Usuário atualizado com sucesso!",
        description: "As informações do usuário foram atualizadas.",
      });
    },
    onError: (error: any) => {
      console.error("Erro ao atualizar usuário:", error);
      toast({
        title: "Erro ao atualizar usuário",
        description: error.message || "Não foi possível atualizar o usuário.",
        variant: "destructive",
      });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("users")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast({
        title: "Usuário excluído com sucesso!",
        description: "O usuário foi removido do sistema.",
      });
    },
    onError: (error: any) => {
      console.error("Erro ao excluir usuário:", error);
      toast({
        title: "Erro ao excluir usuário",
        description: error.message || "Não foi possível excluir o usuário.",
        variant: "destructive",
      });
    },
  });

  const toggleUserStatusMutation = useMutation({
    mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }) => {
      const { data, error } = await supabase
        .from("users")
        .update({ ativo })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast({
        title: "Status do usuário atualizado!",
        description: "O status do usuário foi alterado com sucesso.",
      });
    },
    onError: (error: any) => {
      console.error("Erro ao alterar status do usuário:", error);
      toast({
        title: "Erro ao alterar status",
        description: error.message || "Não foi possível alterar o status do usuário.",
        variant: "destructive",
      });
    },
  });

  return {
    users,
    isLoading,
    error,
    createUser: createUserMutation.mutate,
    updateUser: updateUserMutation.mutate,
    deleteUser: deleteUserMutation.mutate,
    toggleUserStatus: toggleUserStatusMutation.mutate,
    isCreating: createUserMutation.isPending,
    isUpdating: updateUserMutation.isPending,
    isDeleting: deleteUserMutation.isPending,
  };
};