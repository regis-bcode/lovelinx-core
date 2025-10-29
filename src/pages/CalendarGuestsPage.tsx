import React from "react";
import GuestEventsSearch from "@/components/calendar/GuestEventsSearch";

export default function CalendarGuestsPage() {
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

      <div className="px-4 pb-4 flex-1">
        <GuestEventsSearch />
      </div>
    </div>
  );
}
