// src/components/calendar/calendarConfig.ts
/**
 * Centraliza a configuração compartilhada dos calendários utilizados na página
 * avançada do Google Agenda. Manter as definições em um único arquivo evita que
 * seja necessário atualizar múltiplos componentes sempre que um novo calendário
 * for adicionado ou quando o padrão mudar.
 */

export type CalendarItem = {
  id: string;
  label: string;
  color?: string;
  defaultOn?: boolean;
};

export const DEFAULT_TIMEZONE =
  (import.meta as any)?.env?.VITE_GOOGLE_CALENDAR_TZ ?? "America/Sao_Paulo";

export const PRIMARY_CALENDAR_ID =
  (import.meta as any)?.env?.VITE_GOOGLE_CALENDAR_MAIN ??
  "c71ad776a29f8953dc6891f8f1ac46d563ac98f55a67a572d3b89cbd96e8c25c@group.calendar.google.com";

/**
 * Defina aqui os calendários públicos disponíveis na aplicação. O atributo
 * `defaultOn` controla quais calendários iniciam selecionados tanto no embed
 * quanto na busca por convidados.
 */
export const CALENDAR_ITEMS: CalendarItem[] = [
  {
    id: PRIMARY_CALENDAR_ID,
    label: "Principal",
    color: "#0B8043",
    defaultOn: true,
  },
  // Exemplos (substitua por IDs públicos reais da sua equipe, se quiser):
  // {
  //   id: "consultorA@group.calendar.google.com",
  //   label: "Consultor A",
  //   color: "#D50000",
  //   defaultOn: false,
  // },
  // {
  //   id: "consultorB@group.calendar.google.com",
  //   label: "Consultor B",
  //   color: "#3F51B5",
  //   defaultOn: false,
  // },
];

const defaultSelected = CALENDAR_ITEMS.filter((item) => item.defaultOn).map(
  (item) => item.id,
);

/**
 * Lista de IDs selecionados por padrão. Garante ao menos um calendário ativo
 * mesmo se `defaultOn` não for definido explicitamente.
 */
export const DEFAULT_SELECTED_CALENDAR_IDS =
  defaultSelected.length > 0
    ? defaultSelected
    : CALENDAR_ITEMS.map((item) => item.id);

/** Opções básicas com apenas ID e rótulo para componentes que não usam cor. */
export const CALENDAR_OPTIONS = CALENDAR_ITEMS.map((item) => ({
  id: item.id,
  label: item.label,
}));
