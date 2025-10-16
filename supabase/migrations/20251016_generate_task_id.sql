create or replace function public.generate_task_id() returns trigger as $$
declare
  next_n integer;
begin
  select coalesce(max((regexp_replace(task_id,'[^0-9]','','g'))::int), 0) + 1
    into next_n
  from public.tasks
  where project_id = new.project_id;

  new.task_id := 'TASK-' || lpad(next_n::text, 3, '0');
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_tasks_task_id on public.tasks;

create trigger trg_tasks_task_id
before insert on public.tasks
for each row
when (new.task_id is null or new.task_id = '')
execute function public.generate_task_id();
