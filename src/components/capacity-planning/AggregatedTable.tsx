import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { pct, toHours } from '@/lib/capacity/format';
import type { Analyst, CapacityGranularity, CapacityRow } from '@/types/capacity';

const formatLabel = (date: string, granularity: CapacityGranularity) => {
  const parsed = parseISO(date);
  if (granularity === 'weekly') {
    const end = new Date(parsed);
    end.setDate(end.getDate() + 6);
    return `${format(parsed, 'dd MMM', { locale: ptBR })} - ${format(end, 'dd MMM', { locale: ptBR })}`;
  }
  if (granularity === 'monthly') {
    return format(parsed, "MMMM 'de' yyyy", { locale: ptBR });
  }
  return format(parsed, 'dd/MM/yyyy', { locale: ptBR });
};

type AggregatedTableProps = {
  rows: CapacityRow[];
  analysts: Analyst[];
  granularity: CapacityGranularity;
};

export default function AggregatedTable({ rows, analysts, granularity }: AggregatedTableProps) {
  if (granularity === 'daily' || rows.length === 0) {
    return null;
  }

  const analystName = (id: string) => analysts.find(a => a.id === id)?.name ?? id;

  return (
    <Card className="p-4">
      <div className="mb-4 text-sm font-semibold text-muted-foreground">Visão agregada ({granularity})</div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Analista</TableHead>
              <TableHead>Período</TableHead>
              <TableHead className="text-right">Capacidade (h)</TableHead>
              <TableHead className="text-right">Planejado (h)</TableHead>
              <TableHead className="text-right">Real (h)</TableHead>
              <TableHead className="text-right">Planejado (%)</TableHead>
              <TableHead className="text-right">Real (%)</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(row => (
              <TableRow key={`${row.user_id}-${row.date}`}>
                <TableCell>{analystName(row.user_id)}</TableCell>
                <TableCell>{formatLabel(row.date, granularity)}</TableCell>
                <TableCell className="text-right">{toHours(row.capacity_minutes)}</TableCell>
                <TableCell className="text-right">{toHours(row.planned_minutes)}</TableCell>
                <TableCell className="text-right">{toHours(row.actual_minutes)}</TableCell>
                <TableCell className="text-right">{pct(row.planned_util_pct)}</TableCell>
                <TableCell className="text-right">{pct(row.actual_util_pct)}</TableCell>
                <TableCell className="capitalize">{row.allocation_flag.replace('_', ' ')}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}
