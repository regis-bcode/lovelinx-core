import React, { CSSProperties, useCallback, useMemo, useRef } from "react";
import {
  addDays,
  differenceInCalendarDays,
  eachDayOfInterval,
  endOfWeek,
  format,
  isSameDay,
  isWeekend,
  startOfDay,
  startOfWeek,
} from "date-fns";
import { ptBR } from "date-fns/locale";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const DAY_WIDTH = 56;
const ROW_HEIGHT = 72;
const BAR_HEIGHT = 34;
const MIN_TIMELINE_DAYS = 14;

const PRIORITY_STYLES: Record<string, { dotClass: string; barClass: string }> = {
  baixa: { dotClass: "bg-emerald-500", barClass: "bg-emerald-500" },
  média: { dotClass: "bg-sky-500", barClass: "bg-sky-500" },
  media: { dotClass: "bg-sky-500", barClass: "bg-sky-500" },
  alta: { dotClass: "bg-amber-500", barClass: "bg-amber-500" },
  crítica: { dotClass: "bg-rose-500", barClass: "bg-rose-500" },
  critica: { dotClass: "bg-rose-500", barClass: "bg-rose-500" },
  default: { dotClass: "bg-slate-400", barClass: "bg-slate-500" },
};

type NullableDate = string | Date | null | undefined;

type TaskGanttTaskLike = {
  id?: string | null;
  tarefa?: string | null;
  responsavel?: string | null;
  prioridade?: string | null;
  status?: string | null;
  percentual_conclusao?: number | null;
  data_prevista_entrega?: NullableDate;
  data_prevista_validacao?: NullableDate;
  data_vencimento?: NullableDate;
  data_entrega?: NullableDate;
  created_at?: NullableDate;
  cronograma?: boolean | null;
  _tempId?: string;
  _isNew?: boolean;
  isDraft?: boolean;
};

type GanttItem<TaskType extends TaskGanttTaskLike> = {
  key: string;
  task: TaskType;
  index: number;
  name: string;
  responsavel: string | null;
  status: string | null;
  priorityKey: string;
  startDate: Date;
  endDate: Date;
  hasDefinedStart: boolean;
  hasDefinedEnd: boolean;
  progress: number;
  progressLabel: string;
  isComplete: boolean;
  isOverdue: boolean;
};

interface TaskGanttViewProps<TaskType extends TaskGanttTaskLike = TaskGanttTaskLike> {
  tasks: TaskType[];
  isLoading?: boolean;
  onTaskClick?: (task: TaskType, index: number) => void;
}

const parseDateValue = (value: NullableDate): Date | null => {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const parsed = new Date(String(value));
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export function TaskGanttView<TaskType extends TaskGanttTaskLike>({
  tasks,
  isLoading = false,
  onTaskClick,
}: TaskGanttViewProps<TaskType>) {
  const headerScrollRef = useRef<HTMLDivElement | null>(null);
  const bodyScrollRef = useRef<HTMLDivElement | null>(null);
  const isSyncingRef = useRef(false);

  const today = useMemo(() => startOfDay(new Date()), []);

  const { items, days, timelineStart } = useMemo(() => {
    if (!tasks.length) {
      return {
        items: [] as GanttItem<TaskType>[],
        days: [] as Date[],
        timelineStart: today,
      };
    }

    const baseItems = tasks.map<GanttItem<TaskType> | null>((task, index) => {
      const name = typeof task.tarefa === "string" && task.tarefa.trim().length > 0
        ? task.tarefa.trim()
        : "Tarefa sem título";

      const startCandidates: NullableDate[] = [
        task.data_prevista_entrega,
        task.data_vencimento,
        task.data_entrega,
        task.created_at,
      ];

      const endCandidates: NullableDate[] = [
        task.data_prevista_validacao,
        task.data_vencimento,
        task.data_entrega,
        task.data_prevista_entrega,
        task.created_at,
      ];

      const parsedStartCandidate = startCandidates
        .map(candidate => parseDateValue(candidate))
        .find((date): date is Date => Boolean(date));
      const parsedEndCandidate = endCandidates
        .map(candidate => parseDateValue(candidate))
        .find((date): date is Date => Boolean(date));

      const startDate = startOfDay(parsedStartCandidate ?? new Date());
      let endDate = startOfDay(parsedEndCandidate ?? parsedStartCandidate ?? startDate);

      if (differenceInCalendarDays(endDate, startDate) < 0) {
        endDate = startDate;
      }

      const progressRaw = typeof task.percentual_conclusao === "number"
        ? task.percentual_conclusao
        : 0;
      const progress = clamp(Number.isFinite(progressRaw) ? progressRaw / 100 : 0, 0, 1);
      const progressLabel = `${Math.round(progress * 100)}%`;
      const isComplete = progress >= 0.999;

      const key = task.id
        ?? task._tempId
        ?? `task-${index}`;

      const priorityKey = typeof task.prioridade === "string"
        ? task.prioridade.trim().toLowerCase()
        : "";

      const responsavel = typeof task.responsavel === "string" && task.responsavel.trim().length > 0
        ? task.responsavel.trim()
        : null;

      const status = typeof task.status === "string" && task.status.trim().length > 0
        ? task.status.trim()
        : null;

      return {
        key,
        task,
        index,
        name,
        responsavel,
        status,
        priorityKey,
        startDate,
        endDate,
        hasDefinedStart: Boolean(parsedStartCandidate),
        hasDefinedEnd: Boolean(parsedEndCandidate),
        progress,
        progressLabel,
        isComplete,
        isOverdue: !isComplete && differenceInCalendarDays(today, endDate) > 0,
      } satisfies GanttItem<TaskType>;
    }).filter((item): item is GanttItem<TaskType> => Boolean(item));

    const filteredItems = baseItems.filter(item => {
      const rawTask = item.task as TaskGanttTaskLike;
      const isDraft = Boolean(rawTask._isNew || rawTask.isDraft);
      const hasTitle = typeof rawTask.tarefa === "string" && rawTask.tarefa.trim().length > 0;
      return !isDraft || hasTitle;
    });

    if (!filteredItems.length) {
      return {
        items: [] as GanttItem<TaskType>[],
        days: [] as Date[],
        timelineStart: today,
      };
    }

    const minStart = filteredItems.reduce((acc, item) => (item.startDate < acc ? item.startDate : acc), filteredItems[0].startDate);
    const maxEnd = filteredItems.reduce((acc, item) => (item.endDate > acc ? item.endDate : acc), filteredItems[0].endDate);

    let start = startOfWeek(minStart, { weekStartsOn: 1 });
    let end = endOfWeek(maxEnd, { weekStartsOn: 1 });

    const totalDays = differenceInCalendarDays(end, start) + 1;
    if (totalDays < MIN_TIMELINE_DAYS) {
      end = addDays(end, MIN_TIMELINE_DAYS - totalDays);
    }

    const days = eachDayOfInterval({ start, end });

    return {
      items: filteredItems,
      days,
      timelineStart: start,
    };
  }, [tasks, today]);

  const monthSegments = useMemo(() => {
    if (!days.length) {
      return [] as Array<{ label: string; span: number }>;
    }

    return days.reduce<Array<{ label: string; span: number }>>((acc, day, index) => {
      const label = format(day, "MMM yyyy", { locale: ptBR }).toUpperCase();
      if (index === 0) {
        acc.push({ label, span: 1 });
        return acc;
      }

      const last = acc[acc.length - 1];
      if (last.label === label) {
        last.span += 1;
        return acc;
      }

      acc.push({ label, span: 1 });
      return acc;
    }, []);
  }, [days]);

  const handleHeaderScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    if (!bodyScrollRef.current) {
      return;
    }
    if (isSyncingRef.current) {
      isSyncingRef.current = false;
      return;
    }
    isSyncingRef.current = true;
    bodyScrollRef.current.scrollLeft = event.currentTarget.scrollLeft;
  }, []);

  const handleBodyScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    if (!headerScrollRef.current) {
      return;
    }
    if (isSyncingRef.current) {
      isSyncingRef.current = false;
      return;
    }
    isSyncingRef.current = true;
    headerScrollRef.current.scrollLeft = event.currentTarget.scrollLeft;
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!items.length || !days.length) {
    return (
      <div className="flex flex-1 min-h-[280px] flex-col items-center justify-center rounded-2xl border border-dashed border-border/60 bg-muted/20 p-8 text-center">
        <p className="text-sm font-medium text-foreground">Nenhuma tarefa disponível no cronograma</p>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          Crie novas tarefas ou defina datas de entrega para visualizar o gráfico de Gantt.
        </p>
      </div>
    );
  }

  const timelineWidth = Math.max(days.length * DAY_WIDTH, DAY_WIDTH * MIN_TIMELINE_DAYS);

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="max-w-xl text-sm text-muted-foreground">
          Acompanhe o andamento das tarefas em uma linha do tempo semelhante ao ClickUp. Clique em uma tarefa para visualizar os detalhes rapidamente.
        </div>
        <div className="flex flex-wrap items-center gap-3 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {(['baixa', 'média', 'alta', 'crítica'] as const).map(priorityKey => {
            const styles = PRIORITY_STYLES[priorityKey] ?? PRIORITY_STYLES.default;
            const label = priorityKey.replace(/^[a-z]/, letter => letter.toUpperCase());
            return (
              <span key={priorityKey} className="flex items-center gap-2">
                <span className={cn("h-2.5 w-2.5 rounded-full", styles.dotClass)} />
                {label}
              </span>
            );
          })}
        </div>
      </div>

      <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-border/60 bg-background shadow-sm">
        <div className="flex border-b border-border/60">
          <div className="w-72 border-r border-border/60 bg-muted/40 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Tarefas
          </div>
          <div className="flex-1 overflow-hidden">
            <div
              ref={headerScrollRef}
              onScroll={handleHeaderScroll}
              className="overflow-x-auto"
            >
              <div className="min-w-max" style={{ width: `${timelineWidth}px` }}>
                <div
                  className="grid bg-muted/30 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
                  style={{ gridTemplateColumns: `repeat(${days.length}, ${DAY_WIDTH}px)` }}
                >
                  {monthSegments.map((segment, index) => (
                    <div
                      key={`${segment.label}-${index}`}
                      className="flex items-center justify-center border-l border-border/50 px-2 py-1 first:border-l-0"
                      style={{
                        gridColumn: `span ${segment.span} / span ${segment.span}`,
                      } as CSSProperties}
                    >
                      {segment.label}
                    </div>
                  ))}
                </div>
                <div
                  className="grid border-t border-border/60 text-[11px]"
                  style={{ gridTemplateColumns: `repeat(${days.length}, ${DAY_WIDTH}px)` }}
                >
                  {days.map((day, index) => {
                    const isToday = isSameDay(day, today);
                    const weekend = isWeekend(day);
                    return (
                      <div
                        key={day.toISOString()}
                        className={cn(
                          "flex flex-col items-center justify-center border-l border-border/40 px-1 py-2 first:border-l-0",
                          weekend && "bg-muted/30 text-muted-foreground",
                          isToday && "bg-primary/10 text-primary"
                        )}
                      >
                        <span className="text-xs font-semibold">{format(day, "dd", { locale: ptBR })}</span>
                        <span className="text-[10px] uppercase">{format(day, "EEE", { locale: ptBR })}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-1">
          <div className="w-72 divide-y divide-border/60 overflow-hidden">
            {items.map(item => {
              const rawTask = item.task as TaskGanttTaskLike;
              const isScheduled = Boolean(rawTask.cronograma);
              const dueLabel = item.hasDefinedEnd
                ? format(item.endDate, "dd/MM/yyyy", { locale: ptBR })
                : "Sem data definida";

              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => onTaskClick?.(item.task, item.index)}
                  className="flex h-[72px] w-full flex-col items-start gap-1 px-4 py-3 text-left transition-colors hover:bg-muted/40"
                >
                  <div className="flex w-full items-center justify-between gap-2">
                    <span className="truncate text-sm font-medium text-foreground" title={item.name}>
                      {item.name}
                    </span>
                    <div className="flex items-center gap-1">
                      {item.status ? (
                        <Badge variant="outline" className="text-[10px] font-medium uppercase tracking-wide">
                          {item.status}
                        </Badge>
                      ) : null}
                      {isScheduled ? (
                        <Badge variant="secondary" className="text-[10px] uppercase">
                          Cronograma
                        </Badge>
                      ) : null}
                      {item.isOverdue ? (
                        <Badge variant="destructive" className="text-[10px] uppercase">
                          Atrasada
                        </Badge>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                    <span>
                      Responsável: {item.responsavel ?? "Não definido"}
                    </span>
                    <span>
                      Prazo: {dueLabel}
                    </span>
                    <span>
                      Progresso: {item.progressLabel}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="relative flex-1 overflow-hidden">
            <div
              ref={bodyScrollRef}
              onScroll={handleBodyScroll}
              className="h-full overflow-x-auto"
            >
              <div className="relative" style={{ width: `${timelineWidth}px`, height: `${items.length * ROW_HEIGHT}px` }}>
                <div
                  className="pointer-events-none absolute inset-0 grid"
                  style={{ gridTemplateColumns: `repeat(${days.length}, ${DAY_WIDTH}px)` }}
                >
                  {days.map(day => {
                    const isToday = isSameDay(day, today);
                    const weekend = isWeekend(day);
                    return (
                      <div
                        key={`grid-${day.toISOString()}`}
                        className={cn(
                          "relative border-l border-border/40 first:border-l-0",
                          weekend && "bg-muted/20"
                        )}
                      >
                        {isToday ? (
                          <div className="absolute inset-y-0 left-1/2 w-[2px] -translate-x-1/2 rounded-full bg-primary" />
                        ) : null}
                      </div>
                    );
                  })}
                </div>

                {items.map((item, rowIndex) => {
                  const offsetDays = Math.max(0, differenceInCalendarDays(item.startDate, timelineStart));
                  const spanDays = Math.max(1, differenceInCalendarDays(item.endDate, item.startDate) + 1);
                  const left = offsetDays * DAY_WIDTH;
                  const width = spanDays * DAY_WIDTH;
                  const priorityStyles = PRIORITY_STYLES[item.priorityKey] ?? PRIORITY_STYLES.default;
                  const minProgressWidth = Math.min(width, 6);
                  const progressWidth = item.progress > 0
                    ? Math.min(width, Math.max(width * item.progress, minProgressWidth))
                    : minProgressWidth;
                  const top = rowIndex * ROW_HEIGHT + (ROW_HEIGHT - BAR_HEIGHT) / 2;

                  return (
                    <div
                      key={`bar-${item.key}`}
                      role="button"
                      tabIndex={0}
                      onClick={() => onTaskClick?.(item.task, item.index)}
                      onKeyDown={event => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          onTaskClick?.(item.task, item.index);
                        }
                      }}
                      className={cn(
                        "absolute flex cursor-pointer items-center overflow-hidden rounded-full border border-border/60 bg-slate-900/80 shadow-sm transition ring-2 ring-transparent hover:ring-primary/60",
                        item.isOverdue && "ring-destructive/70"
                      )}
                      style={{
                        left,
                        top,
                        width,
                        height: BAR_HEIGHT,
                      }}
                    >
                      <div
                        className={cn("h-full", priorityStyles.barClass)}
                        style={{ width: `${progressWidth}px` }}
                      />
                      <div className="pointer-events-none absolute inset-0 flex items-center justify-between px-3 text-xs text-white drop-shadow-sm">
                        <span className="truncate font-medium" title={item.name}>
                          {item.name}
                        </span>
                        <span className="flex items-center gap-2 text-[10px]">
                          {format(item.startDate, "dd MMM", { locale: ptBR })}
                          <span className="text-white/60">→</span>
                          {format(item.endDate, "dd MMM", { locale: ptBR })}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export type { TaskGanttTaskLike };
