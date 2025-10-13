import type { Status } from '@/types/status';

export interface StatusColorOption {
  name: string;
  description: string;
  value: string;
}

export const STATUS_COLOR_PALETTE: StatusColorOption[] = [
  { name: 'Azul Boreal', description: 'Fluxos em andamento e estáveis.', value: '#38bdf8' },
  { name: 'Verde Esmeralda', description: 'Resultados dentro do planejado.', value: '#34d399' },
  { name: 'Lima Vibrante', description: 'Momentos de atenção ou acompanhamento.', value: '#a3e635' },
  { name: 'Âmbar Solar', description: 'Sinalizações preventivas e alertas.', value: '#facc15' },
  { name: 'Laranja Coral', description: 'Itens em risco iminente.', value: '#fb923c' },
  { name: 'Vermelho Aurora', description: 'Entregas críticas ou atrasadas.', value: '#f87171' },
  { name: 'Violeta Nebulosa', description: 'Status em pausa ou aguardando ação.', value: '#a855f7' },
  { name: 'Slate Profundo', description: 'Itens concluídos ou cancelados.', value: '#475569' },
];

export const FALLBACK_STATUS_COLOR = STATUS_COLOR_PALETTE[0].value;

export const DEFAULT_STATUS_COLOR_BY_NAME: Record<string, string> = {
  'Não Iniciado': '#64748b',
  'Conforme Planejado': '#34d399',
  'Atenção': '#f59e0b',
  'Atrasado': '#ef4444',
  'Pausado': '#a855f7',
  'Cancelado': '#0f172a',
};

export type MinimalStatus = Pick<Status, 'nome' | 'cor'> | { nome?: string | null; cor?: string | null };

export const getStatusColorValue = (status?: MinimalStatus | null): string => {
  if (!status) return FALLBACK_STATUS_COLOR;

  const trimmedColor = status.cor?.trim();
  if (trimmedColor) {
    return trimmedColor;
  }

  const normalizedName = status.nome?.trim();
  if (normalizedName && DEFAULT_STATUS_COLOR_BY_NAME[normalizedName]) {
    return DEFAULT_STATUS_COLOR_BY_NAME[normalizedName];
  }

  return FALLBACK_STATUS_COLOR;
};

export const ensureStatusColor = <T extends MinimalStatus>(status: T): T & { cor: string } => ({
  ...status,
  cor: getStatusColorValue(status),
});

export const hexToRgba = (hex: string, alpha = 1): string => {
  const sanitized = hex.replace('#', '').trim();
  if (sanitized.length !== 6) {
    return `rgba(56, 189, 248, ${alpha})`;
  }

  const bigint = parseInt(sanitized, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};
