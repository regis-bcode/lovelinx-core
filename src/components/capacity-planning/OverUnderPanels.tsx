import type { Analyst, CapacityRow } from '@/types/capacity';

const labelFor = (analysts: Analyst[], id: string) => analysts.find(a => a.id === id)?.name ?? id;

type BlockProps = {
  title: string;
  data: CapacityRow[];
  analysts: Analyst[];
};

const Block = ({ title, data, analysts }: BlockProps) => (
  <div className="rounded-2xl border p-3">
    <div className="mb-2 font-semibold">
      {title} ({data.length})
    </div>
    <div className="max-h-64 space-y-2 overflow-auto text-sm">
      {data.length === 0 ? (
        <div className="rounded-lg border border-dashed p-3 text-center text-muted-foreground">Nenhum registro.</div>
      ) : (
        data.map((row, index) => (
          <div key={`${row.user_id}-${row.date}-${index}`} className="flex items-center justify-between rounded-lg border px-3 py-2">
            <div>
              <div className="font-medium">{labelFor(analysts, row.user_id)}</div>
              <div className="text-xs text-muted-foreground">{row.date}</div>
            </div>
            <div className="text-right text-xs">
              <div>Cap: {row.capacity_minutes}m</div>
              <div>Plan: {row.planned_minutes}m</div>
              <div>Real: {row.actual_minutes}m</div>
            </div>
          </div>
        ))
      )}
    </div>
  </div>
);

type PanelsProps = {
  rows: CapacityRow[];
  analysts: Analyst[];
};

export default function OverUnderPanels({ rows, analysts }: PanelsProps) {
  const over = rows.filter(row => row.allocation_flag === 'overallocated');
  const under = rows.filter(row => row.allocation_flag === 'underallocated');
  const none = rows.filter(row => row.allocation_flag === 'unallocated');

  return (
    <div className="grid gap-3 md:grid-cols-3">
      <Block title="Overalocação" data={over} analysts={analysts} />
      <Block title="Baixa Alocação" data={under} analysts={analysts} />
      <Block title="Sem Alocação" data={none} analysts={analysts} />
    </div>
  );
}
