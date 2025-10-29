// src/pages/CalendarPage.tsx
import React from "react";
import GoogleCalendarEmbed from "@/components/calendar/GoogleCalendarEmbed";
import GuestEventsSearch from "@/components/calendar/GuestEventsSearch";

export default function CalendarPage() {
  return (
    <div className="flex flex-col h-full w-full">
      <div className="px-4 pt-4 pb-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          Calendário (Google Agenda) — Avançado
        </h1>
        <p className="text-sm text-muted-foreground">
          Selecione múltiplos calendários, troque a visualização e ajuste o
          fuso.
        </p>
      </div>
      <div className="flex-1 flex flex-col gap-6 pb-6">
        <GoogleCalendarEmbed />
        <div className="px-4 flex flex-col gap-2">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">
              Visão por Convidado
            </h2>
            <p className="text-sm text-muted-foreground">
              Pesquise por parte do nome ou e-mail para localizar convidados e
              selecione vários ao mesmo tempo (ex.: digitar "Regis" sugere
              <code className="ml-1">regis.baumgratzcode.com.br</code>).
            </p>
          </div>
          <GuestEventsSearch />
        </div>
      </div>
    </div>
  );
}
