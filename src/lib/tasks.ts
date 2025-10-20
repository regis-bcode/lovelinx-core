import { supabase } from '@/integrations/supabase/client';
import type { Task } from '@/types/task';
import { ensureTaskIdentifier } from './taskIdentifier';

const TASK_ID_PREFIX = 'TSK-';
const TASK_ID_PADDING = 1;

const extractNumericPortion = (taskId: string | null | undefined): number | null => {
  if (typeof taskId !== 'string') {
    return null;
  }

  const digits = taskId.replace(/[^0-9]/g, '').trim();
  if (!digits) {
    return null;
  }

  const parsed = Number.parseInt(digits, 10);
  return Number.isFinite(parsed) ? parsed : null;
};

export const generateNextTaskIdentifier = async (projectId: string): Promise<string> => {
  const { data, error } = await supabase
    .from('tasks')
    .select('task_id')
    .eq('project_id', projectId);

  if (error) {
    throw error;
  }

  const nextNumber = (data ?? []).reduce((highest, record) => {
    const numeric = extractNumericPortion((record as { task_id?: string | null }).task_id ?? null);
    if (numeric !== null && numeric > highest) {
      return numeric;
    }
    return highest;
  }, 0) + 1;

  return `${TASK_ID_PREFIX}${String(nextNumber).padStart(TASK_ID_PADDING, '0')}`;
};

interface CreateTaskParams {
  projectId: string;
  userId: string;
  tarefa: string;
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

export async function createTask(params: CreateTaskParams): Promise<Task> {
  const payload: Record<string, unknown> = {
    project_id: params.projectId,
    user_id: params.userId,
    tarefa: params.tarefa.trim(),
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

  const ensureSequentialIdentifier = async () => {
    try {
      return await generateNextTaskIdentifier(params.projectId);
    } catch (generationError) {
      console.error('Erro ao gerar task_id sequencial:', generationError);
      return ensureTaskIdentifier(null, params.projectId);
    }
  };

  const buildFallbackIdentifier = (attempt: number) => {
    const seed = `${params.projectId}-${Date.now()}-${attempt}-${Math.random()
      .toString(36)
      .slice(2, 8)}`;
    return ensureTaskIdentifier(null, seed);
  };

  const trimmedTaskId =
    typeof payload.task_id === 'string' ? payload.task_id.trim() : undefined;
  if (trimmedTaskId) {
    payload.task_id = trimmedTaskId;
  } else {
    delete payload.task_id;
  }

  let attempts = 0;
  let lastError: unknown = null;

  while (attempts < 5) {
    attempts += 1;

    if (typeof payload.task_id !== 'string' || payload.task_id.trim().length === 0) {
      payload.task_id = attempts === 1
        ? await ensureSequentialIdentifier()
        : buildFallbackIdentifier(attempts);
    } else {
      payload.task_id = payload.task_id.trim();
    }

    if (!('custom_fields' in payload)) {
      payload.custom_fields = {};
    }

    if (!('percentual_conclusao' in payload)) {
      payload.percentual_conclusao = 0;
    }

    if (!('nivel' in payload)) {
      payload.nivel = 0;
    }

    if (!('ordem' in payload)) {
      payload.ordem = 0;
    }

    if (!('cronograma' in payload)) {
      payload.cronograma = false;
    }

    const { data, error } = await supabase
      .from('tasks')
      .insert(payload)
      .select('*')
      .single();

    if (!error) {
      if (!data) {
        throw new Error('Resposta inválida ao criar tarefa.');
      }

      const rawTask = data as Task;
      const normalizedTaskId = ensureTaskIdentifier(rawTask.task_id, rawTask.id);

      const normalized: Task = {
        ...rawTask,
        task_id: normalizedTaskId,
        custom_fields: (rawTask.custom_fields ?? {}) as Record<string, unknown>,
        cronograma: Boolean(rawTask.cronograma),
        percentual_conclusao:
          typeof rawTask.percentual_conclusao === 'number' ? rawTask.percentual_conclusao : 0,
        nivel: typeof rawTask.nivel === 'number' ? rawTask.nivel : 0,
        ordem: typeof rawTask.ordem === 'number' ? rawTask.ordem : 0,
      };

      return normalized;
    }

    const isUniqueViolation = (error as { code?: string }).code === '23505';
    if (!isUniqueViolation) {
      throw error;
    }

    lastError = error;
    delete payload.task_id;
  }

  throw lastError ?? new Error('Não foi possível criar a tarefa com um identificador único.');
}
