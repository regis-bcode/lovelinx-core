import type { Task } from '@/types/task';

/**
 * Minimal shape representing a task row with the fields required for the action guards.
 */
export type TaskActionRow = Pick<Partial<Task>, 'tarefa' | 'user_id' | 'responsavel'>;

export type StartTimerDisableReason = 'saving' | 'running' | 'missingName' | 'noResponsible';

export interface StartTimerGuardOptions {
  isSaving: boolean;
  isRunning: boolean;
}

export interface StartTimerButtonState {
  disabled: boolean;
  reason: StartTimerDisableReason | null;
}

/**
 * Determines whether a task row has a responsible assigned.
 */
export const hasAssignedResponsible = (row: TaskActionRow): boolean => {
  if (typeof row.user_id === 'string' && row.user_id.trim().length > 0) {
    return true;
  }

  const responsavel = row.responsavel;

  if (typeof responsavel !== 'string') {
    return false;
  }

  const trimmed = responsavel.trim();
  if (!trimmed) {
    return false;
  }

  const normalized = trimmed.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  return normalized !== 'sem responsavel';
};

const hasValidTaskName = (row: TaskActionRow): boolean => {
  const trimmedName = typeof row.tarefa === 'string' ? row.tarefa.trim() : '';
  return trimmedName.length > 0;
};

/**
 * Computes the disabled state and the reason for the start timer button.
 */
export const getStartTimerButtonState = (
  row: TaskActionRow,
  options: StartTimerGuardOptions,
): StartTimerButtonState => {
  if (options.isSaving) {
    return { disabled: true, reason: 'saving' };
  }

  if (options.isRunning) {
    return { disabled: true, reason: 'running' };
  }

  if (!hasValidTaskName(row)) {
    return { disabled: true, reason: 'missingName' };
  }

  if (!hasAssignedResponsible(row)) {
    return { disabled: true, reason: 'noResponsible' };
  }

  return { disabled: false, reason: null };
};
