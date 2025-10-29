// src/components/calendar/GoogleCalendarEmbed.tsx
import React, { useMemo } from "react";

/**
 * Componente de incorporação do Google Calendar em tela cheia e responsivo.
 * Usa variáveis de ambiente se existirem; caso contrário, usa os valores informados pelo Regis.
 */
const GOOGLE_CAL_ID =
  import.meta?.env?.VITE_GOOGLE_CALENDAR_ID ??
  "c71ad776a29f8953dc6891f8f1ac46d563ac98f55a67a572d3b89cbd96e8c25c@group.calendar.google.com";

const GOOGLE_CAL_TZ =
  import.meta?.env?.VITE_GOOGLE_CALENDAR_TZ ?? "America/Sao_Paulo";

export default function GoogleCalendarEmbed() {
  const src = useMemo(() => {
    const base = "https://calendar.google.com/calendar/embed";
    const params = new URLSearchParams({
      src: GOOGLE_CAL_ID,
      ctz: GOOGLE_CAL_TZ,
      // você pode habilitar/ocultar elementos do calendário usando parâmetros extras:
      // mode: "WEEK", // MONTH, AGENDA, etc. (opcional)
      // showTitle: "0", showPrint: "0", showTabs: "1", showTz: "0", showCalendars: "0"
      // height/width são controlados por CSS; deixamos fora da URL
    });
    return `${base}?${params.toString()}`;
  }, []);

  return (
    <div className="w-full h-full min-h-[calc(100vh-4rem)] bg-background">
      <div className="mx-auto h-[calc(100vh-6rem)] w-full max-w-[1400px] p-2 sm:p-4">
        <div className="h-full w-full rounded-2xl shadow-lg overflow-hidden border">
          <iframe
            src={src}
            title="Google Calendar"
            className="h-full w-full"
            style={{ border: 0 }}
            frameBorder={0}
            scrolling="no"
            allow="fullscreen"
          />
        </div>
      </div>
    </div>
  );
}
