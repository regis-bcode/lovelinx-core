-- Remove campos do gerente_portfolio e gerente_escritorio da tabela tap
ALTER TABLE public.tap 
DROP COLUMN IF EXISTS gerente_portfolio,
DROP COLUMN IF EXISTS gerente_escritorio;

-- Remove campos do gerente_portfolio e gerente_escritorio da tabela projects
ALTER TABLE public.projects 
DROP COLUMN IF EXISTS gerente_portfolio,
DROP COLUMN IF EXISTS gerente_escritorio;

-- Criar tabela para anexos de documentos da TAP
CREATE TABLE public.tap_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tap_id UUID NOT NULL,
  project_id UUID NOT NULL,
  user_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  original_name TEXT NOT NULL,
  file_size BIGINT,
  mime_type TEXT,
  document_name TEXT NOT NULL,
  upload_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  uploaded_by_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on tap_documents
ALTER TABLE public.tap_documents ENABLE ROW LEVEL SECURITY;

-- Create policies for tap_documents
CREATE POLICY "Users can view documents of their TAPs" 
ON public.tap_documents 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM tap t 
  JOIN projects p ON p.id = t.project_id 
  WHERE t.id = tap_documents.tap_id 
  AND p.user_id = auth.uid()
));

CREATE POLICY "Users can create documents for their TAPs" 
ON public.tap_documents 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM tap t 
  JOIN projects p ON p.id = t.project_id 
  WHERE t.id = tap_documents.tap_id 
  AND p.user_id = auth.uid()
) AND user_id = auth.uid());

CREATE POLICY "Users can update documents of their TAPs" 
ON public.tap_documents 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM tap t 
  JOIN projects p ON p.id = t.project_id 
  WHERE t.id = tap_documents.tap_id 
  AND p.user_id = auth.uid()
));

CREATE POLICY "Users can delete documents of their TAPs" 
ON public.tap_documents 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM tap t 
  JOIN projects p ON p.id = t.project_id 
  WHERE t.id = tap_documents.tap_id 
  AND p.user_id = auth.uid()
));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_tap_documents_updated_at
BEFORE UPDATE ON public.tap_documents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();