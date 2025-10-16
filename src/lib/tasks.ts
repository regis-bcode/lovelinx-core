import { supabase } from '@/integrations/supabase/client';

interface CreateTaskParams {
  projectId: string;
  userId: string;
  nome: string;
  prioridade?: string | null;
  vencimento?: string | Date | null;
  status?: string | null;
  extras?: Record<string, unknown> | null;
}

const VALID_PRIORITIES = new Set(['Baixa', 'Média', 'Alta', 'Crítica']);

const normalizePriority = (value?: string | null): string => {
  if (!value) {
    return 'Média';
  }

  const trimmed = value.trim();
  return VALID_PRIORITIES.has(trimmed) ? trimmed : 'Média';
};

const normalizeStatus = (value?: string | null): string => {
  if (!value) {
    return 'Atenção';
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : 'Atenção';
};

const sanitizeExtras = (extras?: Record<string, unknown> | null) => {
  if (!extras) {
    return {} as Record<string, unknown>;
  }

  return Object.entries(extras).reduce<Record<string, unknown>>((acc, [key, value]) => {
    if (value === undefined) {
      return acc;
    }

    if (value === null) {
      acc[key] = null;
      return acc;
    }

    if (value instanceof Date) {
      acc[key] = value.toISOString();
      return acc;
    }

    if (typeof value === 'string') {
      const trimmed = value.trim();
      acc[key] = trimmed.length > 0 ? trimmed : null;
      return acc;
    }

    acc[key] = value;
    return acc;
  }, {});
};

export async function createTask(params: CreateTaskParams): Promise<{ id: string; task_id: string }> {
  const payload: Record<string, unknown> = {
    project_id: params.projectId,
    user_id: params.userId,
    nome: params.nome.trim(),
    prioridade: normalizePriority(params.prioridade),
    status: normalizeStatus(params.status),
  };

  if (params.vencimento instanceof Date) {
    payload.data_vencimento = params.vencimento.toISOString();
  } else if (typeof params.vencimento === 'string' && params.vencimento.trim().length > 0) {
    payload.data_vencimento = params.vencimento.trim();
  }

  const extras = sanitizeExtras(params.extras);
  Object.assign(payload, extras);

  if (!('custom_fields' in payload)) {
    payload.custom_fields = {};
  }

  const { data, error } = await supabase
    .from('tasks')
    .insert(payload)
    .select('id, task_id')
    .single();

  if (error) {
    throw error;
  }

  if (!data?.task_id) {
    throw new Error('INSERT ok, mas task_id não retornou (trigger ausente?).');
  }

  return data as { id: string; task_id: string };
}
