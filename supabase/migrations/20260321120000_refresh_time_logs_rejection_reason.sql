ALTER TABLE public.time_logs
  ADD COLUMN IF NOT EXISTS justificativa_reprovacao text;

NOTIFY pgrst, 'reload schema';
