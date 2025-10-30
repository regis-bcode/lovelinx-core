// supabase/functions/calendar-attendees-search/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

type QueryPayload = {
  // Filtro antigo (continua funcionando)
  query?: string; // LIKE por nome/email (único termo - mantido p/ compat)
  // NOVO: vários termos de convidados (OR). Ex.: ["regis", "aline"]
  guestsQuery?: string[];

  calendarIds: string[];
  timeMin?: string;
  timeMax?: string;
  maxPerCalendar?: number;

  // Filtro por título
  titleQuery?: string;
  titleMatchMode?: "any" | "all";

  // Agrupamento do retorno. Mantemos "attendee" como padrão para preservar o
  // comportamento anterior (lista organizada por convidados).
  groupBy?: "attendee" | "calendar";
};

type GEvent = {
  id: string;
  summary?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  htmlLink?: string;
  attendees?: Array<{ email?: string; displayName?: string; responseStatus?: string }>;
};

type AttendeeHit = {
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

type CalendarHit = {
  calendarId: string;
  events: Array<{
    id: string;
    summary: string;
    start: string;
    end: string;
    htmlLink: string;
    attendees: Array<{ email: string; displayName: string; responseStatus?: string }>;
  }>;
};

const OAUTH_TOKEN_URL = "https://oauth2.googleapis.com/token";

async function getAccessToken(): Promise<string> {
  const client_id = Deno.env.get("GCAL_CLIENT_ID")!;
  const client_secret = Deno.env.get("GCAL_CLIENT_SECRET")!;
  const refresh_token = Deno.env.get("GCAL_REFRESH_TOKEN")!;
  const body = new URLSearchParams({
    client_id, client_secret, refresh_token,
    grant_type: "refresh_token",
  });
  const res = await fetch(OAUTH_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) throw new Error(`Failed token: ${res.status} ${await res.text()}`);
  const json = await res.json();
  return json.access_token as string;
}

function norm(s?: string) {
  return (s ?? "").normalize("NFKD").toLowerCase();
}
function tokTitle(q?: string): string[] {
  const n = norm(q); if (!n) return [];
  const raw = n.replace(/[,;]/g, " ").split(/\s+/).map(t => t.trim().replace(/^#/, "")).filter(Boolean);
  const seen = new Set<string>(), out: string[] = [];
  for (const t of raw) if (!seen.has(t)) { seen.add(t); out.push(t); }
  return out;
}
function times(ev: GEvent) {
  return {
    start: ev.start?.dateTime ?? ev.start?.date ?? "",
    end: ev.end?.dateTime ?? ev.end?.date ?? "",
  };
}

async function fetchEvents(
  accessToken: string, calendarId: string,
  timeMin: string, timeMax: string, maxPerCalendar = 250
): Promise<GEvent[]> {
  const base = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`;
  const params = new URLSearchParams({
    singleEvents: "true",
    orderBy: "startTime",
    timeMin, timeMax,
    maxResults: String(Math.min(Math.max(maxPerCalendar, 1), 250)),
    showDeleted: "false",
  });
  const res = await fetch(`${base}?${params.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Events ${calendarId}: ${res.status} ${await res.text()}`);
  const json = await res.json();
  return (json.items ?? []) as GEvent[];
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type, authorization, apikey, x-client-info",
};

serve(async (req) => {
  try {
    if (req.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Use POST" }), {
        status: 405,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const p = (await req.json()) as QueryPayload;
    const {
      query = "",
      guestsQuery = [],
      calendarIds,
      timeMin,
      timeMax,
      maxPerCalendar = 250,
      titleQuery = "",
      titleMatchMode = "any",
      groupBy = "attendee",
    } = p || {};

    if (!Array.isArray(calendarIds) || calendarIds.length === 0) {
      return new Response(JSON.stringify({ error: "calendarIds required" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const now = new Date();
    const dMin = new Date(now); dMin.setDate(dMin.getDate() - 90);
    const dMax = new Date(now); dMax.setDate(dMax.getDate() + 180);

    const qSingle = norm(query);
    const qGuests = (guestsQuery ?? []).map(norm).filter(Boolean); // múltiplos termos
    const titleTokens = tokTitle(titleQuery);
    const requireAll = titleMatchMode === "all";

    const tMin = timeMin ?? dMin.toISOString();
    const tMax = timeMax ?? dMax.toISOString();

    const access = await getAccessToken();

    const all = await Promise.all(
      calendarIds.map((cid) =>
        fetchEvents(access, cid, tMin, tMax, maxPerCalendar)
          .then(list => ({ cid, list }))
          .catch(_ => ({ cid, list: [] as GEvent[] }))
      )
    );

    const map = new Map<string, AttendeeHit>();
    const calendarMap = new Map<string, CalendarHit>();

    const requiresGuestMatch = Boolean(qSingle || qGuests.length);

    const eventMatchesGuests = (ev: GEvent) => {
      if (!requiresGuestMatch) return true;
      const attendees = ev.attendees ?? [];
      for (const a of attendees) {
        const hay = norm(`${(a.displayName ?? "").trim()} ${(a.email ?? "").trim()}`);
        const single = qSingle ? hay.includes(qSingle) : false;
        const multi = qGuests.length ? qGuests.some((g) => hay.includes(g)) : false;
        if (qSingle && qGuests.length) {
          if (single || multi) return true;
        } else if (qSingle && single) {
          return true;
        } else if (qGuests.length && multi) {
          return true;
        }
      }
      return false;
    };

    for (const { cid, list } of all) {
      for (const ev of list) {
        // filtro por título
        if (titleTokens.length) {
          const T = norm(ev.summary ?? "");
          const matched = titleTokens.map(t => T.includes(t));
          const pass = requireAll ? matched.every(Boolean) : matched.some(Boolean);
          if (!pass) continue;
        }

        if (groupBy === "calendar" && !eventMatchesGuests(ev)) {
          continue;
        }

        const base = {
          id: ev.id,
          summary: ev.summary ?? "(sem título)",
          ...times(ev),
          htmlLink: ev.htmlLink ?? "",
          calendarId: cid,
        };

        if (groupBy === "calendar") {
          if (!calendarMap.has(cid)) {
            calendarMap.set(cid, {
              calendarId: cid,
              events: [],
            });
          }
          const target = calendarMap.get(cid)!;
          target.events.push({
            id: base.id,
            summary: base.summary,
            start: base.start,
            end: base.end,
            htmlLink: base.htmlLink,
            attendees: (ev.attendees ?? []).map((a) => ({
              email: (a.email ?? "").trim(),
              displayName: (a.displayName ?? "").trim(),
              responseStatus: a.responseStatus,
            })),
          });
          continue;
        }

        for (const a of ev.attendees ?? []) {
          const email = (a.email ?? "").trim();
          const name = (a.displayName ?? "").trim();
          if (!email && !name) continue;

          const hay = norm(`${name} ${email}`);

          // LIKE por convidado: aceita "query" (single) OU qualquer item em guestsQuery (OR)
          let passGuest = true;
          if (requiresGuestMatch) {
            const single = qSingle ? hay.includes(qSingle) : false;
            const multi = qGuests.length ? qGuests.some((g) => hay.includes(g)) : false;
            passGuest = qSingle && qGuests.length ? single || multi : qSingle ? single : multi;
          }
          if (!passGuest) continue;

          const key = (email || name).toLowerCase();
          if (!map.has(key)) {
            map.set(key, { attendee: { email: email || "", displayName: name || "" }, events: [] });
          }
          map.get(key)!.events.push({ ...base, responseStatus: a.responseStatus });
        }
      }
    }

    if (groupBy === "calendar") {
      const calendars = calendarIds.map((cid) => {
        const events = calendarMap.get(cid)?.events ?? [];
        const sorted = events.sort((x, y) => (x.start || "").localeCompare(y.start || ""));
        return {
          calendarId: cid,
          events: sorted,
        } as CalendarHit;
      });

      return new Response(JSON.stringify({ hits: [] as AttendeeHit[], calendars }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const hits = Array.from(map.values())
      .sort((a, b) => (a.attendee.displayName || a.attendee.email).localeCompare(b.attendee.displayName || b.attendee.email))
      .map(h => ({ ...h, events: h.events.sort((x, y) => (x.start || "").localeCompare(y.start || "")) }));

    return new Response(JSON.stringify({ hits }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
