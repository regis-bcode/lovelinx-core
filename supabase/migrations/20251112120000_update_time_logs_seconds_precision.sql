-- Ensure tempo_segundos supports large accumulations and keep tempo_minutos as a generated column
alter table public.time_logs
  alter column tempo_segundos type bigint using tempo_segundos::bigint,
  alter column tempo_segundos set not null,
  alter column tempo_segundos set default 0;

-- Recreate tempo_minutos as a generated column derived from tempo_segundos
alter table public.time_logs
drop column if exists tempo_minutos;

alter table public.time_logs
add column tempo_minutos integer generated always as (floor(tempo_segundos / 60)::integer) stored;

-- Ensure updated_at is automatically managed on updates
create extension if not exists moddatetime;

drop trigger if exists set_timestamp_time_logs on public.time_logs;
create trigger set_timestamp_time_logs
before update on public.time_logs
for each row execute procedure moddatetime(updated_at);

-- Prevent multiple open logs per task/user pair
create unique index if not exists uniq_open_log_per_user_task
on public.time_logs (task_id, user_id)
where data_fim is null;

-- Helper functions to aggregate durations in seconds and HH:MM:SS format
create or replace function public.sum_time_logs_seconds(p_task_id uuid, p_user_id uuid)
returns bigint
language sql
stable
as $$
  select coalesce(
    sum(extract(epoch from (coalesce(data_fim, now()) - data_inicio))::bigint),
    0
  )
  from public.time_logs
  where task_id = p_task_id
    and user_id = p_user_id;
$$;

create or replace function public.sum_time_logs_hms(p_task_id uuid, p_user_id uuid)
returns text
language plpgsql
stable
as $$
declare
  total_seconds bigint := 0;
  h bigint;
  m bigint;
  s bigint;
begin
  select public.sum_time_logs_seconds(p_task_id, p_user_id) into total_seconds;

  h := total_seconds / 3600;
  m := (total_seconds % 3600) / 60;
  s := total_seconds % 60;

  return lpad(h::text, 2, '0') || ':' ||
         lpad(m::text, 2, '0') || ':' ||
         lpad(s::text, 2, '0');
end;
$$;
