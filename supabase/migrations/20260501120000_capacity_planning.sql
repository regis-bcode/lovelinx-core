-- Capacity planning schema and helpers

-- CAPACIDADES DIÁRIAS POR ANALISTA
create table if not exists public.capacities (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    date date not null,
    daily_capacity_minutes int not null check (daily_capacity_minutes >= 0),
    source text not null default 'exception',
    notes text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (user_id, date)
);

create or replace function public.set_capacities_updated_at()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

create trigger trg_capacities_updated
before update on public.capacities
for each row execute procedure public.set_capacities_updated_at();


-- FERIADOS/CALENDAR EXCEPTIONS
create table if not exists public.holidays (
    id uuid primary key default gen_random_uuid(),
    date date not null unique,
    name text not null,
    is_working_day boolean not null default false
);


-- ALOCAÇÕES PLANEJADAS
create table if not exists public.allocations (
    id uuid primary key default gen_random_uuid(),
    task_id uuid not null references public.tasks(id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete cascade,
    start_date date not null,
    end_date date not null,
    planned_minutes int not null check (planned_minutes >= 0),
    percent_allocation int not null default 100 check (percent_allocation between 0 and 100),
    notes text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create or replace function public.set_allocations_updated_at()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

create trigger trg_allocations_updated
before update on public.allocations
for each row execute procedure public.set_allocations_updated_at();

create index if not exists idx_allocations_user_date on public.allocations(user_id, start_date, end_date);
create index if not exists idx_allocations_task on public.allocations(task_id);
create index if not exists idx_capacities_user_date on public.capacities(user_id, date);


-- HELPERS
create or replace function public.date_series(_start date, _end date)
returns table(d date)
language sql
immutable
as $$
select generate_series(_start, _end, interval '1 day')::date as d
$$;

create or replace function public.is_weekend(d date)
returns boolean
language sql
immutable
as $$
select extract(isodow from d) in (6,7)
$$;

create or replace view public.v_working_calendar as
select
    s.d as date,
    case
        when h.id is not null then h.is_working_day
        when public.is_weekend(s.d) then false
        else true
    end as is_working_day,
    h.name as holiday_name
from public.date_series((current_date - interval '365 days')::date, (current_date + interval '365 days')::date) as s(d)
left join public.holidays h on h.date = s.d;

create or replace function public.explode_allocation_daily(_allocation_id uuid)
returns table(user_id uuid, task_id uuid, d date, planned_minutes int)
language plpgsql
as $$
declare
    _s date;
    _e date;
    _u uuid;
    _t uuid;
    _pm int;
    _pct int;
    _days int;
    _perday int;
begin
    select user_id, task_id, start_date, end_date, planned_minutes, percent_allocation
      into _u, _t, _s, _e, _pm, _pct
    from public.allocations
    where id = _allocation_id;

    if _u is null then
        return;
    end if;

    with cal as (
        select date
        from public.date_series(_s, _e) ds
        join public.v_working_calendar wc on wc.date = ds.d and wc.is_working_day
    )
    select count(*) into _days from cal;

    if _days = 0 then
        return;
    end if;

    _perday := ceil((_pm * (_pct::numeric / 100)) / _days);

    return query
    select _u, _t, c.date, _perday::int
    from (
        select date
        from public.date_series(_s, _e) ds
        join public.v_working_calendar wc on wc.date = ds.d and wc.is_working_day
    ) as c;
end;
$$;

create or replace view public.v_allocation_daily as
with exploded as (
    select a.id as allocation_id, x.user_id, x.task_id, x.d as date, x.planned_minutes
    from public.allocations a,
    lateral public.explode_allocation_daily(a.id) x
)
select
    user_id,
    task_id,
    date,
    sum(planned_minutes)::int as planned_minutes
from exploded
group by user_id, task_id, date;


-- TIME LOGS AGGREGATION
create or replace view public.v_time_logged_daily as
select
    tl.user_id,
    coalesce(
        (tl.data_fim at time zone 'UTC')::date,
        (tl.data_inicio at time zone 'UTC')::date,
        (tl.created_at at time zone 'UTC')::date
    ) as date,
    sum(coalesce(tl.tempo_minutos, 0))::int as actual_minutes
from public.time_logs tl
group by 1,2;

create or replace function public.default_daily_capacity_minutes(d date)
returns int
language sql
immutable
as $$
select 480
$$;

create or replace view public.v_capacity_daily as
select
    u.id as user_id,
    ds.d as date,
    coalesce(
        c.daily_capacity_minutes,
        case when wc.is_working_day then public.default_daily_capacity_minutes(ds.d) else 0 end
    ) as capacity_minutes
from auth.users u
cross join public.date_series((current_date - interval '180 days')::date, (current_date + interval '365 days')::date) ds(d)
left join public.capacities c on c.user_id = u.id and c.date = ds.d
left join public.v_working_calendar wc on wc.date = ds.d;

create or replace view public.v_utilization_daily as
with base as (
    select
        c.user_id,
        c.date,
        c.capacity_minutes,
        coalesce(a.planned_minutes, 0) as planned_minutes,
        coalesce(t.actual_minutes, 0) as actual_minutes
    from public.v_capacity_daily c
    left join (
        select user_id, date, sum(planned_minutes)::int as planned_minutes
        from public.v_allocation_daily
        group by 1,2
    ) a on a.user_id = c.user_id and a.date = c.date
    left join public.v_time_logged_daily t on t.user_id = c.user_id and t.date = c.date
)
select
    *,
    case
        when capacity_minutes = 0 then 'no_capacity'
        when planned_minutes > capacity_minutes then 'overallocated'
        when planned_minutes = 0 then 'unallocated'
        when planned_minutes < (capacity_minutes * 0.5) then 'underallocated'
        else 'ok'
    end as allocation_flag,
    round(case when capacity_minutes > 0 then (planned_minutes::numeric / capacity_minutes) * 100 else 0 end, 1) as planned_util_pct,
    round(case when capacity_minutes > 0 then (actual_minutes::numeric / capacity_minutes) * 100 else 0 end, 1) as actual_util_pct
from base;


-- SNAPSHOTS & SUGGESTIONS
create or replace function public.get_capacity_snapshot(
    _from date,
    _to date,
    _user_ids uuid[] default null
)
returns table (
    user_id uuid,
    date date,
    capacity_minutes int,
    planned_minutes int,
    actual_minutes int,
    allocation_flag text,
    planned_util_pct numeric,
    actual_util_pct numeric
)
language sql
stable
as $$
select
    v.user_id,
    v.date,
    v.capacity_minutes,
    v.planned_minutes,
    v.actual_minutes,
    v.allocation_flag,
    v.planned_util_pct,
    v.actual_util_pct
from public.v_utilization_daily v
where v.date between _from and _to
  and (_user_ids is null or v.user_id = any(_user_ids))
order by v.date, v.user_id
$$;

create or replace function public.suggest_allocation(
    _user_id uuid,
    _from date,
    _to date,
    minutes_needed int
)
returns table (
    date date,
    free_minutes int
)
language sql
stable
as $$
with span as (
    select *
    from public.v_utilization_daily v
    where v.user_id = _user_id
      and v.date between _from and _to
)
select
    date,
    greatest(capacity_minutes - planned_minutes, 0) as free_minutes
from span
where capacity_minutes > 0
order by date
$$;

create or replace function public.list_analysts()
returns table(id uuid, name text, email text)
language sql
stable
as $$
select
    u.id,
    coalesce(p.full_name, split_part(u.email, '@', 1)) as name,
    u.email
from auth.users u
left join public.profiles p on p.id = u.id
order by name
$$;


-- RLS POLICIES
alter table public.capacities enable row level security;
alter table public.allocations enable row level security;
alter table public.holidays enable row level security;

create policy if not exists capacities_select on public.capacities
for select using (auth.role() = 'authenticated');

create policy if not exists allocations_select on public.allocations
for select using (auth.role() = 'authenticated');

create policy if not exists holidays_select on public.holidays
for select using (auth.role() = 'authenticated');

create policy if not exists capacities_write on public.capacities
for insert
with check (auth.role() = 'service_role');

create policy if not exists capacities_update on public.capacities
for update
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

create policy if not exists allocations_write on public.allocations
for insert
with check (auth.role() = 'service_role');

create policy if not exists allocations_update on public.allocations
for update
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

create policy if not exists holidays_write on public.holidays
for insert
with check (auth.role() = 'service_role');

create policy if not exists holidays_update on public.holidays
for update
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');


-- PERFORMANCE INDEX
create index if not exists idx_time_logs_user_date on public.time_logs(user_id, data_inicio, data_fim, created_at);
