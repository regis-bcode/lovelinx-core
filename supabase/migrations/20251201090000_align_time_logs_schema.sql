-- Ajuste de colunas do apontamento de tempo para suportar início/fim e duração em segundos
alter table public.time_logs
  add column if not exists start_time timestamptz,
  add column if not exists end_time timestamptz,
  add column if not exists duration_secs integer,
  add column if not exists status text;

-- Popular novas colunas com dados existentes
update public.time_logs
set start_time = coalesce(start_time, data_inicio),
    end_time = coalesce(end_time, data_fim)
where start_time is null
   or (end_time is null and data_fim is not null);

update public.time_logs
set duration_secs = case
    when duration_secs is not null then duration_secs
    when start_time is not null and end_time is not null then greatest(1, floor(extract(epoch from end_time - start_time)))
    else duration_secs
  end
where duration_secs is null;

update public.time_logs
set tempo_trabalhado = case
    when duration_secs is not null then duration_secs::numeric / 60
    else tempo_trabalhado
  end
where duration_secs is not null;

update public.time_logs
set status = case
    when status is not null then status
    when end_time is null then 'running'
    else 'completed'
  end
where status is null;

alter table public.time_logs
  alter column status set not null,
  alter column status set default 'running';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'time_logs_status_check'
  ) then
    alter table public.time_logs
      add constraint time_logs_status_check check (status in ('running', 'completed', 'canceled'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'time_logs_duration_secs_check'
  ) then
    alter table public.time_logs
      add constraint time_logs_duration_secs_check check (duration_secs is null or duration_secs >= 1);
  end if;
end $$;

create unique index if not exists idx_time_logs_user_running
  on public.time_logs(user_id)
  where end_time is null;

