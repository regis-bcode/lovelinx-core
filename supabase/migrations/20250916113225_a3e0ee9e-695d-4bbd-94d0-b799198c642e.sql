-- Create enum for user types
CREATE TYPE public.user_type AS ENUM (
  'cliente',
  'analista', 
  'gerente_projetos',
  'gerente_portfolio',
  'coordenador_consultoria',
  'gerente_cliente',
  'arquiteto',
  'sponsor'
);

-- Create enum for profile types
CREATE TYPE public.profile_type AS ENUM (
  'visualizador',
  'editor',
  'administrador'
);

-- Create users table
CREATE TABLE public.users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL, -- Reference to auth user
  cpf TEXT NOT NULL UNIQUE,
  nome_completo TEXT NOT NULL,
  email TEXT NOT NULL,
  telefone TEXT NOT NULL,
  tipo_usuario user_type NOT NULL,
  tipo_perfil profile_type NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT true,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Create policies for users table
CREATE POLICY "Users can view all users" 
ON public.users 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can create users" 
ON public.users 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update users" 
ON public.users 
FOR UPDATE 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete users" 
ON public.users 
FOR DELETE 
USING (auth.uid() IS NOT NULL);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_users_updated_at
BEFORE UPDATE ON public.users
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default admin user linked to current auth user
INSERT INTO public.users (
  user_id,
  cpf,
  nome_completo,
  email,
  telefone,
  tipo_usuario,
  tipo_perfil,
  observacoes
) VALUES (
  'a6d4976b-1072-4cde-b081-17d6e0d96ba3', -- Current auth user ID from logs
  '00000000000',
  'Administrador',
  'admin@projectos.com',
  '(00) 00000-0000',
  'gerente_portfolio',
  'administrador',
  'Usuário administrador padrão do sistema'
);