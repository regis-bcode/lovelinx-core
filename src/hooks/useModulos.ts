import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Modulo } from '@/types/modulo';
import { useToast } from '@/hooks/use-toast';

const INITIAL_MODULOS = [
  'Compras',
  'Contratos',
  'Financeiro',
  'Fiscal',
  'Gestão de Estoque',
  'Gestão de Compras',
  'Faturamento',
  'Gestão Patrimonial',
  'RH - Gestão de Pessoas',
  'RH - Ponto',
  'Atendimento',
  'Centro Cirúrgico',
  'Cuidados com paciente',
  'Farmácia',
  'PEP RM',
  'Unidade de diagnóstico',
  'Coligadas e filiais',
  'Usuários e perfis',
  'SUS',
  'Tesouraria',
  'Apoio',
  'Customização',
  'Gestão',
  'Go-Global',
  'T-Cloud'
];

export const useModulos = () => {
  const [modulos, setModulos] = useState<Modulo[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const loadModulos = async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('modulos')
        .select('*')
        .eq('user_id', user.id)
        .eq('ativo', true)
        .order('nome');

      if (error) throw error;

      // Bootstrap: se não houver módulos, criar os iniciais
      if (!data || data.length === 0) {
        await bootstrapModulos();
        return;
      }

      setModulos(data as Modulo[]);
    } catch (error) {
      console.error('Erro ao carregar módulos:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os módulos.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const bootstrapModulos = async () => {
    if (!user?.id) return;

    try {
      const modulosData = INITIAL_MODULOS.map(nome => ({
        user_id: user.id,
        nome,
        ativo: true,
      }));

      const { error } = await supabase.from('modulos').insert(modulosData);

      if (error) throw error;

      await loadModulos();
    } catch (error) {
      console.error('Erro ao criar módulos iniciais:', error);
    }
  };

  const createModulo = async (nome: string): Promise<Modulo | null> => {
    if (!user?.id) return null;

    try {
      const { data, error } = await supabase
        .from('modulos')
        .insert({ user_id: user.id, nome, ativo: true })
        .select()
        .single();

      if (error) throw error;

      setModulos(prev => [...prev, data as Modulo]);
      
      toast({
        title: 'Módulo criado',
        description: `Módulo "${nome}" foi criado com sucesso.`,
      });

      return data as Modulo;
    } catch (error) {
      console.error('Erro ao criar módulo:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível criar o módulo.',
        variant: 'destructive',
      });
      return null;
    }
  };

  useEffect(() => {
    loadModulos();
  }, [user?.id]);

  return {
    modulos,
    loading,
    createModulo,
    refreshModulos: loadModulos,
  };
};
