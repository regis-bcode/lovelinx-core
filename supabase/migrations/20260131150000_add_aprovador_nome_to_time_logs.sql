ALTER TABLE public.time_logs
  ADD COLUMN IF NOT EXISTS aprovador_nome text;

NOTIFY pgrst, 'reload schema';
