-- Helper function to insert audit logs with RLS-safe privileges
create or replace function public.insert_log_audit_task(
  _task_id uuid,
  _audit_operation text,
  _de jsonb default null,
  _para jsonb default null,
  _task_snapshot jsonb default null
)
returns public.log_audit_tasks
language plpgsql
security definer
set search_path = public
as $$
declare
  v_operation text := upper(trim(_audit_operation));
  v_user uuid := public.safe_auth_uid();
  v_result public.log_audit_tasks;
begin
  if v_operation is null or v_operation not in ('INSERT', 'UPDATE', 'DELETE') then
    raise exception 'Invalid audit operation: %', v_operation
      using errcode = '22023';
  end if;

  insert into public.log_audit_tasks as l (
    task_id,
    audit_operation,
    audit_user,
    de,
    para,
    task_snapshot
  ) values (
    _task_id,
    v_operation,
    v_user,
    _de,
    _para,
    _task_snapshot
  )
  returning l.* into v_result;

  return v_result;
end;
$$;

do $$
begin
  grant execute on function public.insert_log_audit_task(uuid, text, jsonb, jsonb, jsonb) to authenticated;
exception
  when undefined_function then
    null;
end;
$$;
