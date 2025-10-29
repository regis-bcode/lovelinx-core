// src/components/calendar/GoogleCalendarEmbed.tsx
import React, { useEffect, useMemo, useState } from "react";

/** Tipos */
type ViewMode = "MONTH" | "WEEK" | "AGENDA";

type CalendarItem = {
  id: string; // calendarId (precisa ser público p/ aparecer no embed)
  label: string; // nome amigável
  color?: string; // hex com '#', ex: "#0B8043"  -> vira "%230B8043" na URL
  defaultOn?: boolean; // inicia selecionado?
};

/** Helpers de ENV (fallbacks seguros) */
const ENV_TZ =
  (import.meta as any)?.env?.VITE_GOOGLE_CALENDAR_TZ ?? "America/Sao_Paulo";
const ENV_MAIN =
  (import.meta as any)?.env?.VITE_GOOGLE_CALENDAR_MAIN ??
  "c71ad776a29f8953dc6891f8f1ac46d563ac98f55a67a572d3b89cbd96e8c25c@group.calendar.google.com";

/** Defina aqui os seus calendários públicos */
const ALL_CALENDARS: CalendarItem[] = [
  {
    id: ENV_MAIN,
    label: "Principal",
    color: "#0B8043",
    defaultOn: true,
  },
  // Exemplos (substitua por IDs públicos reais da sua equipe, se quiser):
  // { id: "consultorA@group.calendar.google.com", label: "Consultor A", color: "#D50000", defaultOn: false },
  // { id: "consultorB@group.calendar.google.com", label: "Consultor B", color: "#3F51B5", defaultOn: false },
];

/** Persistência simples em localStorage */
const LS_KEY = "calendar-advanced-prefs";

type SavedPrefs = {
  selected: string[];
  view: ViewMode;
  tz: string;
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
  const [tz, setTz] = useState<string>(saved?.tz ?? ENV_TZ);

  const [selectedIds, setSelectedIds] = useState<string[]>(
    saved?.selected ??
      ALL_CALENDARS.filter((c) => c.defaultOn).map((c) => c.id)
  );

  useEffect(() => {
    savePrefs({ selected: selectedIds, view, tz });
  }, [selectedIds, view, tz]);

  /** Monta a URL do iframe com múltiplos src + cores alinhadas */
  const iframeSrc = useMemo(() => {
    const base = "https://calendar.google.com/calendar/embed";
    const params = new URLSearchParams();
    params.set("ctz", tz);
    params.set("mode", view); // MONTH | WEEK | AGENDA

    // Tuning de UI (opcionais)
    // params.set("showTitle", "0");
    // params.set("showTz", "0");
    // params.set("showTabs", "1");
    // params.set("showCalendars", "0");
    // params.set("showPrint", "0");

    // Adiciona src (um por calendário selecionado) e cores em mesma ordem
    selectedIds.forEach((id) => params.append("src", id));
    selectedIds.forEach((id) => {
      const color = ALL_CALENDARS.find((c) => c.id === id)?.color;
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
              {ALL_CALENDARS.map((c) => {
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
        </div>
      </div>

      {/* Iframe em tela cheia */}
      <div className="mx-auto h-[calc(100vh-12rem)] w-full max-w-[1400px] p-2 sm:p-4">
        <div className="h-full w-full rounded-2xl shadow-lg overflow-hidden border">
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
        </div>
      </div>
    </div>
  );
}
