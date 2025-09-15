-- Criar tabela para gerenciar as opções das listas suspensas do TAP
CREATE TABLE public.tap_options (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  option_type TEXT NOT NULL CHECK (option_type IN ('gpp', 'produto', 'arquiteto', 'coordenador', 'gerente_projeto', 'esn')),
  option_value TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, option_type, option_value)
);

-- Habilitar RLS na tabela tap_options
ALTER TABLE public.tap_options ENABLE ROW LEVEL SECURITY;

-- Política para visualizar as próprias opções
CREATE POLICY "Users can view their own TAP options" 
ON public.tap_options 
FOR SELECT 
USING (user_id = auth.uid());

-- Política para criar suas próprias opções
CREATE POLICY "Users can create their own TAP options" 
ON public.tap_options 
FOR INSERT 
WITH CHECK (user_id = auth.uid());

-- Política para atualizar suas próprias opções
CREATE POLICY "Users can update their own TAP options" 
ON public.tap_options 
FOR UPDATE 
USING (user_id = auth.uid());

-- Política para deletar suas próprias opções
CREATE POLICY "Users can delete their own TAP options" 
ON public.tap_options 
FOR DELETE 
USING (user_id = auth.uid());

-- Trigger para atualizar updated_at
CREATE TRIGGER update_tap_options_updated_at
BEFORE UPDATE ON public.tap_options
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Inserir algumas opções padrão (serão vinculadas ao usuário quando ele criar pela primeira vez)
-- Nota: Como não temos um user_id específico, vamos inserir via código quando necessário