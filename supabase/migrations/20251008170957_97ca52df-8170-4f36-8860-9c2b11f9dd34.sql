-- Adicionar custo_hora na tabela users
ALTER TABLE public.users ADD COLUMN custo_hora numeric DEFAULT 0;

-- Criar enum para tipo de equipe
CREATE TYPE public.team_type AS ENUM ('projeto', 'suporte');

-- Criar tabela de equipes
CREATE TABLE public.project_teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  tipo_equipe team_type NOT NULL DEFAULT 'projeto',
  tap_id uuid REFERENCES public.tap(id) ON DELETE CASCADE,
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  nome text NOT NULL,
  descricao text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Criar tabela de membros da equipe
CREATE TABLE public.team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.project_teams(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  custo_hora_override numeric,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(team_id, user_id)
);

-- Enable RLS
ALTER TABLE public.project_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies para project_teams
CREATE POLICY "Users can view their own teams"
ON public.project_teams FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can create their own teams"
ON public.project_teams FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own teams"
ON public.project_teams FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own teams"
ON public.project_teams FOR DELETE
USING (user_id = auth.uid());

-- RLS Policies para team_members
CREATE POLICY "Users can view members of their teams"
ON public.team_members FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.project_teams pt
  WHERE pt.id = team_members.team_id AND pt.user_id = auth.uid()
));

CREATE POLICY "Users can add members to their teams"
ON public.team_members FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.project_teams pt
  WHERE pt.id = team_members.team_id AND pt.user_id = auth.uid()
));

CREATE POLICY "Users can update members of their teams"
ON public.team_members FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM public.project_teams pt
  WHERE pt.id = team_members.team_id AND pt.user_id = auth.uid()
));

CREATE POLICY "Users can remove members from their teams"
ON public.team_members FOR DELETE
USING (EXISTS (
  SELECT 1 FROM public.project_teams pt
  WHERE pt.id = team_members.team_id AND pt.user_id = auth.uid()
));

-- Triggers para updated_at
CREATE TRIGGER update_project_teams_updated_at
  BEFORE UPDATE ON public.project_teams
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_team_members_updated_at
  BEFORE UPDATE ON public.team_members
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();