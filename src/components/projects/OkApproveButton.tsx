import React, { useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { setTimeLogApproval, ApprovalAction } from "@/lib/timeLogs";

type Toast = (args: { title: string; description?: string; variant?: "default" | "destructive" }) => void;

export default function OkApproveButton(props: {
  selectedTimeLog: { id: string } | null;
  acaoSelecionada: ApprovalAction;  // 'aprovar' | 'reprovar' | 'pendente'
  comissionado: boolean;
  justificativa?: string;
  aprovadorNomeUI?: string;
  onClose: () => void;
  refetchList: () => Promise<void>;
  toast: Toast;
}) {
  const { selectedTimeLog, acaoSelecionada, comissionado, justificativa, aprovadorNomeUI, onClose, refetchList, toast } = props;
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);

  const disabled =
    submitting ||
    !selectedTimeLog?.id ||
    !acaoSelecionada ||
    (acaoSelecionada === "reprovar" && !String(justificativa ?? "").trim());

  const aprovadorNome = useMemo(
    () =>
      aprovadorNomeUI ??
      (typeof user?.name === "string" && user.name.trim().length > 0
        ? user.name.trim()
        : user?.email ?? "Aprovador"),
    [aprovadorNomeUI, user?.email, user?.name]
  );

  async function handleConfirm() {
    if (!user) {
      toast({ title: "Sessão expirada", description: "Faça login novamente.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      await setTimeLogApproval({
        timeLogId: selectedTimeLog!.id,
        action: acaoSelecionada,
        aprovadorId: user.id,
        aprovadorNome,
        comissionado,
        justificativa: justificativa ?? null,
      });

      toast({
        title:
          acaoSelecionada === "aprovar"
            ? "Registro aprovado"
            : acaoSelecionada === "reprovar"
            ? "Registro reprovado"
            : "Registro pendente",
      });

      await refetchList();
      onClose();
    } catch (e: any) {
      toast({ title: "Erro ao confirmar", description: e?.message ?? "Tente novamente.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleConfirm}
      disabled={disabled}
      className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium h-10 px-4 py-2 bg-green-600 text-white hover:bg-green-700
                 ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
                 disabled:pointer-events-none disabled:opacity-50"
      data-lov-id="OkApproveButton"
    >
      {submitting ? "Salvando..." : "OK"}
    </button>
  );
}

