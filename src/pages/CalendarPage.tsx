import React, { useState } from "react";
import GoogleCalendarEmbed from "@/components/calendar/GoogleCalendarEmbed";
import InlineGuestsView from "@/components/calendar/InlineGuestsView";

export default function CalendarPage() {
  // Quando “modo convidados” estiver ativo E houver convidados selecionados,
  // o componente InlineGuestsView mostra as colunas e o iframe fica oculto.
  const [mode, setMode] = useState<"embed" | "guests">("embed");

  return (
    <div className="flex flex-col h-full w-full">
      <div className="px-4 pt-4 pb-2 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Calendário (Google Agenda) — Avançado
          </h1>
          <p className="text-sm text-muted-foreground">
            Selecione múltiplos calendários, troque a visualização e ajuste o fuso. Ative o modo “Convidados” para filtrar por pessoas.
          </p>
        </div>

        <div className="inline-flex rounded-lg border overflow-hidden">
          <button
            onClick={() => setMode("embed")}
            className={`px-3 py-1.5 text-sm ${mode === "embed" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
            title="Ver Google Calendar incorporado"
          >
            Calendário
          </button>
          <button
            onClick={() => setMode("guests")}
            className={`px-3 py-1.5 text-sm ${mode === "guests" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
            title="Filtrar por Convidados (múltiplos)"
          >
            Convidados
          </button>
        </div>
      </div>

      <div className="flex-1">
        {mode === "embed" ? <GoogleCalendarEmbed /> : <InlineGuestsView />}
      </div>
    </div>
  );
}
