-- Criar tabela profiles primeiro
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS para profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para profiles
CREATE POLICY "Profiles are viewable by everyone" 
ON public.profiles 
FOR SELECT 
USING (true);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (user_id = auth.uid());

-- Criar tabela workspaces
CREATE TABLE public.workspaces (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  descricao TEXT,
  cor TEXT NOT NULL DEFAULT '#3B82F6',
  ativo BOOLEAN NOT NULL DEFAULT true,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS para workspaces
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para workspaces
CREATE POLICY "Users can view their own workspaces" 
ON public.workspaces 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Users can create their own workspaces" 
ON public.workspaces 
FOR INSERT 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own workspaces" 
ON public.workspaces 
FOR UPDATE 
USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own workspaces" 
ON public.workspaces 
FOR DELETE 
USING (user_id = auth.uid());

-- Criar tabela folders
CREATE TABLE public.folders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  descricao TEXT,
  cor TEXT NOT NULL DEFAULT '#3B82F6',
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS para folders
ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para folders
CREATE POLICY "Users can view folders from their workspaces" 
ON public.folders 
FOR SELECT 
USING (
  workspace_id IN (
    SELECT id FROM public.workspaces WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can create folders in their workspaces" 
ON public.folders 
FOR INSERT 
WITH CHECK (
  workspace_id IN (
    SELECT id FROM public.workspaces WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can update folders in their workspaces" 
ON public.folders 
FOR UPDATE 
USING (
  workspace_id IN (
    SELECT id FROM public.workspaces WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete folders in their workspaces" 
ON public.folders 
FOR DELETE 
USING (
  workspace_id IN (
    SELECT id FROM public.workspaces WHERE user_id = auth.uid()
  )
);

-- Criar tabela projects
CREATE TABLE public.projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  folder_id UUID REFERENCES public.folders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Identificação
  data DATE NOT NULL,
  cod_cliente TEXT NOT NULL,
  nome_projeto TEXT NOT NULL,
  cliente TEXT NOT NULL,
  gpp TEXT NOT NULL,
  coordenador TEXT NOT NULL,
  produto TEXT NOT NULL,
  esn TEXT NOT NULL,
  arquiteto TEXT NOT NULL,
  criticidade TEXT NOT NULL CHECK (criticidade IN ('Baixa', 'Média', 'Alta', 'Crítica')),
  drive TEXT,
  
  -- Financeiro
  valor_projeto DECIMAL(15,2) DEFAULT 0,
  receita_atual DECIMAL(15,2) DEFAULT 0,
  margem_venda_percent DECIMAL(5,2) DEFAULT 0,
  margem_atual_percent DECIMAL(5,2) DEFAULT 0,
  margem_venda_reais DECIMAL(15,2) DEFAULT 0,
  margem_atual_reais DECIMAL(15,2) DEFAULT 0,
  mrr DECIMAL(15,2) DEFAULT 0,
  investimento_perdas DECIMAL(15,2) DEFAULT 0,
  mrr_total DECIMAL(15,2) DEFAULT 0,
  investimento_comercial DECIMAL(15,2) DEFAULT 0,
  psa_planejado DECIMAL(15,2) DEFAULT 0,
  investimento_erro_produto DECIMAL(15,2) DEFAULT 0,
  diferenca_psa_projeto DECIMAL(15,2) DEFAULT 0,
  projeto_em_perda BOOLEAN DEFAULT FALSE,
  
  -- Timeline
  data_inicio DATE,
  go_live_previsto DATE,
  duracao_pos_producao INTEGER DEFAULT 0,
  encerramento DATE,
  
  -- Outros
  escopo TEXT,
  objetivo TEXT,
  observacao TEXT,
  
  -- Sistema
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS para projects
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para projects
CREATE POLICY "Users can view their own projects" 
ON public.projects 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Users can create their own projects" 
ON public.projects 
FOR INSERT 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own projects" 
ON public.projects 
FOR UPDATE 
USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own projects" 
ON public.projects 
FOR DELETE 
USING (user_id = auth.uid());

-- Triggers para updated_at
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_workspaces_updated_at
BEFORE UPDATE ON public.workspaces
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_folders_updated_at
BEFORE UPDATE ON public.folders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_projects_updated_at
BEFORE UPDATE ON public.projects
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Função para criar perfil automático quando usuário se registra
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger para criar perfil automático
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Atualizar stakeholders e communication_plan para usar projects
ALTER TABLE public.stakeholders 
ADD COLUMN project_id_new UUID REFERENCES public.projects(id) ON DELETE CASCADE;

ALTER TABLE public.communication_plan 
ADD COLUMN project_id_new UUID REFERENCES public.projects(id) ON DELETE CASCADE;