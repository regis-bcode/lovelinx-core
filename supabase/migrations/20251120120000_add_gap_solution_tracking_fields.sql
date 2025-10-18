-- Add solution tracking fields to gaps table if they are missing
ALTER TABLE public.gaps
  ADD COLUMN IF NOT EXISTS data_prevista_solucao DATE,
  ADD COLUMN IF NOT EXISTS data_realizada_solucao DATE,
  ADD COLUMN IF NOT EXISTS percentual_previsto NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS percentual_planejado NUMERIC(5,2);

-- Ensure updated_at is refreshed when new columns change
CREATE OR REPLACE FUNCTION public.update_gaps_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_gaps_updated_at ON public.gaps;
CREATE TRIGGER update_gaps_updated_at
BEFORE UPDATE ON public.gaps
FOR EACH ROW
EXECUTE FUNCTION public.update_gaps_updated_at();
