// supabase/functions/calendar-attendees-search/index.ts
// Edge Function para buscar eventos com convidados e filtrar por LIKE (nome/email).
// Requer secrets: GCAL_CLIENT_ID, GCAL_CLIENT_SECRET, GCAL_REFRESH_TOKEN

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

type QueryPayload = {
  query?: string; // texto p/ LIKE em nome/email (case-insensitive)
  calendarIds: string[]; // lista de calendar IDs
  timeMin?: string; // ISO (inclusive), default: hoje - 90 dias
  timeMax?: string; // ISO (exclusive), default: hoje + 180 dias
  maxPerCalendar?: number; // limite por calendário (paginação simples)
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

const OAUTH_TOKEN_URL = "https://oauth2.googleapis.com/token";

async function getAccessToken(): Promise<string> {
  const client_id = Deno.env.get("GCAL_CLIENT_ID")!;
  const client_secret = Deno.env.get("GCAL_CLIENT_SECRET")!;
  const refresh_token = Deno.env.get("GCAL_REFRESH_TOKEN")!;
  const body = new URLSearchParams({
    client_id,
    client_secret,
    refresh_token,
    grant_type: "refresh_token",
  });

  const res = await fetch(OAUTH_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to get access token: ${res.status} ${text}`);
  }
  const json = await res.json();
  return json.access_token as string;
}

function normalizeStr(s?: string) {
  return (s ?? "").normalize("NFKD").toLowerCase();
}

function eventTimeToString(ev: GEvent): { start: string; end: string } {
  const s = ev.start?.dateTime ?? ev.start?.date ?? "";
  const e = ev.end?.dateTime ?? ev.end?.date ?? "";
  return { start: s, end: e };
}

async function fetchEventsForCalendar(
  accessToken: string,
  calendarId: string,
  timeMin: string,
  timeMax: string,
  maxPerCalendar = 250
): Promise<GEvent[]> {
  const base = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`;
  const params = new URLSearchParams({
    singleEvents: "true",
    orderBy: "startTime",
    timeMin,
    timeMax,
    maxResults: String(Math.min(Math.max(maxPerCalendar, 1), 250)),
    showDeleted: "false",
  });
  const url = `${base}?${params.toString()}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Events fetch failed (${calendarId}): ${res.status} ${text}`);
  }
  const json = await res.json();
  return (json.items ?? []) as GEvent[];
}

serve(async (req) => {
  try {
    if (req.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "content-type, authorization",
        },
      });
    }

    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Use POST" }), {
        status: 405,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    const payload = (await req.json()) as QueryPayload;
    const {
      query = "",
      calendarIds,
      timeMin,
      timeMax,
      maxPerCalendar = 250,
    } = payload || {};

    if (!Array.isArray(calendarIds) || calendarIds.length === 0) {
      return new Response(JSON.stringify({ error: "calendarIds required" }), {
        status: 400,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    const now = new Date();
    const defaultMin = new Date(now);
    defaultMin.setDate(defaultMin.getDate() - 90);
    const defaultMax = new Date(now);
    defaultMax.setDate(defaultMax.getDate() + 180);

    const q = normalizeStr(query);
    const tMin = timeMin ?? defaultMin.toISOString();
    const tMax = timeMax ?? defaultMax.toISOString();

    const accessToken = await getAccessToken();

    const eventsArrays = await Promise.all(
      calendarIds.map((cid) =>
        fetchEventsForCalendar(accessToken, cid, tMin, tMax, maxPerCalendar)
          .then((list) => ({ cid, list }))
          .catch((err) => {
            console.error("Calendar fetch error", cid, err);
            return { cid, list: [] as GEvent[] };
          })
      )
    );

    const byAttendee = new Map<string, AttendeeHit>();

    for (const { cid, list } of eventsArrays) {
      for (const ev of list) {
        const { start, end } = eventTimeToString(ev);
        const baseEvent = {
          id: ev.id,
          summary: ev.summary ?? "(sem título)",
          start,
          end,
          htmlLink: ev.htmlLink ?? "",
          calendarId: cid,
        };

        (ev.attendees ?? []).forEach((a) => {
          const email = (a.email ?? "").trim();
          const displayName = (a.displayName ?? "").trim();

          if (!email && !displayName) return;

          const hay = normalizeStr(`${displayName} ${email}`);
          if (q && !hay.includes(q)) return;

          const key = (email || displayName).toLowerCase();

          if (!byAttendee.has(key)) {
            byAttendee.set(key, {
              attendee: {
                email: email || "",
                displayName: displayName || "",
              },
              events: [],
            });
          }

          byAttendee.get(key)!.events.push({
            ...baseEvent,
            responseStatus: a.responseStatus,
          });
        });
      }
    }

    const hits = Array.from(byAttendee.values())
      .sort((a, b) => {
        const an = (a.attendee.displayName || a.attendee.email).toLowerCase();
        const bn = (b.attendee.displayName || b.attendee.email).toLowerCase();
        return an.localeCompare(bn);
      })
      .map((hit) => ({
        ...hit,
        events: hit.events.sort((x, y) => (x.start || "").localeCompare(y.start || "")),
      }));

    return new Response(JSON.stringify({ hits }), {
      status: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }
});
