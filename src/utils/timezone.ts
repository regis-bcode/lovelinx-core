export const SAO_PAULO_TIMEZONE = 'America/Sao_Paulo';

const isoDateFormatterCache = new Map<string, Intl.DateTimeFormat>();

const getIsoDateFormatter = (timeZone: string): Intl.DateTimeFormat => {
  if (!isoDateFormatterCache.has(timeZone)) {
    isoDateFormatterCache.set(
      timeZone,
      new Intl.DateTimeFormat('en-CA', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }),
    );
  }

  return isoDateFormatterCache.get(timeZone)!;
};

export const getIsoDateInTimeZone = (date: Date, timeZone = SAO_PAULO_TIMEZONE): string => {
  const formatter = getIsoDateFormatter(timeZone);
  return formatter.format(date);
};
