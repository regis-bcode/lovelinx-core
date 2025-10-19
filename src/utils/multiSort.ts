import type { SortRule } from '@/hooks/useMultiSort';

export type MultiSortAccessor<T> = (row: T) => unknown;
export type MultiSortNormalizer<T> = (value: unknown, row: T) => unknown;

export interface MultiSortOptions<T> {
  /**
   * Funções opcionais para normalizar valores antes de comparar.
   * Use para mapear prioridades, datas ou outros tipos customizados.
   */
  valueNormalizers?: Record<string, MultiSortNormalizer<T>>;
  /**
   * Locale a ser utilizado na comparação de strings (default: 'pt-BR').
   */
  locale?: string | string[];
  /**
   * Opções repassadas ao Intl.Collator para comparações de string.
   */
  collatorOptions?: Intl.CollatorOptions;
}

const DEFAULT_LOCALE = 'pt-BR';
const collatorCache = new Map<string, Intl.Collator>();

const getCollator = (locale: string | string[], options?: Intl.CollatorOptions) => {
  const key = Array.isArray(locale)
    ? `${locale.join(',')}::${JSON.stringify(options ?? {})}`
    : `${locale}::${JSON.stringify(options ?? {})}`;
  const cached = collatorCache.get(key);
  if (cached) {
    return cached;
  }
  const collator = new Intl.Collator(locale, {
    usage: 'sort',
    sensitivity: 'accent',
    numeric: true,
    ...options,
  });
  collatorCache.set(key, collator);
  return collator;
};

const isDateLike = (value: unknown): value is Date => value instanceof Date && !Number.isNaN(value.getTime());

const toDate = (value: unknown): Date | null => {
  if (value instanceof Date) {
    return isDateLike(value) ? value : null;
  }
  if (typeof value === 'number') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }
    const date = new Date(trimmed);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  return null;
};

const isNullish = (value: unknown): boolean => value === null || value === undefined;

const comparePrimitive = (
  a: unknown,
  b: unknown,
  collator: Intl.Collator,
): number => {
  if (typeof a === 'number' && typeof b === 'number') {
    return a - b;
  }

  if (typeof a === 'bigint' && typeof b === 'bigint') {
    return Number(a - b);
  }

  if (typeof a === 'boolean' && typeof b === 'boolean') {
    return Number(a) - Number(b);
  }

  if (typeof a === 'string' && typeof b === 'string') {
    return collator.compare(a, b);
  }

  const dateA = toDate(a);
  const dateB = toDate(b);
  if (dateA && dateB) {
    return dateA.getTime() - dateB.getTime();
  }

  if (typeof a === 'number' && typeof b !== 'number') {
    return comparePrimitive(String(a), String(b), collator);
  }

  if (typeof b === 'number' && typeof a !== 'number') {
    return comparePrimitive(String(a), String(b), collator);
  }

  return collator.compare(String(a ?? ''), String(b ?? ''));
};

export function multiSort<T>(
  data: T[],
  rules: SortRule[],
  accessors: Record<string, MultiSortAccessor<T>>,
  options?: MultiSortOptions<T>,
): T[] {
  if (!Array.isArray(data) || data.length <= 1 || !rules.length) {
    return data.slice();
  }

  const collator = getCollator(options?.locale ?? DEFAULT_LOCALE, options?.collatorOptions);
  const normalizers = options?.valueNormalizers ?? {};

  const decorated = data.map((item, index) => ({ item, index }));

  decorated.sort((entryA, entryB) => {
    for (const rule of rules) {
      const accessor = accessors[rule.key];
      if (!accessor) {
        continue;
      }

      const rawA = accessor(entryA.item);
      const rawB = accessor(entryB.item);

      const normalizer = normalizers[rule.key];
      const valueA = normalizer ? normalizer(rawA, entryA.item) : rawA;
      const valueB = normalizer ? normalizer(rawB, entryB.item) : rawB;

      const aIsNull = isNullish(valueA);
      const bIsNull = isNullish(valueB);

      if (aIsNull && bIsNull) {
        continue;
      }

      if (aIsNull) {
        return 1;
      }

      if (bIsNull) {
        return -1;
      }

      const comparison = comparePrimitive(valueA, valueB, collator);
      if (comparison !== 0) {
        return rule.direction === 'asc' ? comparison : -comparison;
      }
    }

    return entryA.index - entryB.index;
  });

  return decorated.map(entry => entry.item);
}
