import React, { useEffect, useMemo, useRef, useState } from "react";
import { ChevronsUpDown, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

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

type GuestSelection = {
  value: string;
  label: string;
  searchTerm: string;
  attendee: Hit["attendee"];
};

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

function makeGuestValue(attendee: Hit["attendee"]) {
  const email = (attendee.email ?? "").toLowerCase();
  const name = (attendee.displayName ?? "").toLowerCase();
  return `${email}__${name}`;
}

function makeGuestLabel(attendee: Hit["attendee"]) {
  if (attendee.displayName && attendee.email) {
    return `${attendee.displayName} (${attendee.email})`;
  }
  return attendee.displayName || attendee.email || "Convidado";
}

export default function GuestEventsSearch() {
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
  const [error, setError] = useState<string | null>(null);
  const [guestResults, setGuestResults] = useState<Record<string, Hit>>({});

  const [guestSelectorOpen, setGuestSelectorOpen] = useState(false);
  const [guestSearch, setGuestSearch] = useState("");
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<GuestSelection[]>([]);
  const [selectedGuests, setSelectedGuests] = useState<GuestSelection[]>([]);

  const selectorInputRef = useRef<HTMLInputElement | null>(null);

  const isFnConfigured = Boolean(FN_URL);

  const rangeInfo = useMemo(() => {
    const fromDate = new Date(rangeFrom);
    const toDate = new Date(rangeTo);
    if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
      return {
        error: "Período inválido. Ajuste as datas para continuar.",
        fromIso: "",
        toIso: "",
      } as const;
    }
    return {
      error: null,
      fromIso: fromDate.toISOString(),
      toIso: toDate.toISOString(),
    } as const;
  }, [rangeFrom, rangeTo]);

  const baseError = useMemo(() => {
    if (!isFnConfigured) {
      return "Configure a variável VITE_SUPABASE_FN_GCAL_GUESTS no ambiente.";
    }
    if (calendars.length === 0) {
      return "Selecione ao menos um calendário para pesquisar.";
    }
    if (rangeInfo.error) {
      return rangeInfo.error;
    }
    return null;
  }, [isFnConfigured, calendars, rangeInfo]);

  useEffect(() => {
    if (!guestSelectorOpen) {
      setGuestSearch("");
      setSuggestions([]);
    }
  }, [guestSelectorOpen]);

  useEffect(() => {
    if (!guestSelectorOpen) return;
    const frame = requestAnimationFrame(() => {
      selectorInputRef.current?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [guestSelectorOpen]);

  useEffect(() => {
    if (!guestSelectorOpen) return;
    if (baseError) {
      setSuggestions([]);
      setSuggestionsLoading(false);
      return;
    }
    const search = guestSearch.trim();
    if (!search) {
      setSuggestions([]);
      setSuggestionsLoading(false);
      return;
    }

    const controller = new AbortController();
    let cancelled = false;

    const loadSuggestions = async () => {
      try {
        setSuggestionsLoading(true);
        const payload = {
          query: search,
          calendarIds: calendars,
          timeMin: rangeInfo.fromIso,
          timeMax: rangeInfo.toIso,
          maxPerCalendar: 250,
        };
        const res = await fetch(FN_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });
        if (!res.ok) {
          const txt = await res.text();
          throw new Error(txt || `HTTP ${res.status}`);
        }
        const json = (await res.json()) as Result;
        if (cancelled) return;
        const selectedValues = new Set(
          selectedGuests.map((guest) => guest.value)
        );
        const nextSuggestions: GuestSelection[] = json.hits
          .map((hit) => ({
            value: makeGuestValue(hit.attendee),
            label: makeGuestLabel(hit.attendee),
            searchTerm: hit.attendee.email || hit.attendee.displayName || "",
            attendee: hit.attendee,
          }))
          .filter((option) => option.searchTerm)
          .filter((option) => !selectedValues.has(option.value));
        setSuggestions(nextSuggestions);
      } catch (e: any) {
        if (e?.name === "AbortError") return;
        console.error(e);
        if (!cancelled) {
          setSuggestions([]);
        }
      } finally {
        if (!cancelled) {
          setSuggestionsLoading(false);
        }
      }
    };

    const timeout = setTimeout(loadSuggestions, 300);

    return () => {
      cancelled = true;
      controller.abort();
      clearTimeout(timeout);
    };
  }, [guestSearch, calendars, rangeInfo, baseError, guestSelectorOpen, selectedGuests]);

  useEffect(() => {
    if (baseError) {
      setGuestResults({});
      setLoading(false);
      return;
    }
    if (selectedGuests.length === 0) {
      setGuestResults({});
      setLoading(false);
      setError(null);
      return;
    }

    const controller = new AbortController();
    let cancelled = false;

    const loadGuests = async () => {
      try {
        setLoading(true);
        setError(null);
        const entries = await Promise.all(
          selectedGuests.map(async (guest) => {
            const payload = {
              query: guest.searchTerm,
              calendarIds: calendars,
              timeMin: rangeInfo.fromIso,
              timeMax: rangeInfo.toIso,
              maxPerCalendar: 250,
            };
            const res = await fetch(FN_URL, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
              signal: controller.signal,
            });
            if (!res.ok) {
              const txt = await res.text();
              throw new Error(txt || `HTTP ${res.status}`);
            }
            const json = (await res.json()) as Result;
            const match = json.hits.find(
              (hit) => makeGuestValue(hit.attendee) === guest.value
            );
            return [
              guest.value,
              match ?? { attendee: guest.attendee, events: [] },
            ] as const;
          })
        );
        if (cancelled) return;
        const nextResults = entries.reduce<Record<string, Hit>>(
          (acc, [key, value]) => {
            acc[key] = value;
            return acc;
          },
          {}
        );
        setGuestResults(nextResults);
      } catch (e: any) {
        if (e?.name === "AbortError") return;
        if (!cancelled) {
          setError(e.message || String(e));
          setGuestResults({});
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadGuests();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [selectedGuests, calendars, rangeInfo, baseError]);

  const toggleCal = (id: string) => {
    setCalendars((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleRemoveGuest = (value: string) => {
    setSelectedGuests((prev) => prev.filter((guest) => guest.value !== value));
  };

  const handleSelectSuggestion = (option: GuestSelection) => {
    if (!option.searchTerm) return;
    setSelectedGuests((prev) => {
      if (prev.some((guest) => guest.value === option.value)) {
        return prev;
      }
      return [...prev, option];
    });
    setGuestSelectorOpen(true);
    setGuestSearch("");
    selectorInputRef.current?.focus();
  };

  const effectiveError = error ?? baseError;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-4 rounded-xl border p-3 sm:p-4">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Convidados do calendário</label>
            <Popover open={guestSelectorOpen} onOpenChange={setGuestSelectorOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="flex min-h-[44px] w-full items-center justify-between rounded-md border px-3 py-2 text-left text-sm transition focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                >
                  <div className="flex flex-1 flex-wrap items-center gap-2">
                    {selectedGuests.length === 0 ? (
                      <span className="text-muted-foreground">
                        Digite para procurar e selecione um ou mais convidados…
                      </span>
                    ) : (
                      selectedGuests.map((guest) => (
                        <Badge
                          key={guest.value}
                          variant="secondary"
                          className="flex items-center gap-1 rounded-sm px-2 py-1"
                        >
                          {guest.label}
                          <button
                            type="button"
                            className="rounded-full p-0.5 transition hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                            onClick={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              handleRemoveGuest(guest.value);
                            }}
                            aria-label={`Remover ${guest.label}`}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))
                    )}
                  </div>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-[360px] p-0" align="start">
                <Command>
                  <CommandInput
                    ref={selectorInputRef}
                    value={guestSearch}
                    onValueChange={setGuestSearch}
                    placeholder="Buscar por nome ou e-mail"
                  />
                  <CommandList>
                    {suggestionsLoading ? (
                      <div className="py-6 text-center text-sm">Carregando…</div>
                    ) : (
                      <>
                        <CommandEmpty>Nenhum convidado encontrado.</CommandEmpty>
                        <CommandGroup>
                          {suggestions.map((option) => {
                            const email = option.attendee.email?.trim();
                            const name = option.attendee.displayName?.trim();
                            return (
                              <CommandItem
                                key={option.value}
                                onSelect={() => handleSelectSuggestion(option)}
                                className="flex flex-col items-start gap-0.5 py-2"
                              >
                                <span className="font-medium">{option.label}</span>
                                {email && name && email.toLowerCase() !== name.toLowerCase() ? (
                                  <span className="text-xs text-muted-foreground">{email}</span>
                                ) : null}
                              </CommandItem>
                            );
                          })}
                        </CommandGroup>
                      </>
                    )}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            <p className="text-xs text-muted-foreground">
              Pesquise por parte do nome ou e-mail para localizar convidados e adicione vários para filtrar simultaneamente.
            </p>
          </div>

          <div className="flex flex-col gap-3 lg:flex-row">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">De:</label>
              <input
                type="datetime-local"
                className="w-full rounded-md border px-2 py-1 text-sm lg:w-auto"
                value={rangeFrom}
                onChange={(e) => setRangeFrom(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Até:</label>
              <input
                type="datetime-local"
                className="w-full rounded-md border px-2 py-1 text-sm lg:w-auto"
                value={rangeTo}
                onChange={(e) => setRangeTo(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <span className="text-sm font-medium">Calendários:</span>
          {DEFAULT_CALENDARS.map((c) => {
            const on = calendars.includes(c.id);
            return (
              <label
                key={c.id}
                className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${
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

      <div className="h-full min-h-[280px] overflow-auto rounded-2xl border p-3 sm:p-4">
        {loading && <div className="text-sm">Carregando…</div>}
        {effectiveError && (
          <div className="text-sm text-red-600">Erro: {effectiveError}</div>
        )}

        {!loading && !effectiveError && selectedGuests.length === 0 ? (
          <div className="text-sm text-muted-foreground">
            Selecione ao menos um convidado para visualizar os eventos.
          </div>
        ) : null}

        {!loading && !effectiveError && selectedGuests.length > 0 ? (
          <div className="space-y-6">
            {selectedGuests.map((guest) => {
              const hit = guestResults[guest.value] ?? {
                attendee: guest.attendee,
                events: [],
              };
              const title =
                hit.attendee.displayName ||
                hit.attendee.email ||
                "Convidado";
              const hasEvents = hit.events.length > 0;
              return (
                <div key={guest.value} className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
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
                  <div>
                    {hasEvents ? (
                      <ul className="divide-y">
                        {hit.events.map((ev) => (
                          <li key={ev.id} className="py-2">
                            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
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
                                  className="shrink-0 text-xs underline"
                                >
                                  Abrir no Google Calendar
                                </a>
                              ) : null}
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="text-xs text-muted-foreground">
                        Nenhum evento encontrado para este convidado no período selecionado.
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
}
