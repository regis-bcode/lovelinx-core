-- =========================================
-- 🔹 AJUSTES DE INTEGRIDADE E CONSISTÊNCIA
-- =========================================
alter table public.time_logs
  drop constraint if exists chk_status_aprovacao,
  drop constraint if exists chk_aprovado,
  drop constraint if exists chk_comissionado;

alter table public.time_logs
  add constraint chk_status_aprovacao
    check (status_aprovacao in ('pendente','aprovado','reprovado')),
  add constraint chk_aprovado
    check (aprovado in ('sim','não')),
  add constraint chk_comissionado
    check (comissionado in ('sim','não'));

-- Trigger para obrigar justificativa quando reprovado
create or replace function trg_time_logs_justificativa_check()
returns trigger language plpgsql as $$
begin
  if new.status_aprovacao = 'reprovado'
     and (new.justificativa_reprovacao is null or length(trim(new.justificativa_reprovacao))=0) then
    raise exception 'Justificativa é obrigatória quando reprovado.';
  end if;
  return new;
end$$;

drop trigger if exists tg_time_logs_justificativa_check on public.time_logs;
create trigger tg_time_logs_justificativa_check
before insert or update on public.time_logs
for each row execute function trg_time_logs_justificativa_check();

-- Trigger para atualizar o campo updated_at automaticamente
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end$$;

drop trigger if exists tg_set_updated_at on public.time_logs;
create trigger tg_set_updated_at
before update on public.time_logs
for each row execute function set_updated_at();

-- =========================================
-- 🔹 FUNÇÃO RPC PARA APROVAR / REPROVAR
-- =========================================
create or replace function set_time_log_approval(
  p_log_id uuid,
  p_action text,                 -- 'aprovar' | 'reprovar' | 'pendente'
  p_aprovador_id uuid,
  p_aprovador_nome text,
  p_comissionado text default 'não',  -- 'sim' | 'não'
  p_justificativa text default null
)
returns public.time_logs
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := now();
  v_row public.time_logs;
begin
  if p_action not in ('aprovar','reprovar','pendente') then
    raise exception 'Ação inválida: %', p_action;
  end if;

  if p_action = 'reprovar' and (p_justificativa is null or length(trim(p_justificativa))=0) then
    raise exception 'Justificativa é obrigatória para reprovação.';
  end if;

  if p_action = 'aprovar' then
    update public.time_logs
       set status_aprovacao = 'aprovado',
           aprovado         = 'sim',
           comissionado     = p_comissionado,
           aprovador_id     = p_aprovador_id,
           aprovador_nome   = p_aprovador_nome,
           data_aprovacao   = v_now,
           aprovacao_hora   = v_now::time,
           justificativa_reprovacao = null,
           updated_at       = v_now
     where id = p_log_id
     returning * into v_row;

  elsif p_action = 'reprovar' then
    update public.time_logs
       set status_aprovacao = 'reprovado',
           aprovado         = 'não',
           comissionado     = 'não',
           aprovador_id     = p_aprovador_id,
           aprovador_nome   = p_aprovador_nome,
           data_aprovacao   = v_now,
           aprovacao_hora   = v_now::time,
           justificativa_reprovacao = p_justificativa,
           updated_at       = v_now
     where id = p_log_id
     returning * into v_row;

  else -- pendente
    update public.time_logs
       set status_aprovacao = 'pendente',
           aprovado         = 'não',
           comissionado     = 'não',
           aprovador_id     = null,
           aprovador_nome   = null,
           data_aprovacao   = null,
           aprovacao_hora   = null,
           justificativa_reprovacao = null,
           updated_at       = v_now
     where id = p_log_id
     returning * into v_row;
  end if;

  if v_row.id is null then
    raise exception 'Registro não encontrado para aprovação (%).', p_log_id;
  end if;

  return v_row;
end;
$$;

-- =========================================
-- 🔹 POLÍTICA DE SEGURANÇA RLS
-- =========================================
do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname='public'
    and tablename='time_logs' and policyname='time_logs_update_by_approver'
  ) then
    create policy time_logs_update_by_approver
    on public.time_logs
    for update
    using (
      exists (
        select 1 from public.profiles p
        where p.id = auth.uid() and coalesce(p.is_approver,false) = true
      )
    );
  end if;
end $$;

-- =========================================
-- 🔹 ÍNDICES PARA PERFORMANCE
-- =========================================
create index if not exists idx_time_logs_status on public.time_logs(status_aprovacao);
create index if not exists idx_time_logs_task on public.time_logs(task_id);
create index if not exists idx_time_logs_aprovador on public.time_logs(aprovador_id);

