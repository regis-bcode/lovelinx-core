import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type AuditOp = "UPDATE" | "DELETE" | "INSERT";
export type AuditLogRow = Database["public"]["Tables"]["log_audit_tasks"]["Row"];

export async function fetchAuditLogs(params: {
  taskId?: string;
  op?: AuditOp;
  from?: string;
  to?: string;
  limit?: number;
} = {}): Promise<AuditLogRow[]> {
  const { taskId, op, from, to, limit = 200 } = params;

  let query = supabase
    .from("log_audit_tasks")
    .select("*")
    .order("audit_timestamp", { ascending: false })
    .limit(limit);

  if (taskId) {
    query = query.eq("task_id", taskId);
  }
  if (op) {
    query = query.eq("audit_operation", op);
  }
  if (from) {
    query = query.gte("audit_timestamp", from);
  }
  if (to) {
    query = query.lte("audit_timestamp", to);
  }

  const { data, error } = await query;
  if (error) {
    throw error;
  }

  return data ?? [];
}
