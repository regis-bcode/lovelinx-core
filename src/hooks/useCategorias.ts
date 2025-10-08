import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Categoria } from '@/types/categoria';
import { useToast } from '@/hooks/use-toast';

const INITIAL_CATEGORIAS = [
  'Chamado TOTVS',
  'Melhoria',
  'Formulário',
  'Alteração de Processos',
  'Integração',
  'Desenvolvimento'
];

export const useCategorias = () => {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const loadCategorias = async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('categorias')
        .select('*')
        .eq('user_id', user.id)
        .eq('ativo', true)
        .order('nome');

      if (error) throw error;

      // Bootstrap: se não houver categorias, criar as iniciais
      if (!data || data.length === 0) {
        await bootstrapCategorias();
        return;
      }

      setCategorias(data as Categoria[]);
    } catch (error) {
      console.error('Erro ao carregar categorias:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as categorias.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const bootstrapCategorias = async () => {
    if (!user?.id) return;

    try {
      const categoriasData = INITIAL_CATEGORIAS.map(nome => ({
        user_id: user.id,
        nome,
        ativo: true,
      }));

      const { error } = await supabase.from('categorias').insert(categoriasData);

      if (error) throw error;

      await loadCategorias();
    } catch (error) {
      console.error('Erro ao criar categorias iniciais:', error);
    }
  };

  const createCategoria = async (nome: string): Promise<Categoria | null> => {
    if (!user?.id) return null;

    try {
      const { data, error } = await supabase
        .from('categorias')
        .insert({ user_id: user.id, nome, ativo: true })
        .select()
        .single();

      if (error) throw error;

      setCategorias(prev => [...prev, data as Categoria]);
      
      toast({
        title: 'Categoria criada',
        description: `Categoria "${nome}" foi criada com sucesso.`,
      });

      return data as Categoria;
    } catch (error) {
      console.error('Erro ao criar categoria:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível criar a categoria.',
        variant: 'destructive',
      });
      return null;
    }
  };

  useEffect(() => {
    loadCategorias();
  }, [user?.id]);

  return {
    categorias,
    loading,
    createCategoria,
    refreshCategorias: loadCategorias,
  };
};
