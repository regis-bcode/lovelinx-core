import { ReactNode, useCallback, useMemo, useRef } from "react";
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
import {
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  CalendarIcon,
  UserIcon,
  DocumentTextIcon,
  BoltIcon
} from "@heroicons/react/24/outline";
import { StatusChip } from "./StatusChip";
import { Field } from "./Field";
import { Timeline } from "./Timeline";
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
};

export function TimeLogDetailsDialog({
  open,
  onOpenChange,
  log,
  onAprovar,
  onReprovar,
  viewTaskButton
}: TimeLogDetailsProps) {
  const titleRef = useRef<HTMLHeadingElement>(null);
  const status = log?.status ?? "Pendente";
  const start = log?.periodoInicioISO;
  const end = log?.periodoFimISO;

  const duration = useMemo(() => formatDuration(start, end), [start, end]);

  const handleClose = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  const handleAprovar = useCallback(() => {
    if (!log) return;
    void onAprovar(log.id);
  }, [log, onAprovar]);

  const handleReprovar = useCallback(() => {
    if (!log) return;
    void onReprovar(log.id);
  }, [log, onReprovar]);

  const summaryCards = useMemo(() => {
    if (!log) {
      return [] as Array<{ key: string }>; // placeholder for typing
    }

    return [
      {
        key: "task",
        label: "Tarefa",
        icon: <DocumentTextIcon className="h-5 w-5" aria-hidden />,
        content: (
          <div className="space-y-1">
            <p className="text-sm font-semibold text-slate-900 md:text-base">{log.taskId ?? "—"}</p>
            <p className="text-xs text-slate-500 md:text-sm">{log.taskTitle || "Sem título"}</p>
          </div>
        )
      },
      {
        key: "owner",
        label: "Responsável",
        icon: <UserIcon className="h-5 w-5" aria-hidden />,
        content: <span className="font-semibold text-slate-900">{log.responsavel || "—"}</span>
      },
      {
        key: "duration",
        label: "Tempo registrado",
        icon: <ClockIcon className="h-5 w-5" aria-hidden />,
        content: (
          <span className="font-mono text-lg font-semibold text-slate-900">
            {log.tempoHHMMSS || "—"}
          </span>
        )
      },
      {
        key: "type",
        label: "Tipo",
        icon: <BoltIcon className="h-5 w-5" aria-hidden />,
        content: <span className="font-semibold text-slate-900">{log.tipo || "—"}</span>
      }
    ];
  }, [log]);

  const isLoading = !log;

  const renderSummary = () => {
    if (isLoading) {
      return (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Card key={index} className="rounded-2xl border border-slate-200/60 bg-white/60">
              <CardContent className="flex items-start gap-3 p-5">
                <Skeleton className="h-11 w-11 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-2.5 w-20" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => (
          <Card
            key={card.key}
            className="rounded-2xl border border-slate-200/70 bg-white/95 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <CardContent className="flex items-start gap-3 p-5">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                {card.icon}
              </span>
              <div className="space-y-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  {card.label}
                </p>
                <div className="text-sm text-slate-700 md:text-base">{card.content}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  const renderFieldSkeleton = (rows = 3) =>
    Array.from({ length: rows }).map((_, index) => (
      <div
        key={index}
        className="rounded-2xl border border-slate-200/70 bg-white/70 p-4 shadow-sm"
      >
        <Skeleton className="mb-2 h-2.5 w-28" />
        <Skeleton className="h-4 w-40" />
      </div>
    ));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-5xl gap-0 p-0"
        aria-labelledby="time-log-dialog-title"
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          requestAnimationFrame(() => titleRef.current?.focus());
        }}
      >
        <div className="flex max-h-[90vh] flex-col">
          <div className="flex-1 overflow-y-auto">
            <div className="space-y-8 p-6 md:p-8">
              <DialogHeader className="space-y-6 text-left">
                <div className="flex flex-col gap-6 rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-slate-100 p-6 shadow-lg md:flex-row md:items-start md:justify-between md:p-8">
                  <div className="flex flex-1 flex-col gap-4 md:flex-row md:items-start">
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white text-slate-700 shadow-sm">
                      <DocumentTextIcon className="h-9 w-9" aria-hidden />
                    </div>
                    <div className="space-y-3">
                      <DialogTitle
                        id="time-log-dialog-title"
                        ref={titleRef}
                        tabIndex={-1}
                        className="text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl"
                      >
                        Detalhes do registro de tempo
                      </DialogTitle>
                      <DialogDescription className="max-w-2xl text-sm leading-relaxed text-slate-600 md:text-base">
                        {log ? (
                          <>
                            Consulte as informações registradas para o apontamento <strong>#{log.id}</strong> da tarefa
                            <strong> {log.taskId}</strong> com tempo registrado de <strong>{log.tempoHHMMSS}</strong>.
                          </>
                        ) : (
                          "Carregando dados do registro selecionado."
                        )}
                      </DialogDescription>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-3">
                    {log ? <StatusChip status={status} /> : <Skeleton className="h-7 w-28 rounded-full" />}
                    {viewTaskButton ? viewTaskButton : null}
                  </div>
                </div>
              </DialogHeader>

              {renderSummary()}

              <div className="grid gap-6 md:grid-cols-2">
                <Card className="rounded-3xl border border-slate-200/70 bg-white/95 shadow-sm">
                  <CardHeader className="flex flex-row items-center gap-3 pb-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                      <CalendarIcon className="h-5 w-5" aria-hidden />
                    </div>
                    <div>
                      <CardTitle className="text-base font-semibold text-slate-900">Período</CardTitle>
                      <p className="text-xs text-muted-foreground">Início, fim e duração calculada</p>
                    </div>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {isLoading ? (
                      <>{renderFieldSkeleton(3)}</>
                    ) : (
                      <>
                        <Field label="Início" value={formatDateTimeBr(start)} />
                        <Field label="Fim" value={formatDateTimeBr(end)} />
                        <Field label="Duração" value={duration} />
                      </>
                    )}
                  </CardContent>
                </Card>

                <Card className="rounded-3xl border border-slate-200/70 bg-white/95 shadow-sm">
                  <CardHeader className="flex flex-row items-center gap-3 pb-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                      <CheckCircleIcon className="h-5 w-5" aria-hidden />
                    </div>
                    <div>
                      <CardTitle className="text-base font-semibold text-slate-900">Aprovação</CardTitle>
                      <p className="text-xs text-muted-foreground">Responsável, datas e origem</p>
                    </div>
                  </CardHeader>
                  <CardContent className="grid gap-4">
                    {isLoading ? (
                      <>{renderFieldSkeleton(4)}</>
                    ) : (
                      <>
                        <Field label="Aprovador" value={log?.aprovador} />
                        <Field label="Data" value={formatDateBr(log?.dataAprovacaoISO)} />
                        <Field label="Hora" value={log?.horaAprovacao} />
                        <Field label="Origem" value={log?.tipo} />
                      </>
                    )}
                  </CardContent>
                </Card>

                <Card className="rounded-3xl border border-slate-200/70 bg-white/95 shadow-sm md:col-span-2">
                  <CardHeader className="flex flex-row items-center gap-3 pb-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                      <UserIcon className="h-5 w-5" aria-hidden />
                    </div>
                    <div>
                      <CardTitle className="text-base font-semibold text-slate-900">Informações da tarefa</CardTitle>
                      <p className="text-xs text-muted-foreground">Contexto adicional do apontamento</p>
                    </div>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    {isLoading ? (
                      <>{renderFieldSkeleton(8)}</>
                    ) : (
                      <>
                        <Field label="Cliente" value={log?.cliente} />
                        <Field label="Status" value={log?.statusTarefa} />
                        <Field label="Prioridade" value={log?.prioridade} />
                        <Field
                          label="% Conclusão"
                          value={
                            log?.conclusaoPct === null || log?.conclusaoPct === undefined
                              ? undefined
                              : `${log.conclusaoPct}%`
                          }
                        />
                        <Field
                          label="Cronograma"
                          value={
                            log?.cronograma === null || log?.cronograma === undefined
                              ? undefined
                              : log.cronograma
                              ? "No prazo"
                              : "Fora do prazo"
                          }
                        />
                        <Field label="Vencimento" value={formatDateBr(log?.vencimentoISO)} />
                        <Field
                          label="Ordem"
                          value={
                            log?.ordem === null || log?.ordem === undefined
                              ? undefined
                              : `#${log.ordem.toString().padStart(2, "0")}`
                          }
                        />
                        <Field
                          label="ATIVIDADES"
                          value={log?.observacoes}
                          placeholder="Nenhuma atividade registrada."
                        />
                      </>
                    )}
                  </CardContent>
                </Card>

                <Card className="rounded-3xl border border-slate-200/70 bg-white/95 shadow-sm md:col-span-2">
                  <CardHeader className="flex flex-row items-center gap-3 pb-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                      <DocumentTextIcon className="h-5 w-5" aria-hidden />
                    </div>
                    <div>
                      <CardTitle className="text-base font-semibold text-slate-900">Descrição e atividade</CardTitle>
                      <p className="text-xs text-muted-foreground">Narrativa do trabalho realizado</p>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm font-semibold text-slate-600">
                        <DocumentTextIcon className="h-4 w-4" aria-hidden />
                        Descrição da tarefa
                      </div>
                      {isLoading ? (
                        <Skeleton className="h-32 w-full rounded-2xl" />
                      ) : (
                        <ScrollArea className="max-h-48 rounded-2xl border border-slate-200/70 bg-slate-50 p-4">
                          <p className="text-sm leading-relaxed text-slate-700">
                            <span className="font-semibold text-slate-600">Descrição da tarefa:</span>{" "}
                            <span className="font-medium text-slate-900">
                              {log?.descricao?.trim() ? log.descricao : "Nenhuma descrição registrada."}
                            </span>
                          </p>
                        </ScrollArea>
                      )}
                    </div>
                    <Separator />
                    {(isLoading || (log?.atividade && log.atividade.length > 0)) && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-sm font-semibold text-slate-600">
                          <BoltIcon className="h-4 w-4" aria-hidden />
                          Atividade registrada
                        </div>
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
          </div>

          <div className="sticky bottom-0 z-10 w-full border-t bg-background/95 p-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="text-center text-sm text-muted-foreground md:text-left">
                {isLoading
                  ? "Carregando ações..."
                  : status === "Pendente" && log
                  ? "Escolha uma ação para este registro."
                  : "Ações concluídas para este registro."}
              </div>
              <div className="flex flex-wrap items-center justify-center gap-3 md:justify-end">
                <Button
                  onClick={handleAprovar}
                  disabled={!log || status !== "Pendente"}
                  className="h-12 rounded-xl bg-emerald-600 px-6 text-sm font-semibold uppercase tracking-wide text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300 disabled:text-white/70"
                >
                  <CheckCircleIcon className="mr-2 h-5 w-5" aria-hidden />
                  Aprovar
                </Button>
                <Button
                  onClick={handleReprovar}
                  disabled={!log || status !== "Pendente"}
                  className="h-12 rounded-xl bg-rose-600 px-6 text-sm font-semibold uppercase tracking-wide text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-rose-300 disabled:text-white/70"
                >
                  <XCircleIcon className="mr-2 h-5 w-5" aria-hidden />
                  Reprovar
                </Button>
                <Button
                  variant="secondary"
                  onClick={handleClose}
                  className="h-12 rounded-xl px-6 text-sm font-semibold uppercase tracking-wide"
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
