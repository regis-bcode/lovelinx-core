import { useCallback, useEffect, useState } from 'react';

export const PROJECT_ACTIVE_TIMERS_EVENT = 'project-active-timers-updated';

interface ProjectActiveTimersEventDetail {
  projectId?: string;
  hasActiveTimers?: boolean;
}

const sanitizeActiveTimersRecord = (value: unknown): Record<string, number> => {
  if (!value || typeof value !== 'object') {
    return {};
  }

  return Object.entries(value as Record<string, unknown>).reduce<Record<string, number>>(
    (acc, [taskId, entryValue]) => {
      if (typeof entryValue === 'number' && Number.isFinite(entryValue) && entryValue > 0) {
        acc[taskId] = entryValue;
      }
      return acc;
    },
    {},
  );
};

const getHasActiveTimersFromStorage = (storageKey: string): boolean => {
  try {
    const stored = window.localStorage.getItem(storageKey);
    if (!stored) {
      return false;
    }

    const parsed = JSON.parse(stored) as unknown;
    const normalized =
      parsed && typeof parsed === 'object' && 'active' in parsed
        ? (parsed as { active?: unknown }).active
        : parsed;

    const sanitized = sanitizeActiveTimersRecord(normalized);
    return Object.keys(sanitized).length > 0;
  } catch (error) {
    console.error('Erro ao verificar temporizadores ativos:', error);
    window.localStorage.removeItem(storageKey);
    return false;
  }
};

export const notifyProjectActiveTimersChange = (projectId: string, hasActiveTimers: boolean) => {
  if (typeof window === 'undefined') {
    return;
  }

  const detail: ProjectActiveTimersEventDetail = { projectId, hasActiveTimers };
  window.dispatchEvent(new CustomEvent<ProjectActiveTimersEventDetail>(PROJECT_ACTIVE_TIMERS_EVENT, { detail }));
};

export const useProjectActiveTimersIndicator = (projectId?: string | null) => {
  const [hasActiveTimers, setHasActiveTimers] = useState(false);

  const updateFromStorage = useCallback(
    (storageKey: string) => {
      if (typeof window === 'undefined') {
        return;
      }

      setHasActiveTimers(getHasActiveTimersFromStorage(storageKey));
    },
    [],
  );

  useEffect(() => {
    if (!projectId) {
      setHasActiveTimers(false);
      return;
    }

    if (typeof window === 'undefined') {
      return;
    }

    const storageKey = `task-active-timers-${projectId}`;
    updateFromStorage(storageKey);

    const handleStorage = (event: StorageEvent) => {
      if (event.key && event.key !== storageKey) {
        return;
      }
      updateFromStorage(storageKey);
    };

    const handleCustomEvent = (event: Event) => {
      const customEvent = event as CustomEvent<ProjectActiveTimersEventDetail>;
      if (!customEvent.detail || customEvent.detail.projectId !== projectId) {
        return;
      }

      if (typeof customEvent.detail.hasActiveTimers === 'boolean') {
        setHasActiveTimers(customEvent.detail.hasActiveTimers);
      } else {
        updateFromStorage(storageKey);
      }
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener(PROJECT_ACTIVE_TIMERS_EVENT, handleCustomEvent as EventListener);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener(PROJECT_ACTIVE_TIMERS_EVENT, handleCustomEvent as EventListener);
    };
  }, [projectId, updateFromStorage]);

  return hasActiveTimers;
};

