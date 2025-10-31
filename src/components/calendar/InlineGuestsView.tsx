// src/components/calendar/InlineGuestsView.tsx
import React, { useEffect, useMemo, useState } from "react";

import { supabase } from "@/integrations/supabase/client";

type Hit = {
  attendee: { email: string; displayName: string };
  events: Array<{ id: string; summary: string; start: string; end: string; htmlLink: string; calendarId: string; responseStatus?: string }>;
};
type Result = { hits: Hit[] };
type CalendarOpt = { id: string; label: string };

const DEFAULT_CALENDAR_MAIN_ID =
  import.meta.env.VITE_GOOGLE_CALENDAR_MAIN ??
  "c71ad776a29f8953dc6891f8f1ac46d563ac98f55a67a572d3b89cbd96e8c25c@group.calendar.google.com";

if (typeof console !== "undefined") {
  console.log(
    "[calendar] import.meta.env.VITE_GOOGLE_CALENDAR_MAIN:",
    import.meta.env.VITE_GOOGLE_CALENDAR_MAIN ?? "(undefined)",
  );
  console.log("[calendar] resolved DEFAULT_CALENDAR_MAIN_ID:", DEFAULT_CALENDAR_MAIN_ID);
}

const DEFAULT_CALENDAR_IDS: CalendarOpt[] = [
  {
    id: DEFAULT_CALENDAR_MAIN_ID,
    label: "Principal",
  },
];

function fmtHour(s?: string) {
  if (!s) return "";
  const d = new Date(s);
  if (isNaN(d.getTime())) return ""; // all-day
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
function whoLabel(h: Hit["attendee"]) {
  return h.displayName || h.email || "Convidado";
}

export default function InlineGuestsView() {
  // convidados selecionados (múltiplos termos LIKE)
  const [guestTerms, setGuestTerms] = useState<string[]>([]);
  const [input, setInput] = useState("");

  // filtros auxiliares
  const [titleQuery, setTitleQuery] = useState("");
  const [titleMatchMode, setTitleMatchMode] = useState<"any" | "all">("any");

  const [calendars, setCalendars] = useState<string[]>(
    DEFAULT_CALENDAR_IDS.map(c => c.id)
  );
  const [rangeFrom, setRangeFrom] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 7);
    return d.toISOString().slice(0, 16);
  });
  const [rangeTo, setRangeTo] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 7);
    return d.toISOString().slice(0, 16);
  });

  const [loading, setLoading] = useState(false);
  const [hits, setHits] = useState<Hit[]>([]);
  const [error, setError] = useState<string | null>(null);

  const canSearch = useMemo(
    () => calendars.length > 0 && guestTerms.length > 0,
    [calendars, guestTerms]
  );

  // Buscar quando filtros mudarem (debounce)
  useEffect(() => {
    if (!canSearch) { setHits([]); return; }
    const t = setTimeout(() => {
      (async () => {
        try {
          setLoading(true); setError(null);
          const payload = {
            calendarIds: calendars,
            timeMin: new Date(rangeFrom).toISOString(),
            timeMax: new Date(rangeTo).toISOString(),
            maxPerCalendar: 250,
            guestsQuery: guestTerms,  // <── múltiplos convidados (OR)
            titleQuery: titleQuery.trim(),
            titleMatchMode,
          };
          const { data, error } = await supabase
            .functions
            .invoke<Result>("calendar-attendees-search", { body: payload });
          if (error) throw new Error(error.message || "Falha ao buscar convidados");
          const json = data ?? { hits: [] };
          // Mantém só os convidados na ordem dos termos (para colunas estáveis)
          const order = new Map(guestTerms.map((t, i) => [t.toLowerCase(), i]));
          const sorted = json.hits.sort((a, b) => {
            const ka = (a.attendee.displayName + " " + a.attendee.email).toLowerCase();
            const kb = (b.attendee.displayName + " " + b.attendee.email).toLowerCase();
            // tenta casar com primeiro termo encontrado
            const ia = [...order.keys()].findIndex(t => ka.includes(t));
            const ib = [...order.keys()].findIndex(t => kb.includes(t));
            return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
          });
          setHits(sorted);
        } catch (e: any) {
          setError(e.message || String(e));
        } finally {
          setLoading(false);
        }
      })();
    }, 350);
    return () => clearTimeout(t);
  }, [guestTerms, calendars, rangeFrom, rangeTo, titleQuery, titleMatchMode]);

  // Helpers UI
  const addTerm = () => {
    const v = input.trim();
    if (!v) return;
    setGuestTerms(prev => Array.from(new Set([...prev, v])));
    setInput("");
  };
  const removeTerm = (t: string) => setGuestTerms(prev => prev.filter(x => x !== t));
  const toggleCal = (id: string) =>
    setCalendars(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  return (
    <div className="flex flex-col gap-3">
      {/* Barra de filtros */}
      <div className="rounded-xl border p-3 sm:p-4 space-y-3">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="flex-1">
            <label className="text-sm font-medium">Convidados (múltiplos):</label>
            <div className="flex gap-2 mt-1">
              <input
                className="border rounded-md px-3 py-2 text-sm w-full"
                placeholder="Digite parte do nome ou e-mail e pressione Enter (ex.: Regis)"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") addTerm(); }}
                spellCheck={false}
              />
              <button onClick={addTerm} className="px-3 py-2 rounded-md border text-sm hover:bg-muted">Adicionar</button>
            </div>
            {/* chips */}
            <div className="flex flex-wrap gap-2 mt-2">
              {guestTerms.map(t => (
                <span key={t} className="inline-flex items-center gap-2 px-2 py-1 text-sm border rounded-full">
                  {t}
                  <button onClick={() => removeTerm(t)} className="text-xs opacity-70 hover:opacity-100">×</button>
                </span>
              ))}
              {guestTerms.length === 0 && (
                <span className="text-xs text-muted-foreground">Nenhum convidado selecionado.</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">De:</label>
            <input type="datetime-local" className="border rounded-md px-2 py-1 text-sm" value={rangeFrom} onChange={(e) => setRangeFrom(e.target.value)} />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Até:</label>
            <input type="datetime-local" className="border rounded-md px-2 py-1 text-sm" value={rangeTo} onChange={(e) => setRangeTo(e.target.value)} />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <span className="text-sm font-medium">Calendários:</span>
          {DEFAULT_CALENDAR_IDS.map(c => {
            const on = calendars.includes(c.id);
            return (
              <label key={c.id} className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm cursor-pointer ${on ? "bg-muted" : "bg-background"}`} title={c.id}>
                <input type="checkbox" checked={on} onChange={() => toggleCal(c.id)} />
                <span>{c.label}</span>
              </label>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium">Título/Cliente:</span>
          <input
            className="border rounded-md px-3 py-2 text-sm w-[320px]"
            placeholder="Ex.: #ABBR, Fernanda, Faturamento"
            value={titleQuery}
            onChange={(e) => setTitleQuery(e.target.value)}
            spellCheck={false}
          />
          <div className="inline-flex rounded-lg border overflow-hidden ml-2">
            <button onClick={() => setTitleMatchMode("any")} className={`px-3 py-1.5 text-sm ${titleMatchMode === "any" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>Qualquer</button>
            <button onClick={() => setTitleMatchMode("all")} className={`px-3 py-1.5 text-sm ${titleMatchMode === "all" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>Todos</button>
          </div>
        </div>
      </div>

      {/* Área de resultado */}
      <div className="rounded-2xl border p-3 sm:p-4 h-[calc(100vh-18rem)] overflow-auto">
        {!canSearch && <div className="text-sm text-muted-foreground">Adicione pelo menos um convidado para visualizar.</div>}
        {loading && <div className="text-sm">Carregando…</div>}
        {error && <div className="text-sm text-red-600">Erro: {error}</div>}

        {!loading && canSearch && hits.length > 0 && (
          <div className="flex gap-4 min-w-full">
            {hits.map((h) => (
              <div key={h.attendee.email + h.attendee.displayName} className="min-w-[360px] w-[360px]">
                <div className="sticky top-0 z-10 bg-background/80 backdrop-blur border-b pb-2 mb-2">
                  <div className="text-base font-semibold">{whoLabel(h.attendee)}</div>
                  {h.attendee.email && <div className="text-xs text-muted-foreground">{h.attendee.email}</div>}
                </div>

                <ul className="space-y-2">
                  {h.events.map((ev) => (
                    <li key={ev.id} className="border rounded-xl p-2">
                      <div className="text-sm font-medium">{ev.summary}</div>
                      <div className="text-xs text-muted-foreground">
                        {fmtHour(ev.start)} — {fmtHour(ev.end)} · <span className="italic">{ev.calendarId}</span>
                        {ev.responseStatus ? ` · ${ev.responseStatus}` : ""}
                      </div>
                      {ev.htmlLink && (
                        <a href={ev.htmlLink} target="_blank" rel="noreferrer" className="text-xs underline mt-1 inline-block">
                          Abrir no Google Calendar
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}

        {!loading && canSearch && hits.length === 0 && (
          <div className="text-sm text-muted-foreground">Nenhum evento para os convidados selecionados nesse intervalo.</div>
        )}
      </div>
    </div>
  );
}
