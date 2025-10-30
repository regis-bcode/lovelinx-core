import * as React from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';
import type { DateRange } from 'react-day-picker';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface DateRangePickerProps {
  value?: DateRange;
  onChange?: (range: DateRange | undefined) => void;
  numberOfMonths?: number;
  className?: string;
}

export function DateRangePicker({ value, onChange, numberOfMonths = 2, className }: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false);

  const displayValue = React.useMemo(() => {
    if (value?.from && value.to) {
      return `${format(value.from, 'dd/MM/yyyy', { locale: ptBR })} - ${format(value.to, 'dd/MM/yyyy', { locale: ptBR })}`;
    }
    if (value?.from) {
      return format(value.from, 'dd/MM/yyyy', { locale: ptBR });
    }
    return null;
  }, [value]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'w-full justify-start text-left font-normal',
            !displayValue && 'text-muted-foreground',
            className,
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {displayValue ?? <span>Selecione um período</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="range"
          selected={value}
          onSelect={range => onChange?.(range)}
          numberOfMonths={numberOfMonths}
          locale={ptBR}
          initialFocus
          className="p-3"
        />
      </PopoverContent>
    </Popover>
  );
}
