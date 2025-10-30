// src/components/calendar/GoogleCalendarEmbed.tsx
import React, { useEffect, useMemo, useState } from "react";

import {
  CALENDAR_ITEMS,
  DEFAULT_SELECTED_CALENDAR_IDS,
  DEFAULT_TIMEZONE,
} from "./calendarConfig";
import { supabase } from "@/integrations/supabase/client";

/** Tipos */
type ViewMode = "MONTH" | "WEEK" | "AGENDA";
type LayoutMode = "combined" | "split";

/** Persistência simples em localStorage */
const LS_KEY = "calendar-advanced-prefs";

type SavedPrefs = {
  selected: string[];
  view: ViewMode;
  tz: string;
  layout?: LayoutMode;
  splitDate?: string;
};

function loadPrefs(): SavedPrefs | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SavedPrefs;
  } catch {
    return null;
  }
}

function savePrefs(p: SavedPrefs) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(p));
  } catch {
    // ignore
  }
}

/** Componente de controles + iframe */
export default function GoogleCalendarEmbed() {
  // Estado inicial vindo do localStorage (ou defaults)
  const saved = loadPrefs();
  const [view, setView] = useState<ViewMode>(saved?.view ?? "MONTH");
  const [tz, setTz] = useState<string>(saved?.tz ?? DEFAULT_TIMEZONE);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>(
    saved?.layout ?? "combined",
  );
  const [splitDate, setSplitDate] = useState<string>(() => {
    const today = new Date().toISOString().slice(0, 10);
    if (saved?.splitDate) {
      return saved.splitDate;
    }
    return today;
  });

  const [selectedIds, setSelectedIds] = useState<string[]>(
    saved?.selected ?? DEFAULT_SELECTED_CALENDAR_IDS,
  );

  useEffect(() => {
    savePrefs({
      selected: selectedIds,
      view,
      tz,
      layout: layoutMode,
      splitDate,
    });
  }, [selectedIds, view, tz, layoutMode, splitDate]);

  useEffect(() => {
    if (layoutMode === "split" && selectedIds.length < 2) {
      setLayoutMode("combined");
    }
  }, [layoutMode, selectedIds.length]);

  useEffect(() => {
    if (!splitDate) {
      setSplitDate(new Date().toISOString().slice(0, 10));
    }
  }, [splitDate]);

  /** Monta a URL do iframe com múltiplos src + cores alinhadas */
  const iframeSrc = useMemo(() => {
    const base = "https://calendar.google.com/calendar/embed";
    const params = new URLSearchParams();
    params.set("ctz", tz);
    params.set("mode", view); // MONTH | WEEK | AGENDA

    // Tuning de UI — removemos o menu lateral do embed e usamos nossos controles
    params.set("showTitle", "0");
    params.set("showCalendars", "0");
    params.set("showTabs", "1");
    params.set("showPrint", "0");
    params.set("showTz", "0");

    // Adiciona src (um por calendário selecionado) e cores em mesma ordem
    selectedIds.forEach((id) => params.append("src", id));
    selectedIds.forEach((id) => {
      const color = CALENDAR_ITEMS.find((c) => c.id === id)?.color;
      if (color && /^#([0-9A-F]{6}|[0-9a-f]{6})$/.test(color)) {
        // encode do '#'
        params.append("color", color.replace("#", "%23"));
      }
    });

    return `${base}?${params.toString()}`;
  }, [tz, view, selectedIds]);

  /** Handlers */
  const toggleCalendar = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  /** Layout */
  return (
    <div className="w-full h-full min-h-[calc(100vh-4rem)] bg-background">
      {/* Barra de controles */}
      <div className="w-full px-3 sm:px-4 pt-4">
        <div className="flex flex-col gap-3 rounded-xl border p-3 sm:p-4 shadow-sm">
          {/* Linha 1: View e Timezone */}
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium">Visualização:</span>
              <div className="inline-flex rounded-lg border overflow-hidden">
                {(["MONTH", "WEEK", "AGENDA"] as ViewMode[]).map((m) => (
                  <button
                    key={m}
                    onClick={() => setView(m)}
                    className={`px-3 py-1.5 text-sm ${
                      view === m ? "bg-primary text-primary-foreground" : ""
                    } hover:bg-muted`}
                    title={
                      m === "MONTH"
                        ? "Mês"
                        : m === "WEEK"
                        ? "Semana"
                        : "Agenda (lista)"
                    }
                  >
                    {m === "MONTH" ? "Mês" : m === "WEEK" ? "Semana" : "Agenda"}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm font-medium" htmlFor="tz">
                Timezone:
              </label>
              <input
                id="tz"
                className="border rounded-md px-2 py-1 text-sm w-[220px]"
                value={tz}
                onChange={(e) => setTz(e.target.value)}
                placeholder="America/Sao_Paulo"
                spellCheck={false}
              />
            </div>
          </div>

          {/* Linha 2: Lista de calendários com toggle */}
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium">Calendários:</span>
            <div className="flex flex-wrap gap-3">
              {CALENDAR_ITEMS.map((c) => {
                const checked = selectedIds.includes(c.id);
                return (
                  <label
                    key={c.id}
                    className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm cursor-pointer ${
                      checked ? "bg-muted" : "bg-background"
                    }`}
                    title={c.id}
                  >
                    <input
                      type="checkbox"
                      className="accent-current"
                      checked={checked}
                      onChange={() => toggleCalendar(c.id)}
                    />
                    <span className="font-medium">{c.label}</span>
                    {c.color ? (
                      <span
                        aria-label="cor"
                        className="inline-block h-3 w-3 rounded-full"
                        style={{ background: c.color }}
                      />
                    ) : null}
                  </label>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground">
              Dica: para cada calendário selecionado, o embed adiciona um{" "}
              <code>src</code>. As cores seguem a ordem selecionada.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium">Layout:</span>
              <div className="inline-flex rounded-lg border overflow-hidden">
                {(["combined", "split"] as LayoutMode[]).map((mode) => {
                  const isDisabled = mode === "split" && selectedIds.length < 2;
                  return (
                    <button
                      key={mode}
                      onClick={() => {
                        if (isDisabled) return;
                        setLayoutMode(mode);
                      }}
                      className={`px-3 py-1.5 text-sm transition-colors ${
                        layoutMode === mode
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-muted"
                      } ${isDisabled ? "opacity-50 cursor-not-allowed" : ""}`}
                      type="button"
                    >
                      {mode === "combined" ? "Integrado" : "Separado (dia)"}
                    </button>
                  );
                })}
              </div>
              {selectedIds.length < 2 && (
                <span className="text-xs text-muted-foreground">
                  Selecione ao menos dois calendários para habilitar.
                </span>
              )}
            </div>

            {layoutMode === "split" && (
              <div className="flex flex-wrap items-center gap-2">
                <label className="text-sm font-medium" htmlFor="split-date">
                  Dia:
                </label>
                <input
                  id="split-date"
                  type="date"
                  className="border rounded-md px-2 py-1 text-sm"
                  value={splitDate}
                  onChange={(e) => setSplitDate(e.target.value)}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Iframe em tela cheia */}
      <div className="mx-auto h-[calc(100vh-12rem)] w-full max-w-[1400px] p-2 sm:p-4">
        <div className="h-full w-full rounded-2xl shadow-lg border bg-background">
          {layoutMode === "split" ? (
            <CalendarSplitView
              calendarIds={selectedIds}
              date={splitDate}
              timezone={tz}
            />
          ) : (
            <iframe
              key={iframeSrc /* força recarregar ao trocar params */}
              src={iframeSrc}
              title="Google Calendar (Avançado)"
              className="h-full w-full"
              style={{ border: 0 }}
              frameBorder={0}
              scrolling="no"
              allow="fullscreen"
            />
          )}
        </div>
      </div>
    </div>
  );
}

type CalendarSplitViewProps = {
  calendarIds: string[];
  date: string;
  timezone: string;
};

type CalendarSplitEvent = {
  id: string;
  summary: string;
  start: string;
  end: string;
  htmlLink: string;
  attendees: Array<{ email: string; displayName: string; responseStatus?: string }>;
};

type CalendarSplitResponse = {
  calendars?: Array<{
    calendarId: string;
    events: CalendarSplitEvent[];
  }>;
};

function formatRangeLabel(start: string, end: string, timezone: string) {
  const allDayRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (allDayRegex.test(start) || allDayRegex.test(end)) {
    return "Dia inteiro";
  }

  const makeLabel = (value: string) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    try {
      return new Intl.DateTimeFormat("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: timezone,
      }).format(date);
    } catch {
      return date.toLocaleTimeString();
    }
  };

  const startLabel = makeLabel(start);
  const endLabel = makeLabel(end);

  if (startLabel && endLabel) {
    return `${startLabel} — ${endLabel}`;
  }
  return startLabel || endLabel || "Horário não informado";
}

function CalendarSplitView({ calendarIds, date, timezone }: CalendarSplitViewProps) {
  const [eventsByCalendar, setEventsByCalendar] = useState<Record<string, CalendarSplitEvent[]>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const calendarMeta = useMemo(() => {
    return new Map(CALENDAR_ITEMS.map((item) => [item.id, item]));
  }, []);

  const displayDate = useMemo(() => {
    if (!date) return "Data inválida";
    const base = new Date(`${date}T00:00:00`);
    if (Number.isNaN(base.getTime())) {
      return date;
    }
    try {
      return new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "full",
        timeZone: timezone,
      }).format(base);
    } catch {
      return base.toLocaleDateString();
    }
  }, [date, timezone]);

  useEffect(() => {
    if (!calendarIds.length) {
      setEventsByCalendar({});
      return;
    }
    if (!date) {
      setEventsByCalendar({});
      setError("Selecione uma data válida");
      return;
    }

    const start = new Date(`${date}T00:00:00`);
    if (Number.isNaN(start.getTime())) {
      setEventsByCalendar({});
      setError("Data inválida");
      return;
    }
    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const { data, error } = await supabase.functions.invoke<CalendarSplitResponse>(
          "calendar-attendees-search",
          {
            body: {
              calendarIds,
              timeMin: start.toISOString(),
              timeMax: end.toISOString(),
              maxPerCalendar: 200,
              groupBy: "calendar",
            },
          },
        );
        if (error) {
          throw new Error(error.message ?? "Falha ao carregar eventos");
        }
        if (cancelled) return;
        const next: Record<string, CalendarSplitEvent[]> = {};
        for (const item of data?.calendars ?? []) {
          next[item.calendarId] = item.events;
        }
        setEventsByCalendar(next);
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message ?? "Não foi possível carregar os eventos");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [calendarIds, date]);

  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/40 px-4 py-3">
        <div>
          <h2 className="text-base font-semibold">Visão separada por calendário</h2>
          <p className="text-xs text-muted-foreground">{displayDate}</p>
        </div>
        <div className="text-xs text-muted-foreground">Fuso horário: {timezone}</div>
      </div>

      {error && (
        <div className="px-4 py-2 text-sm text-red-600">{error}</div>
      )}

      {loading && (
        <div className="px-4 py-2 text-sm">Carregando eventos…</div>
      )}

      <div className="flex-1 overflow-auto px-4 py-4">
        <div className="flex min-w-full gap-4">
          {calendarIds.map((id) => {
            const meta = calendarMeta.get(id);
            const events = eventsByCalendar[id] ?? [];

            return (
              <div
                key={id}
                className="min-w-[320px] flex-1 rounded-xl border bg-card p-4 shadow-sm"
              >
                <div className="mb-3 flex items-center justify-between gap-2 border-b pb-2">
                  <div>
                    <div className="text-sm font-semibold">
                      {meta?.label ?? id}
                    </div>
                    <div className="text-xs text-muted-foreground break-all">
                      {id}
                    </div>
                  </div>
                  {meta?.color ? (
                    <span
                      className="inline-block h-3 w-3 rounded-full"
                      style={{ backgroundColor: meta.color }}
                    />
                  ) : null}
                </div>

                <div className="space-y-3">
                  {events.map((event) => (
                    <div
                      key={event.id}
                      className="rounded-xl border bg-background p-3 text-sm shadow-sm"
                    >
                      <div className="font-semibold">{event.summary}</div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {formatRangeLabel(event.start, event.end, timezone)}
                      </div>
                      {event.attendees.length > 0 && (
                        <div className="mt-1 text-xs text-muted-foreground">
                          {event.attendees.map((attendee, index) => {
                            const label = attendee.displayName || attendee.email;
                            if (!label) return null;
                            const status = attendee.responseStatus
                              ? ` (${attendee.responseStatus})`
                              : "";
                            return (
                              <span key={`${attendee.email}-${index}`}>
                                {index > 0 ? ", " : ""}
                                {label}
                                {status}
                              </span>
                            );
                          })}
                        </div>
                      )}
                      {event.htmlLink && (
                        <a
                          href={event.htmlLink}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-2 inline-block text-xs font-medium text-primary underline"
                        >
                          Abrir no Google Calendar
                        </a>
                      )}
                    </div>
                  ))}

                  {!events.length && (
                    <div className="rounded-xl border border-dashed p-4 text-center text-xs text-muted-foreground">
                      Nenhum evento para este dia.
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
