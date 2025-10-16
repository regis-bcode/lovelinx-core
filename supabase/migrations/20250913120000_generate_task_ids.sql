-- Ensure sequential task identifiers are generated on the database side
-- This migration creates a helper table to keep per-project counters,
-- a trigger function that assigns the next task_id, and wires the trigger
-- to the public.tasks table.

create table if not exists public.task_id_sequences (
  project_id uuid primary key,
  last_number integer not null default 0,
  inserted_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create or replace function public.set_task_id_from_sequence()
returns trigger
language plpgsql
as $$
declare
  next_number integer;
begin
  if new.project_id is null then
    raise exception 'project_id is required to generate task_id';
  end if;

  with next_val as (
    insert into public.task_id_sequences (project_id, last_number)
    values (new.project_id, 1)
    on conflict (project_id) do update
      set last_number = public.task_id_sequences.last_number + 1,
          updated_at = timezone('utc', now())
    returning last_number
  )
  select last_number into next_number from next_val;

  if next_number is null then
    raise exception 'Falha ao gerar identificador sequencial para a tarefa';
  end if;

  new.task_id := format('TASK-%s', lpad(next_number::text, 3, '0'));
  return new;
end;
$$;

drop trigger if exists set_task_id_before_insert on public.tasks;

create trigger set_task_id_before_insert
before insert on public.tasks
for each row
when (new.task_id is null or btrim(new.task_id) = '')
execute function public.set_task_id_from_sequence();

-- Backfill the sequence table with the current maximum task numbers per project
insert into public.task_id_sequences (project_id, last_number)
select
  project_id,
  max(coalesce(nullif(regexp_replace(task_id, '\\D', '', 'g'), '')::integer, 0)) as last_number
from public.tasks
where coalesce(task_id, '') <> ''
group by project_id
on conflict (project_id) do update
  set last_number = greatest(public.task_id_sequences.last_number, excluded.last_number),
      updated_at = timezone('utc', now());
