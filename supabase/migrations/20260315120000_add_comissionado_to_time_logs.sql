ALTER TABLE public.time_logs
  ADD COLUMN IF NOT EXISTS comissionado boolean;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'time_logs'
      AND column_name = 'faturavel'
  ) THEN
    EXECUTE 'UPDATE public.time_logs SET comissionado = COALESCE(comissionado, faturavel, false);';
  ELSE
    EXECUTE 'UPDATE public.time_logs SET comissionado = COALESCE(comissionado, false);';
  END IF;
END $$;

ALTER TABLE public.time_logs
  ALTER COLUMN comissionado SET DEFAULT false;

UPDATE public.time_logs
SET comissionado = COALESCE(comissionado, false);

ALTER TABLE public.time_logs
  ALTER COLUMN comissionado SET NOT NULL;

ALTER TABLE public.time_logs
  DROP COLUMN IF EXISTS faturavel;

NOTIFY pgrst, 'reload schema';
