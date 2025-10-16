const FALLBACK_PREFIX = 'TMP-';
const FALLBACK_LENGTH = 6;

const sanitizeSource = (source: string): string => {
  return source.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
};

const buildIdentifierFromSource = (source: string): string => {
  const sanitized = sanitizeSource(source);
  const chunk = sanitized.slice(-FALLBACK_LENGTH) || sanitized.slice(0, FALLBACK_LENGTH);

  if (chunk.length > 0) {
    return `${FALLBACK_PREFIX}${chunk.padStart(FALLBACK_LENGTH, '0')}`;
  }

  return '';
};

const randomFallback = () => {
  const random = Math.random().toString(36).toUpperCase().replace(/[^A-Z0-9]/g, '');
  const chunk = random.slice(0, FALLBACK_LENGTH).padEnd(FALLBACK_LENGTH, '0');
  return `${FALLBACK_PREFIX}${chunk}`;
};

export const ensureTaskIdentifier = (
  taskId: string | null | undefined,
  fallbackSource?: string | null,
): string => {
  if (typeof taskId === 'string') {
    const trimmed = taskId.trim();
    if (trimmed.length > 0) {
      return trimmed;
    }
  }

  if (typeof fallbackSource === 'string') {
    const trimmedSource = fallbackSource.trim();
    if (trimmedSource.length > 0) {
      const fromSource = buildIdentifierFromSource(trimmedSource);
      if (fromSource.length > 0) {
        return fromSource;
      }
    }
  }

  return randomFallback();
};
