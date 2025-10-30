import { format, parseISO, startOfMonth, startOfWeek } from 'date-fns';
import type { CapacityRow, CapacityGranularity } from '@/types/capacity';

const allocationFlagFor = (capacity: number, planned: number): CapacityRow['allocation_flag'] => {
  if (capacity === 0) {
    return 'no_capacity';
  }
  if (planned > capacity) {
    return 'overallocated';
  }
  if (planned === 0) {
    return 'unallocated';
  }
  if (planned < capacity * 0.5) {
    return 'underallocated';
  }
  return 'ok';
};

export const aggregateCapacityRows = (
  rows: CapacityRow[],
  granularity: CapacityGranularity,
): CapacityRow[] => {
  if (granularity === 'daily') {
    return rows;
  }

  const groups = new Map<string, CapacityRow>();

  rows.forEach(row => {
    const parsed = parseISO(row.date);
    const bucketDate = granularity === 'weekly'
      ? startOfWeek(parsed, { weekStartsOn: 1 })
      : startOfMonth(parsed);
    const bucketKey = `${row.user_id}-${bucketDate.toISOString().slice(0, 10)}`;

    const existing = groups.get(bucketKey);
    if (existing) {
      existing.capacity_minutes += row.capacity_minutes;
      existing.planned_minutes += row.planned_minutes;
      existing.actual_minutes += row.actual_minutes;
    } else {
      groups.set(bucketKey, {
        user_id: row.user_id,
        date: format(bucketDate, 'yyyy-MM-dd'),
        capacity_minutes: row.capacity_minutes,
        planned_minutes: row.planned_minutes,
        actual_minutes: row.actual_minutes,
        allocation_flag: 'ok',
        planned_util_pct: 0,
        actual_util_pct: 0,
      });
    }
  });

  const aggregated: CapacityRow[] = [];

  groups.forEach(value => {
    const flag = allocationFlagFor(value.capacity_minutes, value.planned_minutes);
    const plannedPct = value.capacity_minutes > 0
      ? Number(((value.planned_minutes / value.capacity_minutes) * 100).toFixed(1))
      : 0;
    const actualPct = value.capacity_minutes > 0
      ? Number(((value.actual_minutes / value.capacity_minutes) * 100).toFixed(1))
      : 0;

    aggregated.push({
      ...value,
      allocation_flag: flag,
      planned_util_pct: plannedPct,
      actual_util_pct: actualPct,
    });
  });

  return aggregated.sort((a, b) => {
    if (a.date === b.date) {
      return a.user_id.localeCompare(b.user_id);
    }
    return a.date.localeCompare(b.date);
  });
};
