-- Ensure time entry enum and activity column are available for timer logs
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'time_entry_type'
      AND e.enumlabel = 'timer'
  ) THEN
    ALTER TYPE public.time_entry_type ADD VALUE IF NOT EXISTS 'timer';
  END IF;
END $$;

ALTER TABLE public.time_logs
  ADD COLUMN IF NOT EXISTS atividade text;
