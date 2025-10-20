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

const shouldFallbackToNomeColumn = (error: unknown): boolean => {
  if (typeof error !== 'object' || error === null) {
    return false;
  }

  const typedError = error as { code?: string; message?: string };
  return typedError.code === 'PGRST204' && typeof typedError.message === 'string'
    ? typedError.message.includes("'tarefa' column")
    : false;
};

const buildInsertPayload = (
  basePayload: Record<string, unknown>,
  useNomeColumn: boolean,
): Record<string, unknown> => {
  const payload: Record<string, unknown> = { ...basePayload };

  if ('tarefa' in payload) {
    const raw = payload.tarefa;
    if (useNomeColumn) {
      payload.nome = raw;
      delete payload.tarefa;
    } else if (typeof raw === 'string') {
      payload.tarefa = raw.trim();
    }
  }

  return payload;
};

export const normalizeDatabaseTaskRecord = (record: Task | (Task & { nome?: string | null })): Task => {
  const tarefaNome = typeof record.tarefa === 'string' && record.tarefa.trim().length > 0
    ? record.tarefa.trim()
    : typeof record.nome === 'string' && record.nome.trim().length > 0
      ? record.nome.trim()
      : '';

  return {
    ...record,
    tarefa: tarefaNome,
    custom_fields: (record.custom_fields ?? {}) as Record<string, unknown>,
    cronograma: Boolean(record.cronograma),
    percentual_conclusao:
      typeof record.percentual_conclusao === 'number' ? record.percentual_conclusao : 0,
    nivel: typeof record.nivel === 'number' ? record.nivel : 0,
    ordem: typeof record.ordem === 'number' ? record.ordem : 0,
  };
};

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

  let useNomeColumn = false;

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

    const dataToInsert = buildInsertPayload(payload, useNomeColumn);

    const { data, error } = await supabase
      .from('tasks')
      .insert(dataToInsert)
      .select('*')
      .single();

    if (!error) {
      if (!data) {
        throw new Error('Resposta inválida ao criar tarefa.');
      }

      const rawTask = data as Task;
      const normalizedRecord = normalizeDatabaseTaskRecord(rawTask);
      const normalizedTaskId = ensureTaskIdentifier(normalizedRecord.task_id, normalizedRecord.id);

      const normalized: Task = {
        ...normalizedRecord,
        task_id: normalizedTaskId,
      };

      return normalized;
    }

    if (shouldFallbackToNomeColumn(error)) {
      useNomeColumn = true;
      continue;
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
