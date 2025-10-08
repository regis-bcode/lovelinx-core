-- Criar enum para tipos de aplicação de role
CREATE TYPE public.app_role AS ENUM ('admin', 'gestor', 'usuario');

-- Criar enum para tipo de inclusão de tempo
CREATE TYPE public.time_entry_type AS ENUM ('automatico', 'manual');

-- Criar enum para status de aprovação
CREATE TYPE public.approval_status AS ENUM ('pendente', 'aprovado', 'reprovado');

-- Tabela de roles de usuário
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role app_role NOT NULL DEFAULT 'usuario',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Habilitar RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Criar função de segurança para verificar roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Políticas RLS para user_roles
CREATE POLICY "Usuários podem ver seus próprios roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins podem gerenciar roles"
  ON public.user_roles FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Tabela de logs de tempo
CREATE TABLE public.time_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL,
  project_id UUID NOT NULL,
  user_id UUID NOT NULL,
  tipo_inclusao time_entry_type NOT NULL DEFAULT 'manual',
  tempo_minutos INTEGER NOT NULL DEFAULT 0,
  data_inicio TIMESTAMP WITH TIME ZONE,
  data_fim TIMESTAMP WITH TIME ZONE,
  status_aprovacao approval_status NOT NULL DEFAULT 'pendente',
  aprovador_id UUID,
  data_aprovacao TIMESTAMP WITH TIME ZONE,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.time_logs ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para time_logs
CREATE POLICY "Usuários podem ver logs de tempo dos seus projetos"
  ON public.time_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = time_logs.project_id
        AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Usuários podem criar logs de tempo para suas tarefas"
  ON public.time_logs FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = time_logs.project_id
        AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Usuários podem atualizar seus próprios logs pendentes"
  ON public.time_logs FOR UPDATE
  USING (
    user_id = auth.uid() AND
    status_aprovacao = 'pendente'
  );

CREATE POLICY "Gestores podem aprovar/reprovar logs de tempo"
  ON public.time_logs FOR UPDATE
  USING (
    public.has_role(auth.uid(), 'gestor') OR
    public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Usuários podem deletar seus próprios logs pendentes"
  ON public.time_logs FOR DELETE
  USING (
    user_id = auth.uid() AND
    status_aprovacao = 'pendente'
  );

-- Adicionar índices para melhor performance
CREATE INDEX idx_time_logs_task_id ON public.time_logs(task_id);
CREATE INDEX idx_time_logs_project_id ON public.time_logs(project_id);
CREATE INDEX idx_time_logs_user_id ON public.time_logs(user_id);
CREATE INDEX idx_time_logs_status ON public.time_logs(status_aprovacao);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_user_roles_updated_at
  BEFORE UPDATE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_time_logs_updated_at
  BEFORE UPDATE ON public.time_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Habilitar realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.time_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_roles;