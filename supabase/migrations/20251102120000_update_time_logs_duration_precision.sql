ALTER TABLE public.time_logs
  ADD COLUMN IF NOT EXISTS tempo_segundos INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tempo_formatado TEXT,
  ALTER COLUMN tempo_minutos TYPE NUMERIC USING tempo_minutos::numeric,
  ALTER COLUMN tempo_minutos SET DEFAULT 0;

UPDATE public.time_logs
SET tempo_segundos = GREATEST(0, ROUND(COALESCE(tempo_minutos, 0) * 60)),
    tempo_formatado = (
      WITH total_seconds AS (
        SELECT GREATEST(0, ROUND(COALESCE(tempo_minutos, 0) * 60)) AS seconds
      )
      SELECT
        LPAD(FLOOR(seconds / 3600)::TEXT, 2, '0') || ':' ||
        LPAD(FLOOR((seconds % 3600) / 60)::TEXT, 2, '0') || ':' ||
        LPAD((seconds % 60)::TEXT, 2, '0')
      FROM total_seconds
    )
WHERE tempo_segundos = 0;
