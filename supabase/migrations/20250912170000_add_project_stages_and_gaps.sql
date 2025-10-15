-- Create table for project stages
CREATE TABLE IF NOT EXISTS public.project_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  nome TEXT NOT NULL,
  descricao TEXT,
  ordem INTEGER NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.project_stages ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_project_stages_user_id ON public.project_stages(user_id);
CREATE INDEX IF NOT EXISTS idx_project_stages_ordem ON public.project_stages(user_id, ordem);

CREATE POLICY "Users can view their project stages"
  ON public.project_stages
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their project stages"
  ON public.project_stages
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their project stages"
  ON public.project_stages
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their project stages"
  ON public.project_stages
  FOR DELETE
  USING (user_id = auth.uid());

CREATE TRIGGER update_project_stages_updated_at
  BEFORE UPDATE ON public.project_stages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE public.project_stages;

-- Create table for project sub-stages
CREATE TABLE IF NOT EXISTS public.project_substages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_id UUID NOT NULL REFERENCES public.project_stages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  nome TEXT NOT NULL,
  descricao TEXT,
  ordem INTEGER NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.project_substages ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_project_substages_user_id ON public.project_substages(user_id);
CREATE INDEX IF NOT EXISTS idx_project_substages_stage_id ON public.project_substages(stage_id);

CREATE POLICY "Users can view their project substages"
  ON public.project_substages
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their project substages"
  ON public.project_substages
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.project_stages ps
      WHERE ps.id = project_substages.stage_id
        AND ps.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their project substages"
  ON public.project_substages
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.project_stages ps
      WHERE ps.id = project_substages.stage_id
        AND ps.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their project substages"
  ON public.project_substages
  FOR DELETE
  USING (user_id = auth.uid());

CREATE TRIGGER update_project_substages_updated_at
  BEFORE UPDATE ON public.project_substages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE public.project_substages;

-- Create table for gaps management
CREATE TABLE IF NOT EXISTS public.gaps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  descricao TEXT,
  tipo TEXT,
  origem TEXT,
  severidade TEXT,
  urgencia TEXT,
  prioridade TEXT,
  impacto JSONB,
  faturavel BOOLEAN,
  valor_impacto_financeiro NUMERIC(14,2),
  causa_raiz TEXT,
  plano_acao TEXT,
  responsavel TEXT,
  data_prometida DATE,
  status TEXT,
  necessita_aprovacao BOOLEAN,
  decisao TEXT,
  aprovado_por TEXT,
  data_aprovacao TIMESTAMP WITH TIME ZONE,
  anexos JSONB,
  observacoes TEXT,
  impacto_financeiro_descricao TEXT,
  impacto_resumo TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.gaps ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_gaps_project_id ON public.gaps(project_id);
CREATE INDEX IF NOT EXISTS idx_gaps_task_id ON public.gaps(task_id);

CREATE POLICY "Users can view gaps of their projects"
  ON public.gaps
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.projects p
      WHERE p.id = gaps.project_id
        AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert gaps of their projects"
  ON public.gaps
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.projects p
      WHERE p.id = gaps.project_id
        AND p.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1
      FROM public.tasks t
      WHERE t.id = gaps.task_id
        AND t.project_id = gaps.project_id
    )
  );

CREATE POLICY "Users can update gaps of their projects"
  ON public.gaps
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.projects p
      WHERE p.id = gaps.project_id
        AND p.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.projects p
      WHERE p.id = gaps.project_id
        AND p.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1
      FROM public.tasks t
      WHERE t.id = gaps.task_id
        AND t.project_id = gaps.project_id
    )
  );

CREATE POLICY "Users can delete gaps of their projects"
  ON public.gaps
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.projects p
      WHERE p.id = gaps.project_id
        AND p.user_id = auth.uid()
    )
  );

CREATE TRIGGER update_gaps_updated_at
  BEFORE UPDATE ON public.gaps
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE public.gaps;

-- Extend tasks table with new fields for scheduling and project stages
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS cronograma BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS etapa_projeto UUID,
  ADD COLUMN IF NOT EXISTS sub_etapa_projeto UUID;

ALTER TABLE public.tasks
  ADD CONSTRAINT IF NOT EXISTS tasks_etapa_projeto_fkey
    FOREIGN KEY (etapa_projeto)
    REFERENCES public.project_stages(id)
    ON DELETE SET NULL,
  ADD CONSTRAINT IF NOT EXISTS tasks_sub_etapa_projeto_fkey
    FOREIGN KEY (sub_etapa_projeto)
    REFERENCES public.project_substages(id)
    ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_cronograma ON public.tasks(cronograma);
CREATE INDEX IF NOT EXISTS idx_tasks_etapa_projeto ON public.tasks(etapa_projeto);
CREATE INDEX IF NOT EXISTS idx_tasks_sub_etapa_projeto ON public.tasks(sub_etapa_projeto);
