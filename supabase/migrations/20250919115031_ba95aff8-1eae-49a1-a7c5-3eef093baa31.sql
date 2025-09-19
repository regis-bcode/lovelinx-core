-- Criar tabela de tipos de usuários
CREATE TABLE public.user_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo TEXT NOT NULL UNIQUE,
  descricao TEXT NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.user_types ENABLE ROW LEVEL SECURITY;

-- Criar políticas para user_types
CREATE POLICY "Authenticated users can view user types" 
ON public.user_types 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create user types" 
ON public.user_types 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update user types" 
ON public.user_types 
FOR UPDATE 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete user types" 
ON public.user_types 
FOR DELETE 
USING (auth.uid() IS NOT NULL);

-- Inserir tipos de usuários existentes + Vendedor
INSERT INTO public.user_types (codigo, descricao) VALUES
  ('cliente', 'Cliente'),
  ('analista', 'Analista'),
  ('gerente_projetos', 'Gerente de Projetos'),
  ('gerente_portfolio', 'Gerente de Portfólio'),
  ('coordenador_consultoria', 'Coordenador do Projeto (Consultoria)'),
  ('gerente_cliente', 'Gerente do Projeto (Cliente)'),
  ('arquiteto', 'Arquiteto'),
  ('sponsor', 'Sponsor'),
  ('vendedor', 'Vendedor');

-- Criar tabela de produtos
CREATE TABLE public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  id_produto TEXT NOT NULL UNIQUE,
  descricao TEXT NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT true,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS para products
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Criar políticas para products
CREATE POLICY "Users can view all products" 
ON public.products 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can create their own products" 
ON public.products 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own products" 
ON public.products 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own products" 
ON public.products 
FOR DELETE 
USING (auth.uid() = user_id);

-- Inserir produtos padrão (será inserido pelo primeiro usuário que acessar)
-- Os produtos serão inseridos via código para associar ao user_id correto

-- Adicionar campo user_type_id na tabela users
ALTER TABLE public.users ADD COLUMN user_type_id UUID REFERENCES public.user_types(id);

-- Atualizar usuários existentes para referenciar os novos tipos
UPDATE public.users SET user_type_id = (
  SELECT id FROM public.user_types WHERE codigo = users.tipo_usuario::text
);

-- Criar trigger para atualizar updated_at em user_types
CREATE TRIGGER update_user_types_updated_at
BEFORE UPDATE ON public.user_types
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Criar trigger para atualizar updated_at em products
CREATE TRIGGER update_products_updated_at
BEFORE UPDATE ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();