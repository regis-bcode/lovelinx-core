import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Product, CreateProductData } from '@/types/product';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export function useProducts() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  const { data: products, isLoading, error } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('ativo', true)
        .order('descricao');
      
      if (error) throw error;
      return data as Product[];
    }
  });

  const createProduct = useMutation({
    mutationFn: async (productData: CreateProductData) => {
      if (!user) throw new Error('Usuário não autenticado');
      
      const { data, error } = await supabase
        .from('products')
        .insert([{
          ...productData,
          user_id: user.id
        }])
        .select()
        .single();
      
      if (error) throw error;
      return data as Product;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast({
        title: "Sucesso!",
        description: "Produto criado com sucesso."
      });
    },
    onError: (error: any) => {
      console.error('Erro ao criar produto:', error);
      toast({
        title: "Erro",
        description: "Erro ao criar produto.",
        variant: "destructive"
      });
    }
  });

  const updateProduct = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CreateProductData> }) => {
      const { data: result, error } = await supabase
        .from('products')
        .update(data)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return result as Product;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast({
        title: "Sucesso!",
        description: "Produto atualizado com sucesso."
      });
    },
    onError: (error: any) => {
      console.error('Erro ao atualizar produto:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar produto.",
        variant: "destructive"
      });
    }
  });

  const deleteProduct = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('products')
        .update({ ativo: false })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast({
        title: "Sucesso!",
        description: "Produto removido com sucesso."
      });
    },
    onError: (error: any) => {
      console.error('Erro ao remover produto:', error);
      toast({
        title: "Erro",
        description: "Erro ao remover produto.",
        variant: "destructive"
      });
    }
  });

  // Função para inserir produtos padrão se não existirem
  const ensureDefaultProducts = async () => {
    if (!user || !products || products.length > 0) return;

    const defaultProducts = [
      { id_produto: 'folha', descricao: 'Folha' },
      { id_produto: 'ponto', descricao: 'Ponto' },
      { id_produto: 'meurh', descricao: 'Meu RH' },
      { id_produto: 'saude', descricao: 'Saúde' },
      { id_produto: 'backoffice', descricao: 'Backoffice' },
      { id_produto: 'educacional', descricao: 'Educacional' },
    ];

    for (const product of defaultProducts) {
      try {
        await createProduct.mutateAsync(product);
      } catch (error) {
        console.error('Erro ao criar produto padrão:', error);
      }
    }
  };

  return {
    products,
    isLoading,
    error,
    createProduct: createProduct.mutateAsync,
    updateProduct: updateProduct.mutateAsync,
    deleteProduct: deleteProduct.mutateAsync,
    isCreating: createProduct.isPending,
    isUpdating: updateProduct.isPending,
    isDeleting: deleteProduct.isPending,
    ensureDefaultProducts
  };
}