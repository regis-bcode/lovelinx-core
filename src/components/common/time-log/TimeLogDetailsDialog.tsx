import { useCallback, useMemo, useRef } from "react";
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

export type TimeLogDetailsProps = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  log: {
    id: string;
    taskId: string;
    taskTitle?: string;
    responsavel: string;
    tempoHHMMSS: string;
    tipo: "Automático" | "Manual";
    status: "Pendente" | "Aprovado" | "Reprovado";
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
  };
  onAprovar: (logId: string) => Promise<void> | void;
  onReprovar: (logId: string) => Promise<void> | void;
};

export function TimeLogDetailsDialog({
  open,
  onOpenChange,
  log,
  onAprovar,
  onReprovar
}: TimeLogDetailsProps) {
  const titleRef = useRef<HTMLHeadingElement>(null);

  const duration = useMemo(
    () => formatDuration(log.periodoInicioISO, log.periodoFimISO),
    [log.periodoInicioISO, log.periodoFimISO]
  );

  const handleClose = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  const handleAprovar = useCallback(() => {
    void onAprovar(log.id);
  }, [log.id, onAprovar]);

  const handleReprovar = useCallback(() => {
    void onReprovar(log.id);
  }, [log.id, onReprovar]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-5xl overflow-hidden bg-[#F7F9FF] p-0"
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
                <div className="rounded-3xl border border-[#CBD5F5] bg-gradient-to-br from-[#EEF3FF] to-[#F8FAFF] p-6 shadow-sm">
                  <div className="flex flex-col gap-6">
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div className="flex items-start gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                          <ClockIcon className="h-7 w-7" aria-hidden />
                        </div>
                        <div className="space-y-2">
                          <DialogTitle
                            id="time-log-dialog-title"
                            ref={titleRef}
                            tabIndex={-1}
                            className="text-2xl font-semibold tracking-tight text-slate-900"
                          >
                            Detalhes do registro de tempo
                          </DialogTitle>
                          <DialogDescription className="text-sm text-slate-600">
                            Registro <strong>#{log.id}</strong> vinculado à tarefa <strong>{log.taskId}</strong> com
                            duração registrada de <strong>{log.tempoHHMMSS}</strong>.
                          </DialogDescription>
                        </div>
                      </div>
                      <div className="hidden md:block md:mt-2">
                        <StatusChip status={log.status} />
                      </div>
                    </div>

                    <Separator className="border-[#D8E2FF]" />

                    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                      <Field
                        label="Tarefa"
                        value={
                          <div className="flex flex-col gap-1">
                            <span className="text-sm font-semibold text-slate-900 md:text-base">{log.taskId}</span>
                            <span className="text-xs text-slate-600 md:text-sm">{log.taskTitle || "Sem título"}</span>
                          </div>
                        }
                        tooltip={log.taskTitle}
                      />
                      <Field label="Responsável" value={log.responsavel} icon={<UserIcon className="h-4 w-4" />} />
                      <Field label="Tempo registrado" value={log.tempoHHMMSS} icon={<ClockIcon className="h-4 w-4" />} />
                      <div className="col-span-2 flex flex-col gap-3 md:col-span-1 md:items-end">
                        <Field
                          label="Tipo"
                          value={log.tipo}
                          icon={<BoltIcon className="h-4 w-4" />}
                          className="md:text-right"
                        />
                        <div className="md:hidden">
                          <StatusChip status={log.status} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </DialogHeader>

              <div className="grid gap-6 md:grid-cols-2">
                <Card className="rounded-3xl border border-[#DFE7FB] bg-white/90 shadow-[0px_12px_32px_rgba(15,23,42,0.06)]">
                  <CardHeader className="flex flex-row items-center gap-3 pb-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                      <CalendarIcon className="h-5 w-5" aria-hidden />
                    </div>
                    <div>
                      <CardTitle className="text-base font-semibold text-slate-900">Período</CardTitle>
                      <p className="text-xs text-muted-foreground">Linha do tempo deste registro</p>
                    </div>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 gap-4">
                    <Field label="Início" value={formatDateTimeBr(log.periodoInicioISO)} />
                    <Field label="Fim" value={formatDateTimeBr(log.periodoFimISO)} />
                    <Field label="Duração" value={duration} />
                  </CardContent>
                </Card>

                <Card className="rounded-3xl border border-[#DFE7FB] bg-white/90 shadow-[0px_12px_32px_rgba(15,23,42,0.06)]">
                  <CardHeader className="flex flex-row items-center gap-3 pb-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
                      <CheckCircleIcon className="h-5 w-5" aria-hidden />
                    </div>
                    <div>
                      <CardTitle className="text-base font-semibold text-slate-900">Aprovação</CardTitle>
                      <p className="text-xs text-muted-foreground">Origem e histórico de aprovação</p>
                    </div>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 gap-4">
                    <Field label="Aprovador" value={log.aprovador} placeholder="—" />
                    <Field label="Data" value={formatDateBr(log.dataAprovacaoISO)} />
                    <Field label="Hora" value={log.horaAprovacao} />
                    <Field label="Origem" value={log.tipo} />
                  </CardContent>
                </Card>

                <Card className="rounded-3xl border border-[#DFE7FB] bg-white/90 shadow-[0px_12px_32px_rgba(15,23,42,0.06)] md:col-span-2">
                  <CardHeader className="flex flex-row items-center gap-3 pb-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
                      <UserIcon className="h-5 w-5" aria-hidden />
                    </div>
                    <div>
                      <CardTitle className="text-base font-semibold text-slate-900">
                        Informações da tarefa
                      </CardTitle>
                      <p className="text-xs text-muted-foreground">Contexto completo da atividade</p>
                    </div>
                  </CardHeader>
                  <CardContent className="grid gap-4 md:grid-cols-2">
                    <Field label="Cliente" value={log.cliente} />
                    <Field label="Status da tarefa" value={log.statusTarefa} />
                    <Field label="Prioridade" value={log.prioridade} />
                    <Field
                      label="Conclusão"
                      value={
                        log.conclusaoPct !== undefined && log.conclusaoPct !== null
                          ? `${log.conclusaoPct}%`
                          : undefined
                      }
                    />
                    <Field
                      label="Cronograma"
                      value={
                        log.cronograma === null || log.cronograma === undefined
                          ? undefined
                          : log.cronograma
                          ? "No prazo"
                          : "Fora do prazo"
                      }
                    />
                    <Field label="Vencimento" value={formatDateBr(log.vencimentoISO)} />
                    <Field
                      label="Ordem"
                      value={
                        log.ordem === undefined || log.ordem === null ? undefined : `#${log.ordem.toString().padStart(2, "0")}`
                      }
                    />
                  </CardContent>
                </Card>

                <Card className="rounded-3xl border border-[#DFE7FB] bg-white/90 shadow-[0px_12px_32px_rgba(15,23,42,0.06)] md:col-span-2">
                  <CardHeader className="flex flex-row items-center gap-3 pb-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                      <DocumentTextIcon className="h-5 w-5" aria-hidden />
                    </div>
                    <div>
                      <CardTitle className="text-base font-semibold text-slate-900">
                        Descrição e atividade
                      </CardTitle>
                      <p className="text-xs text-muted-foreground">Detalhes do trabalho realizado</p>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm font-semibold tracking-wide text-slate-600">
                        <DocumentTextIcon className="h-4 w-4" aria-hidden />
                        Descrição
                      </div>
                      <ScrollArea className="max-h-40 rounded-2xl bg-[#F4F7FF] p-4">
                        <p className="text-sm leading-relaxed text-slate-700">
                          {log.descricao?.trim() ? log.descricao : "Sem descrição informada."}
                        </p>
                      </ScrollArea>
                    </div>
                    <Separator />
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm font-semibold tracking-wide text-slate-600">
                        <BoltIcon className="h-4 w-4" aria-hidden />
                        Atividade
                      </div>
                      <Timeline items={log.atividade} />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>

          <div className="sticky bottom-0 border-t border-[#CBD5F5] bg-[#EEF3FF]/95 px-6 py-4 backdrop-blur supports-[backdrop-filter]:bg-[#EEF3FF]/80 md:px-8">
            <div className="flex items-center gap-3">
              {log.status === "Pendente" ? (
                <div className="flex flex-1 justify-center gap-4">
                  <Button
                    onClick={handleReprovar}
                    className="flex items-center gap-2 rounded-2xl bg-rose-600 px-8 py-3 text-base font-semibold text-white shadow hover:bg-rose-700 focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2 h-14"
                  >
                    <XCircleIcon className="h-6 w-6" aria-hidden />
                    Reprovar
                  </Button>
                  <Button
                    onClick={handleAprovar}
                    className="flex items-center gap-2 rounded-2xl bg-emerald-600 px-8 py-3 text-base font-semibold text-white shadow hover:bg-emerald-700 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 h-14"
                  >
                    <CheckCircleIcon className="h-6 w-6" aria-hidden />
                    Aprovar
                  </Button>
                </div>
              ) : (
                <div className="flex flex-1 justify-center text-sm text-muted-foreground">
                  Ações concluídas para este registro.
                </div>
              )}
              <Button
                variant="secondary"
                onClick={handleClose}
                className="ml-auto h-14 rounded-2xl px-6 text-base font-semibold"
              >
                Fechar
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
