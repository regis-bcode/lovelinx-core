import React, { useEffect, useMemo, useState } from "react";

const FN_URL = import.meta.env.VITE_SUPABASE_FN_GCAL_GUESTS as string;

type Hit = {
  attendee: { email: string; displayName: string };
  events: Array<{
    id: string;
    summary: string;
    start: string;
    end: string;
    htmlLink: string;
    calendarId: string;
    responseStatus?: string;
  }>;
};

type Result = { hits: Hit[] };

type CalendarOpt = { id: string; label: string };

const DEFAULT_CALENDARS: CalendarOpt[] = [
  {
    id:
      import.meta.env.VITE_GOOGLE_CALENDAR_MAIN ??
      "c71ad776a29f8953dc6891f8f1ac46d563ac98f55a67a572d3b89cbd96e8c25c@group.calendar.google.com",
    label: "Principal",
  },
];

function fmtDate(s?: string) {
  if (!s) return "";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleString();
}

export default function CalendarGuestsPage() {
  const [query, setQuery] = useState("");
  const [calendars, setCalendars] = useState<string[]>(
    DEFAULT_CALENDARS.map((c) => c.id)
  );
  const [rangeFrom, setRangeFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 90);
    return d.toISOString().slice(0, 16);
  });
  const [rangeTo, setRangeTo] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 180);
    return d.toISOString().slice(0, 16);
  });

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isFnConfigured = Boolean(FN_URL);

  const canSearch = useMemo(
    () => isFnConfigured && calendars.length > 0,
    [isFnConfigured, calendars]
  );

  useEffect(() => {
    if (!isFnConfigured) {
      setError("Configure a variável VITE_SUPABASE_FN_GCAL_GUESTS no ambiente.");
      setLoading(false);
      setData(null);
      return;
    }
    if (!canSearch) {
      setError("Selecione ao menos um calendário para pesquisar.");
      setLoading(false);
      setData(null);
      return;
    }
    const t = setTimeout(() => {
      (async () => {
        try {
          setLoading(true);
          setError(null);
          const fromDate = new Date(rangeFrom);
          const toDate = new Date(rangeTo);
          if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
            throw new Error("Período inválido. Ajuste as datas para continuar.");
          }
          const payload = {
            query: query.trim(),
            calendarIds: calendars,
            timeMin: fromDate.toISOString(),
            timeMax: toDate.toISOString(),
            maxPerCalendar: 250,
          };
          const res = await fetch(FN_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          if (!res.ok) {
            const txt = await res.text();
            throw new Error(txt || `HTTP ${res.status}`);
          }
          const json = (await res.json()) as Result;
          setData(json);
        } catch (e: any) {
          setError(e.message || String(e));
          setData(null);
        } finally {
          setLoading(false);
        }
      })();
    }, 400);
    return () => clearTimeout(t);
  }, [query, calendars, rangeFrom, rangeTo, canSearch, isFnConfigured]);

  const toggleCal = (id: string) => {
    setCalendars((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  return (
    <div className="flex flex-col h-full w-full">
      <div className="px-4 pt-4 pb-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          Visão por Convidado (Google Agenda)
        </h1>
        <p className="text-sm text-muted-foreground">
          Digite parte do nome ou e-mail para filtrar (ex.: "Regis" encontra
          <code className="ml-1">regis@baumgratzcode.com.br</code>).
        </p>
      </div>

      <div className="px-4 pb-3">
        <div className="flex flex-col gap-3 rounded-xl border p-3 sm:p-4">
          <div className="flex flex-col lg:flex-row gap-3">
            <input
              className="border rounded-md px-3 py-2 text-sm w-full lg:w-1/3"
              placeholder="Buscar por nome ou e-mail (LIKE)"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              spellCheck={false}
            />
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">De:</label>
              <input
                type="datetime-local"
                className="border rounded-md px-2 py-1 text-sm"
                value={rangeFrom}
                onChange={(e) => setRangeFrom(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Até:</label>
              <input
                type="datetime-local"
                className="border rounded-md px-2 py-1 text-sm"
                value={rangeTo}
                onChange={(e) => setRangeTo(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="text-sm font-medium">Calendários:</span>
            {DEFAULT_CALENDARS.map((c) => {
              const on = calendars.includes(c.id);
              return (
                <label
                  key={c.id}
                  className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm cursor-pointer ${
                    on ? "bg-muted" : "bg-background"
                  }`}
                  title={c.id}
                >
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() => toggleCal(c.id)}
                  />
                  <span>{c.label}</span>
                </label>
              );
            })}
          </div>
        </div>
      </div>

      <div className="px-4 pb-4 flex-1">
        <div className="rounded-2xl border p-3 sm:p-4 h-full overflow-auto">
          {loading && <div className="text-sm">Carregando…</div>}
          {error && <div className="text-sm text-red-600">Erro: {error}</div>}
          {!loading && !error && data && data.hits.length === 0 && (
            <div className="text-sm text-muted-foreground">Nenhum resultado.</div>
          )}

          {!loading && !error && data && data.hits.length > 0 && (
            <div className="space-y-6">
              {data.hits.map((hit) => {
                const title =
                  hit.attendee.displayName || hit.attendee.email || "Convidado";
                return (
                  <div key={`${hit.attendee.email}|${hit.attendee.displayName}`}>
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-semibold">{title}</h2>
                      {hit.attendee.email ? (
                        <a
                          className="text-xs underline"
                          href={`mailto:${hit.attendee.email}`}
                        >
                          {hit.attendee.email}
                        </a>
                      ) : null}
                    </div>
                    <div className="mt-2">
                      <ul className="divide-y">
                        {hit.events.map((ev) => (
                          <li key={ev.id} className="py-2">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                              <div className="flex-1">
                                <div className="font-medium">{ev.summary}</div>
                                <div className="text-xs text-muted-foreground">
                                  {fmtDate(ev.start)} → {fmtDate(ev.end)}
                                  {" · "}
                                  <span className="italic">{ev.calendarId}</span>
                                  {ev.responseStatus
                                    ? ` · status: ${ev.responseStatus}`
                                    : ""}
                                </div>
                              </div>
                              {ev.htmlLink ? (
                                <a
                                  href={ev.htmlLink}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-xs underline shrink-0"
                                >
                                  Abrir no Google Calendar
                                </a>
                              ) : null}
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
