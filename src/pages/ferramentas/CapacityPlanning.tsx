import { useCallback, useEffect, useMemo, useState } from 'react';
import { addDays, format } from 'date-fns';
import type { DateRange } from 'react-day-picker';

import AggregatedTable from '@/components/capacity-planning/AggregatedTable';
import FiltersBar from '@/components/capacity-planning/FiltersBar';
import Heatmap from '@/components/capacity-planning/Heatmap';
import Kpis from '@/components/capacity-planning/Kpis';
import OverUnderPanels from '@/components/capacity-planning/OverUnderPanels';
import { AllocationEditorDialog, CapacityEditorDialog, SuggestionDialog } from '@/components/capacity-planning/Editors';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { aggregateCapacityRows } from '@/lib/capacity/grouping';
import type { Analyst, CapacityGranularity, CapacityRow } from '@/types/capacity';

const granularityOptions: { value: CapacityGranularity; label: string }[] = [
  { value: 'daily', label: 'Diário' },
  { value: 'weekly', label: 'Semanal' },
  { value: 'monthly', label: 'Mensal' },
];

export default function CapacityPlanningPage() {
  const [range, setRange] = useState<DateRange | undefined>({ from: new Date(), to: addDays(new Date(), 28) });
  const [rows, setRows] = useState<CapacityRow[]>([]);
  const [analysts, setAnalysts] = useState<Analyst[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [granularity, setGranularity] = useState<CapacityGranularity>('daily');
  const [capacityDialogOpen, setCapacityDialogOpen] = useState(false);
  const [allocationDialogOpen, setAllocationDialogOpen] = useState(false);
  const [suggestionDialogOpen, setSuggestionDialogOpen] = useState(false);
  const [suggestedAnalyst, setSuggestedAnalyst] = useState<Analyst | null>(null);

  const { toast } = useToast();

  const resolvedRange = useMemo(() => {
    const baseFrom = range?.from ?? new Date();
    const baseTo = range?.to ?? (range?.from ? addDays(range.from, 28) : addDays(new Date(), 28));
    return {
      from: baseFrom,
      to: baseTo,
      fromISO: format(baseFrom, 'yyyy-MM-dd'),
      toISO: format(baseTo, 'yyyy-MM-dd'),
    };
  }, [range?.from?.getTime?.(), range?.to?.getTime?.()]);

  const selectedUsersKey = useMemo(() => selectedUsers.slice().sort().join(','), [selectedUsers]);

  useEffect(() => {
    let active = true;
    supabase
      .rpc('list_analysts')
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          toast({ title: 'Erro ao carregar analistas', description: error.message, variant: 'destructive' });
          return;
        }
        const mapped = (data ?? []).map(item => ({
          id: (item as { id: string }).id,
          name: ((item as { name?: string | null }).name ?? (item as { email?: string | null }).email ?? '') as string,
          email: ((item as { email?: string | null }).email ?? '') as string,
        }));
        setAnalysts(mapped);
      });

    return () => {
      active = false;
    };
  }, [toast]);

  const loadSnapshot = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc('get_capacity_snapshot', {
      _from: resolvedRange.fromISO,
      _to: resolvedRange.toISO,
      _user_ids: selectedUsers.length ? selectedUsers : null,
    });
    setLoading(false);

    if (error) {
      toast({ title: 'Erro ao carregar dados de capacidade', description: error.message, variant: 'destructive' });
      return;
    }

    const normalized = (data ?? []).map(item => ({
      user_id: (item as { user_id: string }).user_id,
      date: (item as { date: string }).date,
      capacity_minutes: Number((item as { capacity_minutes?: number | string | null }).capacity_minutes ?? 0),
      planned_minutes: Number((item as { planned_minutes?: number | string | null }).planned_minutes ?? 0),
      actual_minutes: Number((item as { actual_minutes?: number | string | null }).actual_minutes ?? 0),
      allocation_flag: (item as { allocation_flag: CapacityRow['allocation_flag'] }).allocation_flag,
      planned_util_pct: Number((item as { planned_util_pct?: number | string | null }).planned_util_pct ?? 0),
      actual_util_pct: Number((item as { actual_util_pct?: number | string | null }).actual_util_pct ?? 0),
    }));

    setRows(normalized);
  }, [resolvedRange.fromISO, resolvedRange.toISO, selectedUsers, toast]);

  useEffect(() => {
    loadSnapshot();
  }, [loadSnapshot, selectedUsersKey]);

  const analystMap = useMemo(() => {
    const map = new Map<string, Analyst>();
    analysts.forEach(analyst => {
      map.set(analyst.id, analyst);
    });
    return map;
  }, [analysts]);

  const displayRows = useMemo(() => aggregateCapacityRows(rows, granularity), [rows, granularity]);

  const exportCsv = () => {
    if (displayRows.length === 0) {
      toast({ title: 'Nada para exportar', variant: 'destructive' });
      return;
    }

    const header = ['Analista', 'Email', 'Data', 'Capacidade (min)', 'Planejado (min)', 'Real (min)', 'Status', 'Planejado (%)', 'Real (%)'];
    const dataRows = displayRows.map(row => {
      const analyst = analystMap.get(row.user_id);
      return [
        analyst?.name ?? row.user_id,
        analyst?.email ?? '',
        row.date,
        String(row.capacity_minutes),
        String(row.planned_minutes),
        String(row.actual_minutes),
        row.allocation_flag,
        String(row.planned_util_pct),
        String(row.actual_util_pct),
      ];
    });

    const csvContent = [header, ...dataRows].map(r => r.map(value => `"${String(value).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `capacity-${granularity}-${resolvedRange.fromISO}-${resolvedRange.toISO}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleSuggest = (analyst: Analyst) => {
    setSuggestedAnalyst(analyst);
    setSuggestionDialogOpen(true);
  };

  return (
    <div className="space-y-6 p-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Gestão de Capacidade</h1>
          <p className="text-sm text-muted-foreground">Gestão de capacidade, planejado e esforço real.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ToggleGroup type="single" value={granularity} onValueChange={value => value && setGranularity(value as CapacityGranularity)}>
            {granularityOptions.map(option => (
              <ToggleGroupItem key={option.value} value={option.value} aria-label={option.label}>
                {option.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <Button variant="outline" onClick={() => setCapacityDialogOpen(true)}>Nova capacidade</Button>
          <Button variant="outline" onClick={() => setAllocationDialogOpen(true)}>Nova alocação</Button>
          <Button variant="outline" onClick={exportCsv} disabled={!displayRows.length}>
            Exportar CSV
          </Button>
          <Button onClick={loadSnapshot} disabled={loading}>
            {loading ? 'Carregando…' : 'Atualizar'}
          </Button>
        </div>
      </div>

      <FiltersBar range={range} onRange={setRange} analysts={analysts} value={selectedUsers} onChange={setSelectedUsers} />

      <Kpis rows={displayRows} />

      <AggregatedTable rows={displayRows} analysts={analysts} granularity={granularity} />

      {granularity === 'daily' ? (
        <>
          <Heatmap rows={rows} analysts={analysts} onSuggest={handleSuggest} />
          <OverUnderPanels rows={rows} analysts={analysts} />
        </>
      ) : (
        <Card className="rounded-2xl border border-dashed p-6 text-sm text-muted-foreground">
          Ajuste a granularidade para diária para visualizar o heatmap e os painéis de exceções.
        </Card>
      )}

      <CapacityEditorDialog
        open={capacityDialogOpen}
        onOpenChange={setCapacityDialogOpen}
        analysts={analysts}
        onSaved={loadSnapshot}
      />
      <AllocationEditorDialog
        open={allocationDialogOpen}
        onOpenChange={setAllocationDialogOpen}
        analysts={analysts}
        onSaved={loadSnapshot}
      />
      <SuggestionDialog open={suggestionDialogOpen} onOpenChange={setSuggestionDialogOpen} analyst={suggestedAnalyst} />
    </div>
  );
}
