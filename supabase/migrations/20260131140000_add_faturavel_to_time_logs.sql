ALTER TABLE public.time_logs
  ADD COLUMN IF NOT EXISTS faturavel boolean DEFAULT false;

UPDATE public.time_logs
SET faturavel = COALESCE(faturavel, false);

ALTER TABLE public.time_logs
  ALTER COLUMN faturavel SET NOT NULL;

NOTIFY pgrst, 'reload schema';
