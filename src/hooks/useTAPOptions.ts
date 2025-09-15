import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface TAPOption {
  id: string;
  user_id: string;
  option_type: 'gpp' | 'produto' | 'arquiteto' | 'coordenador' | 'gerente_projeto' | 'esn';
  option_value: string;
  created_at: string;
  updated_at: string;
}

export function useTAPOptions() {
  const [gppOptions, setGppOptions] = useState<string[]>([]);
  const [produtoOptions, setProdutoOptions] = useState<string[]>([]);
  const [arquitetoOptions, setArquitetoOptions] = useState<string[]>([]);
  const [coordenadorOptions, setCoordenadorOptions] = useState<string[]>([]);
  const [gerenteProjetoOptions, setGerenteProjetoOptions] = useState<string[]>([]);
  const [esnOptions, setEsnOptions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadOptions = async () => {
    setLoading(true);
    try {
      const { data: options, error } = await supabase
        .from('tap_options')
        .select('*')
        .order('option_type', { ascending: true })
        .order('option_value', { ascending: true });

      if (error) {
        console.error('Erro ao carregar opções TAP:', error);
        // Se ainda não existem opções, criar algumas padrão
        if (error.code === 'PGRST116') {
          await createDefaultOptions();
          return;
        }
        throw error;
      }

      // Organizar opções por tipo
      const optionsByType = (options || []).reduce((acc: Record<string, string[]>, option: TAPOption) => {
        if (!acc[option.option_type]) {
          acc[option.option_type] = [];
        }
        acc[option.option_type].push(option.option_value);
        return acc;
      }, {});

      setGppOptions(optionsByType.gpp || []);
      setProdutoOptions(optionsByType.produto || []);
      setArquitetoOptions(optionsByType.arquiteto || []);
      setCoordenadorOptions(optionsByType.coordenador || []);
      setGerenteProjetoOptions(optionsByType.gerente_projeto || []);
      setEsnOptions(optionsByType.esn || []);

    } catch (error) {
      console.error('Erro ao carregar opções TAP:', error);
      // Fallback para opções padrão se houver erro
      await createDefaultOptions();
    } finally {
      setLoading(false);
    }
  };

  const createDefaultOptions = async () => {
    const defaultOptions = [
      { option_type: 'gpp', option_value: 'GPP 1' },
      { option_type: 'gpp', option_value: 'GPP 2' },
      { option_type: 'produto', option_value: 'Produto A' },
      { option_type: 'produto', option_value: 'Produto B' },
      { option_type: 'arquiteto', option_value: 'Arquiteto 1' },
      { option_type: 'arquiteto', option_value: 'Arquiteto 2' },
      { option_type: 'coordenador', option_value: 'Coordenador 1' },
      { option_type: 'coordenador', option_value: 'Coordenador 2' },
      { option_type: 'gerente_projeto', option_value: 'Gerente A' },
      { option_type: 'gerente_projeto', option_value: 'Gerente B' },
      { option_type: 'esn', option_value: 'ESN 1' },
      { option_type: 'esn', option_value: 'ESN 2' },
    ];

    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const optionsToInsert = defaultOptions.map(option => ({
        ...option,
        user_id: user.user.id
      }));

      const { error } = await supabase
        .from('tap_options')
        .insert(optionsToInsert);

      if (error) {
        console.error('Erro ao criar opções padrão:', error);
      } else {
        // Recarregar opções após criar as padrão
        await loadOptions();
      }
    } catch (error) {
      console.error('Erro ao criar opções padrão:', error);
      // Definir opções locais como fallback
      setGppOptions(['GPP 1', 'GPP 2']);
      setProdutoOptions(['Produto A', 'Produto B']);
      setArquitetoOptions(['Arquiteto 1', 'Arquiteto 2']);
      setCoordenadorOptions(['Coordenador 1', 'Coordenador 2']);
      setGerenteProjetoOptions(['Gerente A', 'Gerente B']);
      setEsnOptions(['ESN 1', 'ESN 2']);
      setLoading(false);
    }
  };

  const addOption = async (optionType: 'gpp' | 'produto' | 'arquiteto' | 'coordenador' | 'gerente_projeto' | 'esn', optionValue: string) => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        toast({
          title: "Erro",
          description: "Você precisa estar logado para adicionar opções.",
          variant: "destructive",
        });
        return false;
      }

      const { error } = await supabase
        .from('tap_options')
        .insert({
          user_id: user.user.id,
          option_type: optionType,
          option_value: optionValue
        });

      if (error) {
        // Se for erro de duplicata, ignorar silenciosamente
        if (error.code === '23505') {
          return true; // Opção já existe, considerar como sucesso
        }
        throw error;
      }

      // Atualizar o estado local
      const updateOptions = (setter: React.Dispatch<React.SetStateAction<string[]>>) => {
        setter(prev => {
          if (!prev.includes(optionValue)) {
            return [...prev, optionValue].sort();
          }
          return prev;
        });
      };

      switch (optionType) {
        case 'gpp':
          updateOptions(setGppOptions);
          break;
        case 'produto':
          updateOptions(setProdutoOptions);
          break;
        case 'arquiteto':
          updateOptions(setArquitetoOptions);
          break;
        case 'coordenador':
          updateOptions(setCoordenadorOptions);
          break;
        case 'gerente_projeto':
          updateOptions(setGerenteProjetoOptions);
          break;
        case 'esn':
          updateOptions(setEsnOptions);
          break;
      }

      return true;
    } catch (error) {
      console.error('Erro ao adicionar opção:', error);
      toast({
        title: "Erro",
        description: `Erro ao adicionar ${optionType}. Tente novamente.`,
        variant: "destructive",
      });
      return false;
    }
  };

  useEffect(() => {
    loadOptions();
  }, []);

  return {
    gppOptions,
    produtoOptions,
    arquitetoOptions,
    coordenadorOptions,
    gerenteProjetoOptions,
    esnOptions,
    loading,
    addOption,
    refreshOptions: loadOptions,
  };
}