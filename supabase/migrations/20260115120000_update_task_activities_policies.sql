-- Allow system time log activities and update insert policy
alter table public.task_activities
  drop constraint if exists task_activities_kind_check;

alter table public.task_activities
  add constraint task_activities_kind_check
  check (kind in (
    'system.created',
    'system.updated',
    'system.deleted',
    'system.status_changed',
    'system.due_date_changed',
    'system.priority_changed',
    'system.assignee_changed',
    'system.time_log',
    'comment'
  ));

drop policy if exists task_activities_insert_comment on public.task_activities;

create policy task_activities_insert_user_entries
on public.task_activities for insert
to authenticated
with check (
  actor_id = auth.uid()
  and kind in ('comment', 'system.time_log')
);
