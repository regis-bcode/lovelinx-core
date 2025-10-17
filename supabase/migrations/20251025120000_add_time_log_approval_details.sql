ALTER TABLE public.time_logs
  ADD COLUMN IF NOT EXISTS aprovador_nome text,
  ADD COLUMN IF NOT EXISTS aprovacao_data date,
  ADD COLUMN IF NOT EXISTS aprovacao_hora time without time zone,
  ADD COLUMN IF NOT EXISTS justificativa_reprovacao text;
