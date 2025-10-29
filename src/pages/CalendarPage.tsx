// src/pages/CalendarPage.tsx
import React from "react";
import GoogleCalendarEmbed from "@/components/calendar/GoogleCalendarEmbed";

export default function CalendarPage() {
  return (
    <div className="flex flex-col h-full w-full">
      {/* Cabeçalho opcional – ajuste conforme seu layout */}
      <div className="px-4 pt-4 pb-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          Calendário (Google Agenda)
        </h1>
        <p className="text-sm text-muted-foreground">
          Visão completa da agenda integrada do Google.
        </p>
      </div>

      {/* Corpo com o iframe em tela cheia */}
      <div className="flex-1">
        <GoogleCalendarEmbed />
      </div>
    </div>
  );
}
