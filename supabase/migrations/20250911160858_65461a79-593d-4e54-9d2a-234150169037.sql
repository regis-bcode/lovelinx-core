-- Create stakeholders table
CREATE TABLE public.stakeholders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL,
  nome TEXT NOT NULL,
  cargo TEXT NOT NULL,
  departamento TEXT NOT NULL,
  nivel TEXT NOT NULL CHECK (nivel IN ('Executivo', 'Gerencial', 'Operacional')),
  email TEXT NOT NULL,
  telefone TEXT,
  tipo_influencia TEXT NOT NULL CHECK (tipo_influencia IN ('Alto', 'Médio', 'Baixo')),
  interesses TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.stakeholders ENABLE ROW LEVEL SECURITY;

-- Create policies for stakeholders
CREATE POLICY "Users can view stakeholders of their projects" 
ON public.stakeholders 
FOR SELECT 
USING (true);

CREATE POLICY "Users can create stakeholders" 
ON public.stakeholders 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can update stakeholders" 
ON public.stakeholders 
FOR UPDATE 
USING (true);

CREATE POLICY "Users can delete stakeholders" 
ON public.stakeholders 
FOR DELETE 
USING (true);

-- Create communication_plan table
CREATE TABLE public.communication_plan (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL,
  codigo TEXT NOT NULL,
  comunicacao TEXT,
  objetivo TEXT,
  frequencia TEXT,
  responsavel TEXT,
  envolvidos TEXT,
  aprovadores TEXT,
  formato_arquivo TEXT,
  midia TEXT,
  canal_envio TEXT,
  idioma TEXT,
  conteudo TEXT,
  link_documento TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.communication_plan ENABLE ROW LEVEL SECURITY;

-- Create policies for communication_plan
CREATE POLICY "Users can view communication plans of their projects" 
ON public.communication_plan 
FOR SELECT 
USING (true);

CREATE POLICY "Users can create communication plans" 
ON public.communication_plan 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can update communication plans" 
ON public.communication_plan 
FOR UPDATE 
USING (true);

CREATE POLICY "Users can delete communication plans" 
ON public.communication_plan 
FOR DELETE 
USING (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_stakeholders_updated_at
  BEFORE UPDATE ON public.stakeholders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_communication_plan_updated_at
  BEFORE UPDATE ON public.communication_plan
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();