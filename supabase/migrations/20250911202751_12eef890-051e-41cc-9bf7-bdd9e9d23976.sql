-- Criar tabela para tarefas
CREATE TABLE public.tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL,
  user_id UUID NOT NULL,
  task_id TEXT NOT NULL,
  nome TEXT NOT NULL,
  responsavel TEXT,
  data_vencimento DATE,
  prioridade TEXT NOT NULL DEFAULT 'Média' CHECK (prioridade IN ('Baixa', 'Média', 'Alta', 'Crítica')),
  status TEXT NOT NULL DEFAULT 'BACKLOG',
  custom_fields JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(project_id, task_id)
);

-- Habilitar RLS na tabela tasks
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Criar políticas RLS para tasks
CREATE POLICY "Users can view tasks of their projects" 
ON public.tasks 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM projects p 
  WHERE p.id = tasks.project_id AND p.user_id = auth.uid()
));

CREATE POLICY "Users can create tasks for their projects" 
ON public.tasks 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM projects p 
  WHERE p.id = tasks.project_id AND p.user_id = auth.uid()
) AND user_id = auth.uid());

CREATE POLICY "Users can update tasks of their projects" 
ON public.tasks 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM projects p 
  WHERE p.id = tasks.project_id AND p.user_id = auth.uid()
));

CREATE POLICY "Users can delete tasks of their projects" 
ON public.tasks 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM projects p 
  WHERE p.id = tasks.project_id AND p.user_id = auth.uid()
));

-- Criar tabela para campos customizados
CREATE TABLE public.custom_fields (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL,
  user_id UUID NOT NULL,
  field_name TEXT NOT NULL,
  field_type TEXT NOT NULL CHECK (field_type IN ('monetary', 'percentage', 'numeric', 'text', 'dropdown', 'tags', 'checkbox')),
  field_options TEXT[],
  is_required BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(project_id, field_name)
);

-- Habilitar RLS na tabela custom_fields
ALTER TABLE public.custom_fields ENABLE ROW LEVEL SECURITY;

-- Criar políticas RLS para custom_fields
CREATE POLICY "Users can view custom fields of their projects" 
ON public.custom_fields 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM projects p 
  WHERE p.id = custom_fields.project_id AND p.user_id = auth.uid()
));

CREATE POLICY "Users can create custom fields for their projects" 
ON public.custom_fields 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM projects p 
  WHERE p.id = custom_fields.project_id AND p.user_id = auth.uid()
) AND user_id = auth.uid());

CREATE POLICY "Users can update custom fields of their projects" 
ON public.custom_fields 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM projects p 
  WHERE p.id = custom_fields.project_id AND p.user_id = auth.uid()
));

CREATE POLICY "Users can delete custom fields of their projects" 
ON public.custom_fields 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM projects p 
  WHERE p.id = custom_fields.project_id AND p.user_id = auth.uid()
));

-- Criar trigger para atualizar updated_at nas tabelas
CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_custom_fields_updated_at
  BEFORE UPDATE ON public.custom_fields
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();