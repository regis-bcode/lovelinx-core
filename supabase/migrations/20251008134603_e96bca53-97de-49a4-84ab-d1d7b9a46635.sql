-- Criar tabela de módulos
CREATE TABLE public.modulos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  nome TEXT NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.modulos ENABLE ROW LEVEL SECURITY;

-- RLS Policies para módulos
CREATE POLICY "Users can view their own modulos"
ON public.modulos FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own modulos"
ON public.modulos FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own modulos"
ON public.modulos FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own modulos"
ON public.modulos FOR DELETE
USING (auth.uid() = user_id);

-- Trigger para updated_at
CREATE TRIGGER update_modulos_updated_at
BEFORE UPDATE ON public.modulos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Criar tabela de áreas
CREATE TABLE public.areas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  nome TEXT NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.areas ENABLE ROW LEVEL SECURITY;

-- RLS Policies para áreas
CREATE POLICY "Users can view their own areas"
ON public.areas FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own areas"
ON public.areas FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own areas"
ON public.areas FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own areas"
ON public.areas FOR DELETE
USING (auth.uid() = user_id);

-- Trigger para updated_at
CREATE TRIGGER update_areas_updated_at
BEFORE UPDATE ON public.areas
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Criar tabela de categorias
CREATE TABLE public.categorias (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  nome TEXT NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.categorias ENABLE ROW LEVEL SECURITY;

-- RLS Policies para categorias
CREATE POLICY "Users can view their own categorias"
ON public.categorias FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own categorias"
ON public.categorias FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own categorias"
ON public.categorias FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own categorias"
ON public.categorias FOR DELETE
USING (auth.uid() = user_id);

-- Trigger para updated_at
CREATE TRIGGER update_categorias_updated_at
BEFORE UPDATE ON public.categorias
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();