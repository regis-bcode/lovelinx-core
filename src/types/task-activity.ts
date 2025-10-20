export type TaskActivityKind =
  | 'system.created'
  | 'system.updated'
  | 'system.deleted'
  | 'system.status_changed'
  | 'system.due_date_changed'
  | 'system.priority_changed'
  | 'system.assignee_changed'
  | 'comment';

export interface TaskActivity {
  id: string;
  task_id: string;
  actor_id: string | null;
  kind: TaskActivityKind;
  title: string;
  message: string | null;
  comment_body: string | null;
  payload: unknown | null;
  created_at: string;
}
