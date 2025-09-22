-- Create status table
CREATE TABLE public.status (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  nome TEXT NOT NULL,
  tipo_aplicacao TEXT[] NOT NULL DEFAULT '{}', -- Array que pode conter 'projeto', 'tarefa_suporte', 'tarefa_projeto'
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.status ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own status" 
ON public.status 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own status" 
ON public.status 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own status" 
ON public.status 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own status" 
ON public.status 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_status_updated_at
BEFORE UPDATE ON public.status
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default status values
INSERT INTO public.status (user_id, nome, tipo_aplicacao) VALUES
  ((SELECT auth.uid()), 'Não Iniciado', ARRAY['projeto', 'tarefa_suporte', 'tarefa_projeto']),
  ((SELECT auth.uid()), 'Conforme Planejado', ARRAY['projeto', 'tarefa_suporte', 'tarefa_projeto']),
  ((SELECT auth.uid()), 'Atenção', ARRAY['projeto', 'tarefa_suporte', 'tarefa_projeto']),
  ((SELECT auth.uid()), 'Atrasado', ARRAY['projeto', 'tarefa_suporte', 'tarefa_projeto']),
  ((SELECT auth.uid()), 'Pausado', ARRAY['projeto', 'tarefa_suporte', 'tarefa_projeto']),
  ((SELECT auth.uid()), 'Cancelado', ARRAY['projeto', 'tarefa_suporte', 'tarefa_projeto']);