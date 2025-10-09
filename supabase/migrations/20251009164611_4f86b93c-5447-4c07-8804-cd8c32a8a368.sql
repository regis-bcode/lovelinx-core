-- Criar tabela de alocações de equipe (Gestão de Equipes)
CREATE TABLE IF NOT EXISTS public.project_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  tap_id UUID REFERENCES public.tap(id) ON DELETE CASCADE,
  allocated_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  
  -- Campos de alocação
  funcao_projeto TEXT NOT NULL,
  valor_hora NUMERIC(10, 2) NOT NULL DEFAULT 0,
  data_inicio DATE NOT NULL,
  data_saida DATE,
  status_participacao TEXT NOT NULL DEFAULT 'Ativo',
  observacoes TEXT,
  
  -- Campos de controle
  created_by UUID NOT NULL DEFAULT auth.uid(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Constraints
  CONSTRAINT valid_dates CHECK (data_saida IS NULL OR data_saida >= data_inicio),
  CONSTRAINT valid_status CHECK (status_participacao IN ('Ativo', 'Inativo')),
  UNIQUE(project_id, tap_id, allocated_user_id)
);

-- Índices para performance
CREATE INDEX idx_allocations_project ON public.project_allocations(project_id);
CREATE INDEX idx_allocations_tap ON public.project_allocations(tap_id);
CREATE INDEX idx_allocations_user ON public.project_allocations(allocated_user_id);
CREATE INDEX idx_allocations_status ON public.project_allocations(status_participacao);

-- Habilitar RLS
ALTER TABLE public.project_allocations ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Users can view allocations of their projects"
ON public.project_allocations FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_allocations.project_id
    AND p.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create allocations for their projects"
ON public.project_allocations FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_allocations.project_id
    AND p.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update allocations of their projects"
ON public.project_allocations FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_allocations.project_id
    AND p.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete allocations of their projects"
ON public.project_allocations FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_allocations.project_id
    AND p.user_id = auth.uid()
  )
);

-- Trigger para updated_at
CREATE TRIGGER update_project_allocations_updated_at
BEFORE UPDATE ON public.project_allocations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Comentários para documentação
COMMENT ON TABLE public.project_allocations IS 'Gestão de Equipes: Alocações de membros em projetos e TAPs';
COMMENT ON COLUMN public.project_allocations.funcao_projeto IS 'Função do membro no projeto (Gerente, Líder Técnico, Analista, Desenvolvedor, Suporte, etc.)';
COMMENT ON COLUMN public.project_allocations.valor_hora IS 'Valor hora específico para este projeto (pode sobrescrever o valor padrão do usuário)';
COMMENT ON COLUMN public.project_allocations.status_participacao IS 'Status da alocação: Ativo ou Inativo';