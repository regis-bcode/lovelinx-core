-- Update audit logging for public.tasks using existing log_audit_tasks table

-- Add the new JSON columns when missing and relax legacy requirement
alter table public.log_audit_tasks
  add column if not exists de   jsonb,
  add column if not exists para jsonb;

alter table public.log_audit_tasks
  alter column task_snapshot drop not null;

-- Backfill existing rows from the legacy snapshot column
update public.log_audit_tasks
   set para = coalesce(para, task_snapshot)
 where audit_operation = 'INSERT'
   and para is null;

update public.log_audit_tasks
   set de = coalesce(de, task_snapshot)
 where audit_operation in ('UPDATE', 'DELETE')
   and de is null;

-- Ensure consistent index naming
alter index if exists idx_log_audit_tasks_audit_timestamp rename to idx_log_audit_tasks_timestamp;

-- Useful indexes
create index if not exists idx_log_audit_tasks_task_id on public.log_audit_tasks(task_id);
create index if not exists idx_log_audit_tasks_timestamp on public.log_audit_tasks(audit_timestamp);
create index if not exists idx_log_audit_tasks_operation on public.log_audit_tasks(audit_operation);

-- Helper to safely obtain the authenticated user
create or replace function public.safe_auth_uid()
returns uuid
language plpgsql
stable
as $$
declare v_uid uuid;
begin
  begin
    v_uid := auth.uid();
  exception when others then
    v_uid := null;
  end;
  return v_uid;
end;
$$;

-- Remove legacy trigger/function that wrote to task_snapshot
drop trigger if exists trg_log_audit_tasks on public.tasks;
drop function if exists public.fn_log_audit_tasks();

-- Function responsible for auditing UPDATE and DELETE operations
create or replace function public.log_tasks_audit()
returns trigger
language plpgsql
security definer
as $$
begin
  if (tg_op = 'UPDATE') then
    insert into public.log_audit_tasks(
      task_id, audit_operation, audit_timestamp, audit_user, de, para
    ) values (
      new.id, 'UPDATE', now(), public.safe_auth_uid(), to_jsonb(old), to_jsonb(new)
    );
    return new;

  elsif (tg_op = 'DELETE') then
    insert into public.log_audit_tasks(
      task_id, audit_operation, audit_timestamp, audit_user, de, para
    ) values (
      old.id, 'DELETE', now(), public.safe_auth_uid(), to_jsonb(old), null
    );
    return old;
  end if;

  return null;
end;
$$;

-- Triggers for UPDATE and DELETE operations
drop trigger if exists trg_log_tasks_update on public.tasks;
create trigger trg_log_tasks_update
after update on public.tasks
for each row
when (old is distinct from new)
execute function public.log_tasks_audit();

drop trigger if exists trg_log_tasks_delete on public.tasks;
create trigger trg_log_tasks_delete
after delete on public.tasks
for each row
execute function public.log_tasks_audit();
