-- Task activities tracking for tasks and comments
create table if not exists public.task_activities (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  actor_id uuid null,
  kind text not null check (kind in (
    'system.created',
    'system.updated',
    'system.deleted',
    'system.status_changed',
    'system.due_date_changed',
    'system.priority_changed',
    'system.assignee_changed',
    'comment'
  )),
  title text not null,
  message text null,
  comment_body text null,
  payload jsonb null,
  created_at timestamptz not null default now()
);

create index if not exists idx_task_activities_task_id on public.task_activities(task_id);
create index if not exists idx_task_activities_created_at on public.task_activities(created_at desc);
create index if not exists idx_task_activities_kind on public.task_activities(kind);

create or replace function public.safe_auth_uid()
returns uuid
language plpgsql
stable
as $$
declare v_uid uuid;
begin
  begin
    v_uid := auth.uid();
  exception
    when others then
      v_uid := null;
  end;
  return v_uid;
end;
$$;

create or replace function public.jsonb_changed_keys(a jsonb, b jsonb)
returns text[]
language sql
as $$
  select coalesce(array_agg(k), '{}')::text[]
  from (
    select k
    from (
      select key as k from jsonb_object_keys(coalesce(a, '{}'::jsonb)) as key
      union
      select key as k from jsonb_object_keys(coalesce(b, '{}'::jsonb)) as key
    ) keys
    where coalesce(a->k, 'null'::jsonb) is distinct from coalesce(b->k, 'null'::jsonb)
  ) t;
$$;

create or replace function public.task_activities_after_insert()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.task_activities(task_id, actor_id, kind, title, message, payload)
  values (new.id, public.safe_auth_uid(), 'system.created', 'Tarefa criada', null, jsonb_build_object('para', to_jsonb(new)));
  return new;
end;
$$;

create or replace function public.task_activities_after_update()
returns trigger
language plpgsql
security definer
as $$
declare
  changed text[];
begin
  if old is not distinct from new then
    return new;
  end if;

  changed := public.jsonb_changed_keys(to_jsonb(old), to_jsonb(new));

  if old.status is distinct from new.status then
    insert into public.task_activities(task_id, actor_id, kind, title, payload)
    values (new.id, public.safe_auth_uid(), 'system.status_changed', 'Status alterado', jsonb_build_object('de', old.status, 'para', new.status));
  end if;

  if old.due_date is distinct from new.due_date then
    insert into public.task_activities(task_id, actor_id, kind, title, payload)
    values (new.id, public.safe_auth_uid(), 'system.due_date_changed', 'Data final alterada', jsonb_build_object('de', old.due_date, 'para', new.due_date));
  end if;

  if old.priority is distinct from new.priority then
    insert into public.task_activities(task_id, actor_id, kind, title, payload)
    values (new.id, public.safe_auth_uid(), 'system.priority_changed', 'Prioridade alterada', jsonb_build_object('de', old.priority, 'para', new.priority));
  end if;

  if old.assignee_id is distinct from new.assignee_id then
    insert into public.task_activities(task_id, actor_id, kind, title, payload)
    values (new.id, public.safe_auth_uid(), 'system.assignee_changed', 'Responsável alterado', jsonb_build_object('de', old.assignee_id, 'para', new.assignee_id));
  end if;

  insert into public.task_activities(task_id, actor_id, kind, title, payload, message)
  values (new.id, public.safe_auth_uid(), 'system.updated', 'Tarefa atualizada', jsonb_build_object('de', to_jsonb(old), 'para', to_jsonb(new), 'campos', changed), null);

  return new;
end;
$$;

create or replace function public.task_activities_after_delete()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.task_activities(task_id, actor_id, kind, title, payload)
  values (old.id, public.safe_auth_uid(), 'system.deleted', 'Tarefa excluída', jsonb_build_object('de', to_jsonb(old)));
  return old;
end;
$$;

drop trigger if exists trg_tasks_after_insert on public.tasks;
create trigger trg_tasks_after_insert
after insert on public.tasks
for each row
execute function public.task_activities_after_insert();

drop trigger if exists trg_tasks_after_update on public.tasks;
create trigger trg_tasks_after_update
after update on public.tasks
for each row
when (old is distinct from new)
execute function public.task_activities_after_update();

drop trigger if exists trg_tasks_after_delete on public.tasks;
create trigger trg_tasks_after_delete
after delete on public.tasks
for each row
execute function public.task_activities_after_delete();

alter table public.task_activities enable row level security;

create policy if not exists task_activities_read
on public.task_activities for select
to authenticated
using (true);

create policy if not exists task_activities_insert_comment
on public.task_activities for insert
to authenticated
with check (
  kind = 'comment'
  and actor_id = auth.uid()
);
