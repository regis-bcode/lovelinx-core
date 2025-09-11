-- First, let's add the new fields to the projects table
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS gerente_projeto text,
ADD COLUMN IF NOT EXISTS gerente_portfolio text,
ADD COLUMN IF NOT EXISTS gerente_escritorio text,
ADD COLUMN IF NOT EXISTS criticidade_cliente text,
ADD COLUMN IF NOT EXISTS duracao_meses integer DEFAULT 0;

-- Update existing criticidade column to be more specific (TOTVS)
-- The existing criticidade column will represent criticidade_totvs

-- Create a separate TAP (Termo de Abertura do Projeto) table to follow normalization
CREATE TABLE IF NOT EXISTS public.tap (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  
  -- Identificação
  data date NOT NULL,
  nome_projeto text NOT NULL,
  cod_cliente text NOT NULL,
  gpp text NOT NULL,
  produto text NOT NULL,
  arquiteto text NOT NULL,
  criticidade_totvs text NOT NULL CHECK (criticidade_totvs IN ('Baixa', 'Média', 'Alta', 'Crítica')),
  coordenador text NOT NULL,
  gerente_projeto text NOT NULL,
  gerente_portfolio text NOT NULL,
  gerente_escritorio text NOT NULL,
  esn text NOT NULL,
  criticidade_cliente text NOT NULL,
  drive text,
  
  -- Timeline
  data_inicio date,
  go_live_previsto date,
  duracao_pos_producao integer DEFAULT 0,
  encerramento date,
  
  -- Escopo e Objetivo
  escopo text,
  objetivo text,
  
  -- Observações
  observacoes text,
  
  -- Financeiro
  valor_projeto numeric DEFAULT 0,
  margem_venda_percent numeric DEFAULT 0,
  margem_venda_valor numeric DEFAULT 0,
  mrr numeric DEFAULT 0,
  mrr_total numeric DEFAULT 0,
  psa_planejado numeric DEFAULT 0,
  diferenca_psa_projeto numeric DEFAULT 0,
  receita_atual numeric DEFAULT 0,
  margem_atual_percent numeric DEFAULT 0,
  margem_atual_valor numeric DEFAULT 0,
  investimento_perdas numeric DEFAULT 0,
  investimento_comercial numeric DEFAULT 0,
  investimento_erro_produto numeric DEFAULT 0,
  projeto_em_perda boolean DEFAULT false,
  
  -- Sistema
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on TAP table
ALTER TABLE public.tap ENABLE ROW LEVEL SECURITY;

-- Create policies for TAP table
CREATE POLICY "Users can view TAPs of their projects" 
ON public.tap 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.projects p 
  WHERE p.id = tap.project_id AND p.user_id = auth.uid()
));

CREATE POLICY "Users can create TAPs for their projects" 
ON public.tap 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.projects p 
  WHERE p.id = tap.project_id AND p.user_id = auth.uid()
) AND user_id = auth.uid());

CREATE POLICY "Users can update TAPs of their projects" 
ON public.tap 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.projects p 
  WHERE p.id = tap.project_id AND p.user_id = auth.uid()
));

CREATE POLICY "Users can delete TAPs of their projects" 
ON public.tap 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM public.projects p 
  WHERE p.id = tap.project_id AND p.user_id = auth.uid()
));

-- Create trigger for automatic timestamp updates on TAP
CREATE TRIGGER update_tap_updated_at
BEFORE UPDATE ON public.tap
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tap_project_id ON public.tap(project_id);
CREATE INDEX IF NOT EXISTS idx_tap_user_id ON public.tap(user_id);