-- Criar tabela de equipes
CREATE TABLE public.teams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL,
  user_id UUID NOT NULL,
  nome TEXT NOT NULL,
  email TEXT,
  cargo TEXT,
  departamento TEXT,
  telefone TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para equipes
CREATE POLICY "Users can view teams of their projects" 
ON public.teams 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM projects p 
  WHERE p.id = teams.project_id AND p.user_id = auth.uid()
));

CREATE POLICY "Users can create teams for their projects" 
ON public.teams 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM projects p 
  WHERE p.id = teams.project_id AND p.user_id = auth.uid()
) AND user_id = auth.uid());

CREATE POLICY "Users can update teams of their projects" 
ON public.teams 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM projects p 
  WHERE p.id = teams.project_id AND p.user_id = auth.uid()
));

CREATE POLICY "Users can delete teams of their projects" 
ON public.teams 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM projects p 
  WHERE p.id = teams.project_id AND p.user_id = auth.uid()
));

-- Atualizar tabela de tarefas com novos campos
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS cliente TEXT;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS modulo TEXT;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS area TEXT;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS categoria TEXT;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS etapa_projeto TEXT;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS descricao_detalhada TEXT;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS retorno_acao TEXT;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS acao_realizada TEXT;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS gp_consultoria TEXT;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS responsavel_consultoria TEXT;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS responsavel_cliente TEXT;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS escopo TEXT;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS criticidade TEXT;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS numero_ticket TEXT;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS descricao_ticket TEXT;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS data_identificacao_ticket DATE;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS responsavel_ticket TEXT;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS status_ticket TEXT;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS link TEXT;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS validado_por TEXT;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS data_prevista_entrega DATE;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS data_entrega DATE;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS data_prevista_validacao DATE;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS dias_para_concluir INTEGER;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS percentual_conclusao INTEGER DEFAULT 0;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS link_drive TEXT;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS parent_task_id UUID;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS nivel INTEGER DEFAULT 0;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS ordem INTEGER DEFAULT 0;

-- Adicionar foreign key para subtarefas
ALTER TABLE public.tasks ADD CONSTRAINT fk_parent_task 
FOREIGN KEY (parent_task_id) REFERENCES public.tasks(id) ON DELETE CASCADE;

-- Trigger para updated_at nas equipes
CREATE OR REPLACE FUNCTION public.update_teams_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_teams_updated_at
BEFORE UPDATE ON public.teams
FOR EACH ROW
EXECUTE FUNCTION public.update_teams_updated_at_column();