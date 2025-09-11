-- Criar tabela projects com todos os campos solicitados
CREATE TABLE public.projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  folder_id UUID REFERENCES public.folders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  
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

-- Habilitar RLS
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para projects
CREATE POLICY "Users can view projects from their folders" 
ON public.projects 
FOR SELECT 
USING (
  folder_id IN (
    SELECT f.id 
    FROM public.folders f 
    JOIN public.workspaces w ON f.workspace_id = w.id 
    WHERE w.user_id = auth.uid()
  )
  OR user_id = auth.uid()
);

CREATE POLICY "Users can create projects in their folders" 
ON public.projects 
FOR INSERT 
WITH CHECK (
  folder_id IN (
    SELECT f.id 
    FROM public.folders f 
    JOIN public.workspaces w ON f.workspace_id = w.id 
    WHERE w.user_id = auth.uid()
  )
  AND user_id = auth.uid()
);

CREATE POLICY "Users can update projects in their folders" 
ON public.projects 
FOR UPDATE 
USING (
  folder_id IN (
    SELECT f.id 
    FROM public.folders f 
    JOIN public.workspaces w ON f.workspace_id = w.id 
    WHERE w.user_id = auth.uid()
  )
  OR user_id = auth.uid()
);

CREATE POLICY "Users can delete projects in their folders" 
ON public.projects 
FOR DELETE 
USING (
  folder_id IN (
    SELECT f.id 
    FROM public.folders f 
    JOIN public.workspaces w ON f.workspace_id = w.id 
    WHERE w.user_id = auth.uid()
  )
  OR user_id = auth.uid()
);

-- Trigger para updated_at
CREATE TRIGGER update_projects_updated_at
BEFORE UPDATE ON public.projects
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Atualizar tabelas stakeholders e communication_plan para referenciar projects
ALTER TABLE public.stakeholders 
ADD COLUMN project_id_new UUID REFERENCES public.projects(id) ON DELETE CASCADE;

ALTER TABLE public.communication_plan 
ADD COLUMN project_id_new UUID REFERENCES public.projects(id) ON DELETE CASCADE;