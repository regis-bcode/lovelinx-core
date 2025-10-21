-- Relax task activity policy to allow time log entries when referencing the author's log
DROP POLICY IF EXISTS task_activities_insert_user_entries ON public.task_activities;

CREATE POLICY task_activities_insert_user_entries
ON public.task_activities FOR INSERT
TO authenticated
WITH CHECK (
  CASE
    WHEN kind = 'comment' THEN actor_id = auth.uid()
    WHEN kind = 'system.time_log' THEN (
      actor_id = auth.uid()
      OR (
        coalesce(payload, '{}'::jsonb) ? 'time_log_id'
        AND EXISTS (
          SELECT 1
          FROM public.time_logs tl
          WHERE tl.id = (NULLIF(coalesce(payload, '{}'::jsonb)->>'time_log_id', ''))::uuid
            AND tl.user_id = auth.uid()
        )
      )
    )
    ELSE FALSE
  END
);
