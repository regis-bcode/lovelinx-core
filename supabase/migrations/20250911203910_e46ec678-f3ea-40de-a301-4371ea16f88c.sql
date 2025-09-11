-- Alterar a constraint única para task_id ser único apenas por projeto
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_project_id_task_id_key;
-- Remover constraint única global se existir
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_task_id_key;
-- Recriar a constraint correta
ALTER TABLE public.tasks ADD CONSTRAINT tasks_project_id_task_id_unique UNIQUE (project_id, task_id);