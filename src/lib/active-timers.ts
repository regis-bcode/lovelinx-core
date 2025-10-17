export type ActiveTimerRecord = Record<string, number>;

export const sanitizeActiveTimerRecord = (value: ActiveTimerRecord | Record<string, unknown> | null | undefined): ActiveTimerRecord => {
  if (!value || typeof value !== 'object') {
    return {};
  }

  return Object.entries(value).reduce<ActiveTimerRecord>((acc, [taskId, entryValue]) => {
    if (typeof entryValue === 'number' && Number.isFinite(entryValue) && entryValue > 0) {
      acc[taskId] = entryValue;
    }
    return acc;
  }, {});
};

export const areActiveTimerRecordsEqual = (a: ActiveTimerRecord, b: ActiveTimerRecord): boolean => {
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);

  if (aKeys.length !== bKeys.length) {
    return false;
  }

  return aKeys.every(key => a[key] === b[key]);
};

export const persistActiveTimerRecord = (storageKey: string, record: ActiveTimerRecord) => {
  if (typeof window === 'undefined') {
    return;
  }

  if (Object.keys(record).length === 0) {
    window.localStorage.removeItem(storageKey);
    return;
  }

  window.localStorage.setItem(storageKey, JSON.stringify({ active: record }));
};

export const readActiveTimerRecord = (storageKey: string): ActiveTimerRecord => {
  if (typeof window === 'undefined') {
    return {};
  }

  try {
    const stored = window.localStorage.getItem(storageKey);
    if (!stored) {
      return {};
    }

    const parsed = JSON.parse(stored) as unknown;
    const normalized = parsed && typeof parsed === 'object' && 'active' in parsed
      ? (parsed as { active?: unknown }).active
      : parsed;

    return sanitizeActiveTimerRecord(normalized as ActiveTimerRecord | Record<string, unknown>);
  } catch (error) {
    console.error('Erro ao restaurar temporizadores salvos:', error);
    window.localStorage.removeItem(storageKey);
    return {};
  }
};
