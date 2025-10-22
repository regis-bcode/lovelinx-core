import type { TimeLogFormData } from '@/types/time-log';

type AllowedColumns = keyof TimeLogFormData | 'created_at' | 'updated_at';

type SanitizablePayload = Partial<Record<AllowedColumns, unknown>> | Record<string, unknown>;

export const TIME_LOG_COLUMNS = new Set<AllowedColumns>([
  'task_id',
  'project_id',
  'user_id',
  'tipo_inclusao',
  'data_inicio',
  'data_fim',
  'status_aprovacao',
  'aprovador_id',
  'aprovador_nome',
  'data_aprovacao',
  'aprovacao_data',
  'aprovacao_hora',
  'observacoes',
  'atividade',
  'justificativa_reprovacao',
  'faturavel',
  'aprovado',
  'comissionado',
  'tempo_trabalhado',
  'is_billable',
  'created_at',
  'updated_at',
]);

export function sanitizeTimeLogPayload(payload: SanitizablePayload): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(payload)) {
    if (value === undefined) {
      continue;
    }

    if (TIME_LOG_COLUMNS.has(key as AllowedColumns)) {
      sanitized[key] = value;
    }
  }

  return sanitized;
}
