-- Migration: Ensure daily hour limits and supporting structures

-- USERS: garantir coluna de limite diário
alter table if exists public.users
  add column if not exists horas_liberadas_por_dia numeric(5,2);

-- TIME_LOGS: garantir colunas essenciais
alter table if exists public.time_logs
  add column if not exists started_at timestamptz,
  add column if not exists ended_at timestamptz,
  add column if not exists duration_minutes int;

-- TIME_LOGS: coluna de data derivada (preferir generated, senão trigger)
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='time_logs' and column_name='log_date'
  ) then
    alter table public.time_logs
      add column log_date date
      generated always as ( (started_at at time zone 'America/Sao_Paulo')::date ) stored;
  end if;
exception when feature_not_supported then
  -- fallback: cria coluna simples; trigger fará o populate
  begin
    alter table if exists public.time_logs
      add column if not exists log_date date;
  exception when duplicate_column then
    null;
  end;
end$$;

-- Índices úteis
create index if not exists idx_time_logs_user_date on public.time_logs(user_id, log_date);
create index if not exists idx_time_logs_task on public.time_logs(task_id);

-- Trigger (apenas se a coluna não for generated) para manter log_date consistente
create or replace function public.set_time_logs_log_date()
returns trigger language plpgsql as $$
begin
  new.log_date := ((new.started_at at time zone 'America/Sao_Paulo')::date);
  return new;
end$$;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='time_logs'
      and column_name='log_date'
      and generation_expression is null
  ) then
    drop trigger if exists tg_set_time_logs_log_date on public.time_logs;
    create trigger tg_set_time_logs_log_date
    before insert or update of started_at
    on public.time_logs
    for each row execute function public.set_time_logs_log_date();
  end if;
end$$;

-- Função utilitária para calcular duration_minutes
create or replace function public.calc_duration_minutes(p_started_at timestamptz, p_ended_at timestamptz)
returns int language sql immutable as $$
  select case
           when p_started_at is null or p_ended_at is null then null
           else ceil(extract(epoch from (p_ended_at - p_started_at)) / 60.0)::int
         end
$$;

-- TRIGGER: clamp automático no TETO Diário de 16h
-- Ao inserir/atualizar um log finalizado, se a soma do dia exceder 16h, ajustar ended_at
-- para que o total do dia fique exatamente 960 minutos.
create or replace function public.clamp_log_to_daily_cap()
returns trigger language plpgsql as $$
declare
  v_used_before int;
  v_cap int := 960; -- 16h * 60
  v_new_minutes int;
  v_allowed int;
  v_adjusted_ended timestamptz;
begin
  -- só aplica a logs finalizados
  if new.ended_at is null then
    return new;
  end if;

  -- minutos do novo log (provisório)
  v_new_minutes := public.calc_duration_minutes(new.started_at, new.ended_at);

  -- soma já usada no dia pelo usuário, desconsiderando o próprio NEW (no update)
  select coalesce(sum(tl.duration_minutes), 0)
    into v_used_before
  from public.time_logs tl
  where tl.user_id = new.user_id
    and tl.log_date = new.log_date
    and tl.id <> new.id
    and tl.ended_at is not null;

  -- se já está no cap ou além, zera o NEW
  if v_used_before >= v_cap then
    new.ended_at := new.started_at; -- resultará em 0
    new.duration_minutes := 0;
    return new;
  end if;

  v_allowed := v_cap - v_used_before;

  if v_new_minutes > v_allowed then
    -- Ajusta NEW para caber exatamente no restante do cap
    v_adjusted_ended := new.started_at + make_interval(mins => v_allowed);
    new.ended_at := v_adjusted_ended;
    new.duration_minutes := v_allowed;
  else
    new.duration_minutes := v_new_minutes;
  end if;

  return new;
end$$;

drop trigger if exists tg_clamp_log_to_daily_cap_ins on public.time_logs;
create trigger tg_clamp_log_to_daily_cap_ins
before insert or update of ended_at, started_at
on public.time_logs
for each row execute function public.clamp_log_to_daily_cap();

-- View: total diário por usuário com flags de excesso
create or replace view public.vw_time_daily_usage as
select
  tl.user_id,
  tl.log_date,
  sum(coalesce(tl.duration_minutes,
               public.calc_duration_minutes(tl.started_at, tl.ended_at)))::int as total_minutes
from public.time_logs tl
where tl.ended_at is not null
group by tl.user_id, tl.log_date;

-- RPC: retorna total diário + limites do usuário
create or replace function public.get_time_daily_usage(p_date_from date, p_date_to date)
returns table (
  user_id uuid,
  log_date date,
  total_minutes int,
  horas_liberadas_por_dia numeric,
  over_user_limit boolean,
  over_hard_cap_16h boolean,
  tempo_estourado_minutes int
)
language plpgsql as $$
begin
  return query
    select
      u.id,
      v.log_date,
      v.total_minutes,
      u.horas_liberadas_por_dia,
      ( (v.total_minutes / 60.0) > coalesce(u.horas_liberadas_por_dia, 8.0) ) as over_user_limit,
      ( v.total_minutes >= 960 ) as over_hard_cap_16h,
      greatest(
        v.total_minutes - (coalesce(u.horas_liberadas_por_dia, 8.0) * 60)::int,
        0
      ) as tempo_estourado_minutes
    from public.vw_time_daily_usage v
    join public.users u on u.id = v.user_id
    where v.log_date between p_date_from and p_date_to
    order by v.log_date desc, u.id;
end$$;
