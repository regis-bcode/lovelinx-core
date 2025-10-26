import type { Task } from '@/types/task';

/**
 * Minimal shape representing a task row with the fields required for the action guards.
 */
export type TaskActionRow = Pick<Partial<Task>, 'tarefa' | 'user_id' | 'responsavel'>;

export interface ResponsibleGuardOptions {
  allowedResponsibleNames?: string[];
}

export type StartTimerDisableReason = 'saving' | 'running' | 'missingName' | 'noResponsible';

export interface StartTimerGuardOptions {
  isSaving: boolean;
  isRunning: boolean;
  allowedResponsibleNames?: string[];
}

export interface StartTimerButtonState {
  disabled: boolean;
  reason: StartTimerDisableReason | null;
}

/**
 * Determines whether a task row has a responsible assigned.
 */
const normalizeString = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();

export const hasAssignedResponsible = (
  row: TaskActionRow,
  options?: ResponsibleGuardOptions,
): boolean => {
  const responsavel = row.responsavel;

  if (typeof responsavel === 'string') {
    const trimmed = responsavel.trim();

    if (trimmed.length > 0) {
      const normalized = normalizeString(trimmed);

      if (normalized === 'sem responsavel') {
        return false;
      }

      const allowedResponsibleNames = options?.allowedResponsibleNames;
      if (Array.isArray(allowedResponsibleNames) && allowedResponsibleNames.length > 0) {
        const normalizedAllowed = allowedResponsibleNames
          .map(name => (typeof name === 'string' ? normalizeString(name) : ''))
          .filter(Boolean);

        if (normalizedAllowed.length > 0) {
          return normalizedAllowed.includes(normalized);
        }
      }

      return true;
    }
  }

  if (typeof row.user_id === 'string' && row.user_id.trim().length > 0) {
    return true;
  }

  return false;
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

  if (!hasAssignedResponsible(row, { allowedResponsibleNames: options.allowedResponsibleNames })) {
    return { disabled: true, reason: 'noResponsible' };
  }

  return { disabled: false, reason: null };
};
