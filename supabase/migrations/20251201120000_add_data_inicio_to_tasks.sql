-- Add start date column to tasks
alter table public.tasks
  add column if not exists data_inicio date;
