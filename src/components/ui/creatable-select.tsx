import { useState, useRef, useEffect } from "react";
import { Check, Plus, ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface CreatableSelectProps {
  value?: string;
  onValueChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  emptyMessage?: string;
  className?: string;
  onCreate?: (value: string) => void;
}

export function CreatableSelect({
  value,
  onValueChange,
  options,
  placeholder = "Selecione ou crie novo...",
  emptyMessage = "Nenhuma opção encontrada.",
  className,
}: CreatableSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [newValue, setNewValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredOptions = options.filter(option =>
    option.toLowerCase().includes(search.toLowerCase())
  );

  const canCreate = search && !options.some(option => 
    option.toLowerCase() === search.toLowerCase()
  );

  useEffect(() => {
    if (isCreating && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isCreating]);

  const handleCreate = () => {
    if (newValue.trim()) {
      onValueChange(newValue.trim());
      setOpen(false);
      setIsCreating(false);
      setNewValue("");
      setSearch("");
    }
  };

  const handleSelect = (selectedValue: string) => {
    onValueChange(selectedValue);
    setOpen(false);
    setSearch("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && canCreate) {
      e.preventDefault();
      onValueChange(search);
      setOpen(false);
      setSearch("");
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "group flex w-full items-center justify-between rounded-xl border border-white/10 bg-[hsla(var(--popover)/0.85)] px-4 py-2 text-sm font-medium text-popover-foreground shadow-[0_18px_38px_-20px_rgba(9,27,63,0.55)] transition-all duration-200 ease-out ring-offset-background placeholder:text-muted-foreground hover:border-accent/70 hover:bg-[hsla(var(--popover)/0.92)] focus:outline-none focus:ring-0 focus:ring-offset-0 data-[state=open]:border-accent data-[state=open]:shadow-[0_30px_60px_-24px_rgba(9,27,63,0.55)] disabled:cursor-not-allowed disabled:opacity-60",
            "text-left [&>span]:line-clamp-1",
            className,
          )}
        >
          <span className={cn("block truncate", value ? "text-foreground" : "text-muted-foreground")}>{value || placeholder}</span>
          <ChevronDown className="h-4 w-4 shrink-0 text-accent transition-transform duration-200 group-data-[state=open]:rotate-180" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="z-50 w-[--radix-popover-trigger-width] min-w-[12rem] max-w-full rounded-xl border border-white/10 bg-[hsla(var(--popover)/0.95)] p-0 text-popover-foreground shadow-[0_32px_68px_-28px_rgba(9,27,63,0.65)] backdrop-blur-xl"
      >
        <Command className="w-full">
          <CommandInput
            placeholder="Buscar ou criar novo..."
            value={search}
            onValueChange={setSearch}
            onKeyDown={handleKeyDown}
            className="h-11 border-b border-white/10 text-sm"
          />
          <CommandList className="max-h-60">
            <CommandEmpty className="flex flex-col gap-2 p-3 text-center text-sm text-muted-foreground">
              {canCreate ? (
                <div className="flex flex-col gap-2">
                  <span>{emptyMessage}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="w-full justify-start text-sm"
                    onClick={() => {
                      onValueChange(search);
                      setOpen(false);
                      setSearch("");
                    }}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Criar "{search}"
                  </Button>
                </div>
              ) : (
                emptyMessage
              )}
            </CommandEmpty>
            <CommandGroup className="flex flex-col gap-1 p-2">
              {filteredOptions.map((option) => (
                <CommandItem
                  key={option}
                  value={option}
                  onSelect={() => handleSelect(option)}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-[hsla(var(--popover-foreground)/0.85)] data-[selected='true']:bg-accent data-[selected='true']:text-accent-foreground"
                >
                  <Check
                    className={cn(
                      "h-4 w-4 text-accent",
                      value === option ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span className="truncate">{option}</span>
                </CommandItem>
              ))}
              {canCreate && filteredOptions.length > 0 && (
                <CommandItem
                  value={search}
                  onSelect={() => {
                    onValueChange(search);
                    setOpen(false);
                    setSearch("");
                  }}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-accent"
                >
                  <Plus className="h-4 w-4" />
                  <span className="truncate">Criar "{search}"</span>
                </CommandItem>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}