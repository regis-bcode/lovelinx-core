import { Card } from '@/components/ui/card';
import { toHours } from '@/lib/capacity/format';
import type { CapacityRow } from '@/types/capacity';

export default function Kpis({ rows }: { rows: CapacityRow[] }) {
  const totals = rows.reduce(
    (acc, row) => {
      acc.cap += row.capacity_minutes;
      acc.plan += row.planned_minutes;
      acc.act += row.actual_minutes;
      if (row.allocation_flag === 'overallocated') acc.over += 1;
      if (row.allocation_flag === 'underallocated') acc.under += 1;
      if (row.allocation_flag === 'unallocated') acc.none += 1;
      return acc;
    },
    { cap: 0, plan: 0, act: 0, over: 0, under: 0, none: 0 },
  );

  return (
    <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-6">
      <Card className="p-4">
        <div className="text-sm text-muted-foreground">Capacidade (h)</div>
        <div className="text-2xl font-semibold">{toHours(totals.cap)}</div>
      </Card>
      <Card className="p-4">
        <div className="text-sm text-muted-foreground">Planejado (h)</div>
        <div className="text-2xl font-semibold">{toHours(totals.plan)}</div>
      </Card>
      <Card className="p-4">
        <div className="text-sm text-muted-foreground">Real (h)</div>
        <div className="text-2xl font-semibold">{toHours(totals.act)}</div>
      </Card>
      <Card className="p-4">
        <div className="text-sm text-muted-foreground">Dias Over</div>
        <div className="text-2xl font-semibold">{totals.over}</div>
      </Card>
      <Card className="p-4">
        <div className="text-sm text-muted-foreground">Dias Under</div>
        <div className="text-2xl font-semibold">{totals.under}</div>
      </Card>
      <Card className="p-4">
        <div className="text-sm text-muted-foreground">Sem Alocação</div>
        <div className="text-2xl font-semibold">{totals.none}</div>
      </Card>
    </div>
  );
}
