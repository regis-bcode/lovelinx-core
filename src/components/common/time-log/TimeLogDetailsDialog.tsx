import { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircleIcon, XCircleIcon, CalendarIcon, UserIcon, DocumentTextIcon } from "@heroicons/react/24/outline";
import { StatusChip } from "./StatusChip";
import { Field } from "./Field";
import { Timeline } from "./Timeline";
import { cn } from "@/lib/utils";
import { formatDateBr, formatDateTimeBr, formatDuration } from "./formatters";

export type LogStatus = "Pendente" | "Aprovado" | "Reprovado";

export type TimeLog = {
  id: string;
  taskId: string;
  taskTitle?: string;
  responsavel: string;
  tempoHHMMSS: string;
  tipo: "Automático" | "Manual";
  status: LogStatus;
  periodoInicioISO: string;
  periodoFimISO: string;
  aprovador?: string | null;
  dataAprovacaoISO?: string | null;
  horaAprovacao?: string | null;
  cliente?: string | null;
  prioridade?: "Baixa" | "Média" | "Alta" | null;
  statusTarefa?: string | null;
  conclusaoPct?: number | null;
  cronograma?: boolean | null;
  vencimentoISO?: string | null;
  ordem?: number | null;
  descricao?: string | null;
  atividade?: Array<{ hora: string; texto: string }>;
  observacoes?: string | null;
};

export type TimeLogDetailsProps = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  log?: TimeLog;
  onAprovar: (logId: string) => Promise<void> | void;
  onReprovar: (logId: string) => Promise<void> | void;
  viewTaskButton?: ReactNode;
  onConfirm?: (
    logId: string,
    payload: {
      status: "Aprovado" | "Reprovado";
      commissioned: boolean;
      performedAt: Date;
      approverName?: string | null;
    }
  ) => Promise<void> | void;
  resolveApproverName?: () => string | null;
};

export function TimeLogDetailsDialog({
  open,
  onOpenChange,
  log,
  onAprovar,
  onReprovar,
  viewTaskButton,
  onConfirm,
  resolveApproverName
}: TimeLogDetailsProps) {
  const titleRef = useRef<HTMLHeadingElement>(null);
  const status = log?.status ?? "Pendente";
  const start = log?.periodoInicioISO;
  const end = log?.periodoFimISO;
  const [selectedAction, setSelectedAction] = useState<"approve" | "reject" | null>(null);
  const [isCommissionedSelected, setIsCommissionedSelected] = useState(false);

  const duration = useMemo(() => formatDuration(start, end), [start, end]);

  const handleClose = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  const handleSelectApprove = useCallback(() => {
    if (!log || status !== "Pendente") return;
    setSelectedAction("approve");
  }, [log, status]);

  const handleSelectReject = useCallback(() => {
    if (!log || status !== "Pendente") return;
    setSelectedAction("reject");
    setIsCommissionedSelected(false);
  }, [log, status]);

  const handleToggleCommissioned = useCallback(() => {
    if (!log || status !== "Pendente") return;
    setIsCommissionedSelected((previous) => {
      const next = !previous;
      setSelectedAction(next ? "approve" : null);
      return next;
    });
  }, [log, status]);

  const handleConfirmAction = useCallback(() => {
    if (!log || status !== "Pendente" || !selectedAction) return;

    const performedAt = new Date();
    const statusLabel = selectedAction === "approve" ? "Aprovado" : "Reprovado";
    const commissioned = selectedAction === "approve" ? isCommissionedSelected : false;
    const resolvedApprover = (() => {
      try {
        const fromResolver = resolveApproverName?.();
        if (typeof fromResolver === "string") {
          const trimmed = fromResolver.trim();
          if (trimmed.length > 0) return trimmed;
        }
        if (fromResolver === null) {
          return null;
        }
      } catch (error) {
        console.error("Erro ao resolver nome do aprovador:", error);
      }

      if (typeof log.aprovador === "string") {
        const trimmed = log.aprovador.trim();
        if (trimmed.length > 0) {
          return trimmed;
        }
      }

      return null;
    })();

    if (onConfirm) {
      void onConfirm(log.id, {
        status: statusLabel,
        commissioned,
        performedAt,
        approverName: resolvedApprover
      });
    } else if (selectedAction === "approve") {
      void onAprovar(log.id);
    } else {
      void onReprovar(log.id);
    }
  }, [
    isCommissionedSelected,
    log,
    onAprovar,
    onConfirm,
    onReprovar,
    resolveApproverName,
    selectedAction,
    status
  ]);

  const isLoading = !log;

  useEffect(() => {
    if (!open) {
      setSelectedAction(null);
      setIsCommissionedSelected(false);
      return;
    }

    setSelectedAction(null);
    setIsCommissionedSelected(false);
  }, [log?.id, open]);

  const renderFieldSkeleton = (rows = 3) =>
    Array.from({ length: rows }).map((_, index) => (
      <div key={index} className="space-y-2">
        <Skeleton className="h-2 w-24" />
        <Skeleton className="h-9 w-full rounded-xl" />
      </div>
    ));

  const InfoItem = ({
    label,
    value,
    placeholder = "—",
    className
  }: {
    label: string;
    value?: ReactNode;
    placeholder?: string;
    className?: string;
  }) => {
    const resolved = value ?? placeholder;

    return (
      <div className={cn("space-y-2", className)}>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 shadow-sm">
          {resolved}
        </div>
      </div>
    );
  };

  const generalInfo = useMemo(() => {
    if (!log) {
      return [] as Array<{ key: string; label: string; value?: ReactNode }>;
    }

    return [
      {
        key: "task",
        label: "Tarefa",
        value: (
          <div className="space-y-1">
            <p className="text-base font-semibold text-slate-900">{log.taskTitle || "Sem título"}</p>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">#{log.taskId ?? "—"}</p>
          </div>
        )
      },
      {
        key: "owner",
        label: "Responsável",
        value: log.responsavel || "—"
      },
      {
        key: "type",
        label: "Tipo de registro",
        value: log.tipo || "—"
      },
      {
        key: "duration",
        label: "Tempo registrado",
        value: <span className="font-mono text-lg">{log.tempoHHMMSS || "—"}</span>
      },
      {
        key: "date",
        label: "Data do registro",
        value: formatDateBr(log.periodoInicioISO)
      },
      {
        key: "status",
        label: "Status",
        value: <StatusChip status={status} />
      }
    ];
  }, [log, status]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-4xl gap-0 overflow-hidden border border-slate-200 p-0"
        aria-labelledby="time-log-dialog-title"
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          requestAnimationFrame(() => titleRef.current?.focus());
        }}
      >
        <div className="flex max-h-[90vh] flex-col bg-slate-50">
          <div className="flex-1 overflow-y-auto">
            <div className="space-y-8 p-6 md:p-8">
              <DialogHeader className="space-y-6 text-left">
                <div className="flex flex-col gap-6 rounded-3xl bg-white p-6 shadow-sm md:flex-row md:items-start md:justify-between md:p-8">
                  <div className="flex flex-1 flex-col gap-4">
                    <div className="flex items-center gap-3 text-slate-500">
                      <DocumentTextIcon className="h-8 w-8" aria-hidden />
                      <span className="text-xs font-semibold uppercase tracking-[0.2em]">Registro de tempo</span>
                    </div>
                    <div className="space-y-3">
                      <DialogTitle
                        id="time-log-dialog-title"
                        ref={titleRef}
                        tabIndex={-1}
                        className="text-2xl font-semibold tracking-tight text-slate-900 md:text-[28px]"
                      >
                        Detalhes do registro de tempo
                      </DialogTitle>
                      <DialogDescription className="max-w-2xl text-sm leading-relaxed text-slate-600 md:text-base">
                        {log ? (
                          <>
                            Consulte as informações registradas para o apontamento <strong>#{log.id}</strong> vinculado à tarefa
                            <strong> {log.taskId}</strong>.
                          </>
                        ) : (
                          "Carregando dados do registro selecionado."
                        )}
                      </DialogDescription>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-3">
                    {viewTaskButton ? (
                      <div className="w-full md:w-auto">{viewTaskButton}</div>
                    ) : null}
                  </div>
                </div>
              </DialogHeader>

              <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
                <div className="grid gap-6 md:grid-cols-2">
                  {isLoading
                    ? renderFieldSkeleton(6)
                    : generalInfo.map((item) => (
                        <InfoItem key={item.key} label={item.label} value={item.value} />
                      ))}
                </div>
              </section>

              <div className="grid gap-6 md:grid-cols-2">
                <Card className="rounded-3xl border border-slate-200 bg-white shadow-sm">
                  <CardHeader className="flex flex-row items-center justify-between pb-4">
                    <div>
                      <CardTitle className="text-base font-semibold text-slate-900">Período registrado</CardTitle>
                      <p className="text-xs text-slate-500">Início, fim e duração calculada</p>
                    </div>
                    <CalendarIcon className="h-5 w-5 text-slate-400" aria-hidden />
                  </CardHeader>
                  <CardContent className="grid gap-4">
                    {isLoading ? (
                      renderFieldSkeleton(3)
                    ) : (
                      <>
                        <Field label="Início" value={formatDateTimeBr(start)} className="border-none bg-slate-50" />
                        <Field label="Fim" value={formatDateTimeBr(end)} className="border-none bg-slate-50" />
                        <Field label="Duração" value={duration} className="border-none bg-slate-50" />
                      </>
                    )}
                  </CardContent>
                </Card>

                <Card className="rounded-3xl border border-slate-200 bg-white shadow-sm">
                  <CardHeader className="flex flex-row items-center justify-between pb-4">
                    <div>
                      <CardTitle className="text-base font-semibold text-slate-900">Aprovação</CardTitle>
                      <p className="text-xs text-slate-500">Responsável, datas e origem</p>
                    </div>
                    <UserIcon className="h-5 w-5 text-slate-400" aria-hidden />
                  </CardHeader>
                  <CardContent className="grid gap-4">
                    {isLoading ? (
                      renderFieldSkeleton(4)
                    ) : (
                      <>
                        <Field label="Aprovador" value={log?.aprovador} className="border-none bg-slate-50" />
                        <Field label="Data" value={formatDateBr(log?.dataAprovacaoISO)} className="border-none bg-slate-50" />
                        <Field label="Hora" value={log?.horaAprovacao} className="border-none bg-slate-50" />
                        <Field label="Origem" value={log?.tipo} className="border-none bg-slate-50" />
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>

              <Card className="rounded-3xl border border-slate-200 bg-white shadow-sm">
                <CardHeader className="flex flex-col gap-2 pb-4">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    <DocumentTextIcon className="h-4 w-4" aria-hidden />
                    Atividade realizada
                  </div>
                  <CardTitle className="text-base font-semibold text-slate-900">Descrição do trabalho</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {isLoading ? (
                    <Skeleton className="h-24 w-full rounded-2xl" />
                  ) : (
                    <ScrollArea className="max-h-56 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-sm leading-relaxed text-slate-700">
                        {log?.observacoes?.trim() ? log.observacoes : "Nenhuma atividade registrada."}
                      </p>
                    </ScrollArea>
                  )}
                  {(isLoading || (log?.atividade && log.atividade.length > 0)) && (
                    <div className="space-y-3">
                      <Separator />
                      {isLoading ? (
                        <Skeleton className="h-24 w-full rounded-xl" />
                      ) : (
                        <Timeline items={log?.atividade} />
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="sticky bottom-0 z-10 w-full border-t bg-white/90 p-4 backdrop-blur supports-[backdrop-filter]:bg-white/70 md:p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="text-center text-sm text-slate-500 md:text-left">
                {isLoading
                  ? "Carregando ações..."
                  : status === "Pendente" && log
                  ? "Escolha uma ação para este registro."
                  : "Ações concluídas para este registro."}
              </div>
              <div className="flex flex-wrap items-center justify-center gap-3 md:justify-end">
                <Button
                  onClick={handleToggleCommissioned}
                  disabled={!log || status !== "Pendente"}
                  variant="outline"
                  className={cn(
                    "h-11 rounded-xl px-6 text-sm font-semibold uppercase tracking-wide",
                    selectedAction === "approve" && isCommissionedSelected
                      ? "border-emerald-500 bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                      : "border-slate-200 text-slate-600 hover:bg-slate-100"
                  )}
                >
                  Comissionado
                </Button>
                <Button
                  onClick={handleSelectApprove}
                  disabled={!log || status !== "Pendente"}
                  className={cn(
                    "h-11 rounded-xl bg-emerald-600 px-6 text-sm font-semibold uppercase tracking-wide text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300 disabled:text-white/70",
                    selectedAction === "approve" && !isCommissionedSelected
                      ? "ring-2 ring-emerald-300"
                      : null
                  )}
                >
                  <CheckCircleIcon className="mr-2 h-5 w-5" aria-hidden />
                  Aprovar
                </Button>
                <Button
                  onClick={handleSelectReject}
                  disabled={!log || status !== "Pendente"}
                  className={cn(
                    "h-11 rounded-xl bg-rose-600 px-6 text-sm font-semibold uppercase tracking-wide text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-rose-300 disabled:text-white/70",
                    selectedAction === "reject" ? "ring-2 ring-rose-300" : null
                  )}
                >
                  <XCircleIcon className="mr-2 h-5 w-5" aria-hidden />
                  Reprovar
                </Button>
                <Button
                  onClick={handleConfirmAction}
                  disabled={!log || status !== "Pendente" || !selectedAction}
                  className="h-11 rounded-xl bg-emerald-600 px-6 text-sm font-semibold uppercase tracking-wide text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300 disabled:text-white/70"
                >
                  OK
                </Button>
                <Button
                  variant="secondary"
                  onClick={handleClose}
                  className="h-11 rounded-xl px-6 text-sm font-semibold uppercase tracking-wide"
                >
                  Fechar
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
