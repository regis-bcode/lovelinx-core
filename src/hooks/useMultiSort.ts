import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export type SortDirection = 'asc' | 'desc';

export interface SortRule {
  id: string;
  key: string;
  label: string;
  direction: SortDirection;
}

export interface UseMultiSortOptions {
  storageKey: string;
  initialRules?: SortRule[];
  onSortChange?: (rules: SortRule[]) => void;
}

interface AddRuleInput {
  key: string;
  label: string;
  direction?: SortDirection;
  id?: string;
}

const isSortRuleArray = (value: unknown): value is SortRule[] => {
  if (!Array.isArray(value)) {
    return false;
  }

  return value.every(item => {
    return (
      item &&
      typeof item === 'object' &&
      typeof (item as SortRule).key === 'string' &&
      typeof (item as SortRule).label === 'string' &&
      (item as SortRule).direction !== undefined
    );
  });
};

const sanitizeRules = (rules: SortRule[]): SortRule[] => {
  const seen = new Set<string>();
  return rules
    .filter(rule => {
      if (!rule || typeof rule !== 'object') {
        return false;
      }
      if (!rule.key || !rule.label) {
        return false;
      }
      const identifier = rule.id || rule.key;
      if (seen.has(identifier)) {
        return false;
      }
      seen.add(identifier);
      return true;
    })
    .map(rule => ({
      id: rule.id || rule.key,
      key: rule.key,
      label: rule.label,
      direction: rule.direction === 'desc' ? 'desc' : 'asc',
    }));
};

const persistRules = (storageKey: string, rules: SortRule[]) => {
  try {
    if (typeof window === 'undefined') {
      return;
    }
    window.localStorage.setItem(storageKey, JSON.stringify(rules));
  } catch (error) {
    console.warn('Não foi possível salvar regras de ordenação:', error);
  }
};

const readPersistedRules = (storageKey: string): SortRule[] | null => {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw);
    if (!isSortRuleArray(parsed)) {
      return null;
    }
    return sanitizeRules(parsed);
  } catch (error) {
    console.warn('Não foi possível restaurar regras de ordenação:', error);
    return null;
  }
};

export const rulesToOrderBy = (rules: SortRule[]) =>
  rules.map(rule => ({ column: rule.key, direction: rule.direction }));

export const useMultiSort = ({
  storageKey,
  initialRules = [],
  onSortChange,
}: UseMultiSortOptions) => {
  const isHydrated = useRef(false);
  const [sortRules, setSortRules] = useState<SortRule[]>(() => sanitizeRules(initialRules));

  useEffect(() => {
    if (typeof window === 'undefined' || isHydrated.current) {
      return;
    }
    const restored = readPersistedRules(storageKey);
    if (restored) {
      setSortRules(restored);
    }
    isHydrated.current = true;
  }, [storageKey]);

  useEffect(() => {
    if (!isHydrated.current) {
      return;
    }
    persistRules(storageKey, sortRules);
    onSortChange?.(sortRules);
  }, [sortRules, storageKey, onSortChange]);

  const addRule = useCallback(
    ({ key, label, direction = 'asc', id }: AddRuleInput) => {
      if (!key || !label) {
        return;
      }
      setSortRules(prev => {
        if (prev.some(rule => rule.key === key)) {
          return prev;
        }
        const next: SortRule[] = [
          ...prev,
          {
            id: id ?? key,
            key,
            label,
            direction,
          },
        ];
        return next;
      });
    },
    [],
  );

  const toggleDirection = useCallback((key: string) => {
    setSortRules(prev =>
      prev.map(rule =>
        rule.key === key
          ? {
              ...rule,
              direction: rule.direction === 'asc' ? 'desc' : 'asc',
            }
          : rule,
      ),
    );
  }, []);

  const removeRule = useCallback((key: string) => {
    setSortRules(prev => prev.filter(rule => rule.key !== key));
  }, []);

  const reorderRules = useCallback((fromIndex: number, toIndex: number) => {
    setSortRules(prev => {
      if (
        fromIndex === toIndex ||
        fromIndex < 0 ||
        toIndex < 0 ||
        fromIndex >= prev.length ||
        toIndex >= prev.length
      ) {
        return prev;
      }
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  }, []);

  const clearAll = useCallback(() => {
    setSortRules([]);
  }, []);

  const getRuleForKey = useCallback(
    (key: string) => sortRules.find(rule => rule.key === key),
    [sortRules],
  );

  const rulePositions = useMemo(() => {
    const positions = new Map<string, number>();
    sortRules.forEach((rule, index) => {
      positions.set(rule.key, index + 1);
    });
    return positions;
  }, [sortRules]);

  return {
    sortRules,
    addRule,
    toggleDirection,
    removeRule,
    reorderRules,
    clearAll,
    getRuleForKey,
    rulePositions,
  } as const;
};

export type UseMultiSortReturn = ReturnType<typeof useMultiSort>;
