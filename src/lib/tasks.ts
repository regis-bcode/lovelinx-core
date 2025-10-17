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

type CreatedTask = Pick<
  Task,
  |
    'id'
    | 'task_id'
    | 'project_id'
    | 'user_id'
    | 'nome'
    | 'prioridade'
    | 'status'
    | 'data_vencimento'
    | 'cliente'
    | 'percentual_conclusao'
    | 'nivel'
    | 'ordem'
    | 'custom_fields'
    | 'cronograma'
> & {
  created_at: string;
  updated_at: string;
};

export async function createTask(params: CreateTaskParams): Promise<CreatedTask> {
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

  const trimmedTaskId =
    typeof payload.task_id === 'string' ? payload.task_id.trim() : undefined;
  if (trimmedTaskId) {
    payload.task_id = trimmedTaskId;
  } else {
    delete payload.task_id;
  }

  let attempts = 0;
  while (attempts < 3) {
    attempts += 1;

    if (typeof payload.task_id !== 'string') {
      try {
        payload.task_id = await generateNextTaskIdentifier(params.projectId);
      } catch (generationError) {
        console.error('Erro ao gerar task_id sequencial:', generationError);
        payload.task_id = ensureTaskIdentifier(null, params.projectId);
      }
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
      .select(
        `id, task_id, project_id, user_id, nome, prioridade, status, data_vencimento, cliente, percentual_conclusao, nivel, ordem, custom_fields, cronograma, created_at, updated_at`,
      )
      .single();

    if (!error) {
      if (!data) {
        throw new Error('Resposta inválida ao criar tarefa.');
      }

      const normalizedTaskId = ensureTaskIdentifier(data.task_id, data.id);

      const normalized: CreatedTask = {
        ...data,
        task_id: normalizedTaskId,
        custom_fields: (data.custom_fields ?? {}) as Record<string, unknown>,
        cronograma: Boolean(data.cronograma),
        percentual_conclusao: typeof data.percentual_conclusao === 'number' ? data.percentual_conclusao : 0,
        nivel: typeof data.nivel === 'number' ? data.nivel : 0,
        ordem: typeof data.ordem === 'number' ? data.ordem : 0,
      };

      return normalized;
    }

    const isUniqueViolation = error.code === '23505';
    if (!isUniqueViolation || attempts >= 3) {
      throw error;
    }

    // Em caso de conflito de chave, gerar um novo identificador e tentar novamente
    delete payload.task_id;
  }

  throw new Error('Não foi possível criar a tarefa com um identificador único.');
}
