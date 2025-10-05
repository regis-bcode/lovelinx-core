-- Adicionar coluna tipo na tabela tap
ALTER TABLE public.tap ADD COLUMN tipo text NOT NULL DEFAULT 'PROJETO';

-- Adicionar constraint para validar os valores permitidos
ALTER TABLE public.tap ADD CONSTRAINT tap_tipo_check CHECK (tipo IN ('PROJETO', 'SUPORTE', 'AVULSO'));