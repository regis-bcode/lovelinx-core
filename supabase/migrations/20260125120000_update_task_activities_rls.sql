-- Adjust task activities RLS policies to allow system generated entries

-- Ensure the user entry policy exists with the correct check
DROP POLICY IF EXISTS task_activities_insert_user_entries ON public.task_activities;

CREATE POLICY task_activities_insert_user_entries
ON public.task_activities FOR INSERT
TO authenticated
WITH CHECK (
  actor_id = auth.uid()
  AND kind IN ('comment', 'system.time_log')
);

-- Allow system generated activities to be inserted when triggered by authenticated users
DROP POLICY IF EXISTS task_activities_insert_system_entries ON public.task_activities;

CREATE POLICY task_activities_insert_system_entries
ON public.task_activities FOR INSERT
TO authenticated
WITH CHECK (
  kind LIKE 'system.%'
  AND (
    actor_id IS NULL
    OR actor_id = auth.uid()
  )
);

-- Allow service role to insert any activity rows for background processes
DROP POLICY IF EXISTS task_activities_insert_service_role ON public.task_activities;

CREATE POLICY task_activities_insert_service_role
ON public.task_activities FOR INSERT
TO service_role
WITH CHECK (TRUE);
