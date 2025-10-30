import { Button } from '@/components/ui/button';
import { flagColor } from '@/lib/capacity/format';
import type { Analyst, CapacityRow } from '@/types/capacity';

type HeatmapProps = {
  rows: CapacityRow[];
  analysts: Analyst[];
  onSuggest?: (analyst: Analyst) => void;
};

export default function Heatmap({ rows, analysts, onSuggest }: HeatmapProps) {
  const byUser = new Map<string, CapacityRow[]>();
  rows.forEach(row => {
    const current = byUser.get(row.user_id) ?? [];
    current.push(row);
    byUser.set(row.user_id, current);
  });

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
        Nenhum dado encontrado para o período selecionado.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {[...byUser.entries()].map(([userId, items]) => {
        const analyst = analysts.find(a => a.id === userId);
        const sorted = [...items].sort((a, b) => a.date.localeCompare(b.date));

        return (
          <div key={userId} className="overflow-hidden rounded-2xl border">
            <div className="flex items-center justify-between border-b bg-muted/40 px-4 py-3">
              <div className="font-medium">{analyst?.name ?? userId}</div>
              {onSuggest && analyst ? (
                <Button size="sm" variant="outline" onClick={() => onSuggest(analyst)}>
                  Sugerir janelas
                </Button>
              ) : null}
            </div>
            <div className="grid auto-cols-fr grid-flow-col overflow-x-auto p-3">
              {sorted.map(item => (
                <div
                  key={item.date}
                  className={`m-1 flex h-20 w-20 flex-col items-center justify-center rounded-lg text-center text-[11px] text-white ${flagColor(item.allocation_flag)}`}
                  title={`${item.date} | Cap: ${item.capacity_minutes}m | Plan: ${item.planned_minutes}m | Real: ${item.actual_minutes}m`}
                >
                  <div className="text-xs font-semibold">{new Date(item.date).getDate()}</div>
                  <div>{Math.round(item.planned_util_pct)}%</div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
