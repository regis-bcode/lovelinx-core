-- Add color support to status records
ALTER TABLE public.status
ADD COLUMN IF NOT EXISTS cor TEXT DEFAULT '#38bdf8';

-- Apply curated colors to the default statuses when possible
UPDATE public.status
SET cor = CASE
  WHEN lower(nome) = 'não iniciado' THEN '#64748b'
  WHEN lower(nome) = 'conforme planejado' THEN '#22c55e'
  WHEN lower(nome) = 'atenção' THEN '#f59e0b'
  WHEN lower(nome) = 'atrasado' THEN '#ef4444'
  WHEN lower(nome) = 'pausado' THEN '#a855f7'
  WHEN lower(nome) = 'cancelado' THEN '#0f172a'
  ELSE cor
END;

-- Ensure every status has a color value
UPDATE public.status
SET cor = '#38bdf8'
WHERE cor IS NULL OR trim(cor) = '';

ALTER TABLE public.status
ALTER COLUMN cor SET NOT NULL;
