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
  {
    id: "joao.luiz@baumgratzcode.com.br",
    label: "João Luiz",
    color: "#D81B60",
    defaultOn: true,
  },
  {
    id: "alinegomes@baumgratzcode.com.br",
    label: "Aline Gomes",
    color: "#039BE5",
    defaultOn: true,
  },
  {
    id: "athaufo.ereira@baumgratzcode.com.br",
    label: "Athaufo Pereira",
    color: "#F6BF26",
    defaultOn: true,
  },
  {
    id: "douglas.baumgratz@baumgratzcode.com.br",
    label: "Douglas Baumgratz",
    color: "#8E24AA",
    defaultOn: true,
  },
  {
    id: "eduardo@baumgratzcode.com.br",
    label: "Eduardo",
    color: "#43A047",
    defaultOn: true,
  },
  {
    id: "fernanda@baumgratzcode.com.br",
    label: "Fernanda",
    color: "#F4511E",
    defaultOn: true,
  },
  {
    id: "francesco@baumgratzcode.com.br",
    label: "Francesco",
    color: "#3949AB",
    defaultOn: true,
  },
  {
    id: "geovanabonoto@baumgratzcode.com.br",
    label: "Geovana Bonoto",
    color: "#00ACC1",
    defaultOn: true,
  },
  {
    id: "gustavo@baumgratzcode.com.br",
    label: "Gustavo",
    color: "#7CB342",
    defaultOn: true,
  },
  {
    id: "jhonnymagrini@baumgratzcode.com.br",
    label: "Jhonny Magrini",
    color: "#FF7043",
    defaultOn: true,
  },
  {
    id: "joaocustodio@baumgratzcode.com.br",
    label: "João Custódio",
    color: "#5C6BC0",
    defaultOn: true,
  },
  {
    id: "juliocesar@baumgratzcode.com.br",
    label: "Júlio Cesar",
    color: "#26A69A",
    defaultOn: true,
  },
  {
    id: "marcosantonio@baumgratzcode.com.br",
    label: "Marcos Antônio",
    color: "#EF6C00",
    defaultOn: true,
  },
  {
    id: "rafael@baumgratzcode.com.br",
    label: "Rafael Corrêa",
    color: "#AB47BC",
    defaultOn: true,
  },
  {
    id: "samara@baumgratzcode.com.br",
    label: "Samara",
    color: "#26C6DA",
    defaultOn: true,
  },
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
