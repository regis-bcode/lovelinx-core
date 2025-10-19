DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'tasks'
      AND column_name = 'nome'
  ) THEN
    ALTER TABLE public.tasks RENAME COLUMN nome TO tarefa;
  END IF;
END $$;

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS descricao_tarefa text,
  ADD COLUMN IF NOT EXISTS solucao text;
