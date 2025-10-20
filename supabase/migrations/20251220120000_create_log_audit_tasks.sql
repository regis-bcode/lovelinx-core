-- Create table to keep an audit trail of changes applied to public.tasks
create table if not exists public.log_audit_tasks (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null,
  audit_operation text not null check (audit_operation in ('INSERT', 'UPDATE', 'DELETE')),
  audit_timestamp timestamptz not null default now(),
  audit_user uuid,
  task_snapshot jsonb not null,
  constraint log_audit_tasks_task_id_fkey foreign key (task_id) references public.tasks(id)
);

create index if not exists idx_log_audit_tasks_task_id on public.log_audit_tasks(task_id);
create index if not exists idx_log_audit_tasks_audit_timestamp on public.log_audit_tasks(audit_timestamp);

create or replace function public.fn_log_audit_tasks()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_snapshot jsonb;
  v_task_id uuid;
begin
  if tg_op = 'DELETE' then
    v_snapshot := to_jsonb(old);
    v_task_id := old.id;
  else
    v_snapshot := to_jsonb(new);
    v_task_id := new.id;
  end if;

  insert into public.log_audit_tasks (task_id, audit_operation, audit_user, task_snapshot)
  values (v_task_id, tg_op, v_user, v_snapshot);

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_log_audit_tasks on public.tasks;

create trigger trg_log_audit_tasks
after insert or update or delete on public.tasks
for each row execute function public.fn_log_audit_tasks();
