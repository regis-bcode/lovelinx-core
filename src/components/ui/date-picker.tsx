import * as React from "react";
import { format, parse, startOfToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar as CalendarIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface DatePickerProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  showTodayButton?: boolean;
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Selecione uma data",
  disabled = false,
  className,
  showTodayButton = false
}: DatePickerProps) {
  const parseDate = React.useCallback((input?: string): Date | undefined => {
    if (!input) return undefined;

    if (input.includes("/")) {
      const parsedFromDisplay = parse(input, "dd/MM/yyyy", new Date());
      if (!Number.isNaN(parsedFromDisplay.getTime())) {
        return parsedFromDisplay;
      }
    }

    const parsed = new Date(input);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }

    return undefined;
  }, []);

  const today = React.useMemo(() => startOfToday(), []);
  const parsedValue = React.useMemo(() => parseDate(value), [parseDate, value]);
  const [date, setDate] = React.useState<Date | undefined>(parsedValue);
  const [month, setMonth] = React.useState<Date>(parsedValue ?? today);

  React.useEffect(() => {
    if (parsedValue) {
      setDate(parsedValue);
      setMonth(parsedValue);
    } else {
      setDate(undefined);
      setMonth(today);
    }
  }, [parsedValue, today]);

  const handleSelect = (selectedDate: Date | undefined) => {
    if (selectedDate && Number.isNaN(selectedDate.getTime())) {
      return;
    }

    setDate(selectedDate);

    if (selectedDate) {
      setMonth(selectedDate);
      const formattedDate = format(selectedDate, "yyyy-MM-dd");
      onChange?.(formattedDate);
      return;
    }

    onChange?.("");
  };

  const handleSelectToday = () => {
    const todayDate = startOfToday();
    setMonth(todayDate);
    handleSelect(todayDate);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-full justify-start text-left font-normal",
            !date && "text-muted-foreground",
            className
          )}
          disabled={disabled}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? (
            format(date, "dd/MM/yyyy", { locale: ptBR })
          ) : (
            <span>{placeholder}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={handleSelect}
          month={month}
          onMonthChange={setMonth}
          initialFocus
          className="p-3 pointer-events-auto"
          locale={ptBR}
        />
        {showTodayButton ? (
          <div className="flex items-center justify-end border-t border-border/60 px-3 py-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleSelectToday}
            >
              Hoje
            </Button>
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}