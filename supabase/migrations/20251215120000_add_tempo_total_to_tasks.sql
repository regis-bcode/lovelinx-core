-- Add tempo_total column to tasks to persist total tracked time in seconds
alter table public.tasks
  add column if not exists tempo_total integer not null default 0;

