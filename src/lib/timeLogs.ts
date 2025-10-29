import { supabase } from "@/lib/supabaseClient";

export type ApprovalAction = "aprovar" | "reprovar" | "pendente";

export async function setTimeLogApproval(params: {
  timeLogId: string;
  action: ApprovalAction;
  aprovadorId: string;
  aprovadorNome: string;
  comissionado?: boolean;
  justificativa?: string | null;
}) {
  const {
    timeLogId,
    action,
    aprovadorId,
    aprovadorNome,
    comissionado = false,
    justificativa = null,
  } = params;

  if (action === "reprovar" && !String(justificativa ?? "").trim()) {
    throw new Error("Justificativa é obrigatória para reprovação.");
  }

  const { data, error } = await supabase.rpc("set_time_log_approval", {
    p_log_id: timeLogId,
    p_action: action,
    p_aprovador_id: aprovadorId,
    p_aprovador_nome: aprovadorNome,
    p_comissionado: comissionado ? "sim" : "não",
    p_justificativa: justificativa,
  });

  if (error) throw error;
  return data;
}

