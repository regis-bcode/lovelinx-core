import type { DateRange } from 'react-day-picker';

import { DateRangePicker } from '@/components/ui/date-range-picker';
import { MultiSelect } from '@/components/ui/multi-select';
import type { Analyst } from '@/types/capacity';

interface FiltersBarProps {
  range: DateRange | undefined;
  onRange: (range: DateRange | undefined) => void;
  analysts: Analyst[];
  value: string[];
  onChange: (ids: string[]) => void;
}

export default function FiltersBar({ range, onRange, analysts, value, onChange }: FiltersBarProps) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <div className="space-y-1">
        <span className="text-sm font-medium text-muted-foreground">Período</span>
        <DateRangePicker value={range} onChange={onRange} />
      </div>
      <div className="space-y-1">
        <span className="text-sm font-medium text-muted-foreground">Analistas</span>
        <MultiSelect
          options={analysts.map(a => ({ label: `${a.name} <${a.email}>`, value: a.id }))}
          selected={value}
          onChange={onChange}
          placeholder="Selecione analistas"
        />
      </div>
    </div>
  );
}
