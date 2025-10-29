// src/pages/CalendarPage.tsx
import React from "react";
import GoogleCalendarEmbed from "@/components/calendar/GoogleCalendarEmbed";

export default function CalendarPage() {
  return (
    <div className="flex flex-col h-full w-full">
      <div className="px-4 pt-4 pb-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          Calendário (Google Agenda) — Avançado
        </h1>
        <p className="text-sm text-muted-foreground">
          Selecione múltiplos calendários, troque a visualização e ajuste o fuso.
        </p>
      </div>
      <div className="flex-1">
        <GoogleCalendarEmbed />
      </div>
    </div>
  );
}
