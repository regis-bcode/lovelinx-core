-- Atualiza a coluna de tempo trabalhado para ser derivada das datas de início e fim

alter table public.time_logs
  drop column if exists tempo_segundos;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'time_logs'
      and column_name = 'tempo_trabalhado'
  ) then
    alter table public.time_logs
      drop column tempo_trabalhado;
  end if;
end $$;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'time_logs'
      and column_name = 'tempo_minutos'
  ) then
    alter table public.time_logs
      rename column tempo_minutos to tempo_trabalhado_legacy;
  end if;
end $$;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'time_logs'
      and column_name = 'tempo_trabalhado_legacy'
  ) then
    update public.time_logs
    set data_fim = data_inicio + make_interval(mins => tempo_trabalhado_legacy)
    where data_inicio is not null
      and data_fim is null
      and tempo_trabalhado_legacy is not null
      and tempo_trabalhado_legacy > 0;
  end if;
end $$;

alter table public.time_logs
  add column tempo_trabalhado double precision generated always as (
    case
      when data_inicio is null or data_fim is null then 0
      else greatest(0, extract(epoch from (data_fim - data_inicio)) / 60.0)
    end
  ) stored;

alter table public.time_logs
  drop column if exists tempo_trabalhado_legacy;
