import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Area } from '@/types/area';
import { useToast } from '@/hooks/use-toast';

const INITIAL_AREAS = [
  'Adminstrativo',
  'TI',
  'Compras',
  'Estoque',
  'Recepção',
  'Departamento Cirúrgico',
  'Tesouraria',
  'Contas a Receber',
  'Contas a Pagar'
];

export const useAreas = () => {
  const [areas, setAreas] = useState<Area[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const loadAreas = async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('areas')
        .select('*')
        .eq('user_id', user.id)
        .eq('ativo', true)
        .order('nome');

      if (error) throw error;

      // Bootstrap: se não houver áreas, criar as iniciais
      if (!data || data.length === 0) {
        await bootstrapAreas();
        return;
      }

      setAreas(data as Area[]);
    } catch (error) {
      console.error('Erro ao carregar áreas:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as áreas.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const bootstrapAreas = async () => {
    if (!user?.id) return;

    try {
      const areasData = INITIAL_AREAS.map(nome => ({
        user_id: user.id,
        nome,
        ativo: true,
      }));

      const { error } = await supabase.from('areas').insert(areasData);

      if (error) throw error;

      await loadAreas();
    } catch (error) {
      console.error('Erro ao criar áreas iniciais:', error);
    }
  };

  const createArea = async (nome: string): Promise<Area | null> => {
    if (!user?.id) return null;

    try {
      const { data, error } = await supabase
        .from('areas')
        .insert({ user_id: user.id, nome, ativo: true })
        .select()
        .single();

      if (error) throw error;

      setAreas(prev => [...prev, data as Area]);
      
      toast({
        title: 'Área criada',
        description: `Área "${nome}" foi criada com sucesso.`,
      });

      return data as Area;
    } catch (error) {
      console.error('Erro ao criar área:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível criar a área.',
        variant: 'destructive',
      });
      return null;
    }
  };

  useEffect(() => {
    loadAreas();
  }, [user?.id]);

  return {
    areas,
    loading,
    createArea,
    refreshAreas: loadAreas,
  };
};
