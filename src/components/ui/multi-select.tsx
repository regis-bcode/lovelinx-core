import * as React from "react";
import { X, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Command, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { Command as CommandPrimitive } from "cmdk";
import { Button } from "@/components/ui/button";

export type Option = {
  value: string;
  label: string;
};

interface MultiSelectProps {
  options: Option[];
  selected: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
}

export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = "Selecione...",
}: MultiSelectProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [open, setOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState("");
  const containerRef = React.useRef<HTMLDivElement>(null);

  const handleUnselect = (value: string) => {
    onChange(selected.filter((s) => s !== value));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const input = inputRef.current;
    if (input) {
      if (e.key === "Delete" || e.key === "Backspace") {
        if (input.value === "" && selected.length > 0) {
          onChange(selected.slice(0, -1));
        }
      }
      if (e.key === "Escape") {
        setOpen(false);
        input.blur();
      }
    }
  };

  // Fecha dropdown quando clicar fora
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectables = options.filter((option) => !selected.includes(option.value));

  return (
    <div ref={containerRef} className="relative">
      <Command onKeyDown={handleKeyDown} className="overflow-visible bg-transparent">
        <div className="group border border-input px-3 py-2 text-sm ring-offset-background rounded-md focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
          <div className="flex gap-1 flex-wrap items-center">
            {selected.map((value) => {
              const option = options.find((o) => o.value === value);
              return (
                <Badge key={value} variant="secondary" className="rounded-sm px-2 py-1">
                  {option?.label}
                  <button
                    className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleUnselect(value);
                      }
                    }}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onClick={() => handleUnselect(value)}
                  >
                    <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                  </button>
                </Badge>
              );
            })}
            <div className="flex items-center gap-2 flex-1">
              <CommandPrimitive.Input
                ref={inputRef}
                value={inputValue}
                onValueChange={setInputValue}
                onFocus={() => setOpen(true)}
                placeholder={selected.length === 0 ? placeholder : undefined}
                className="bg-transparent outline-none placeholder:text-muted-foreground flex-1 min-w-[120px]"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 hover:bg-primary hover:text-primary-foreground"
                onClick={(e) => {
                  e.preventDefault();
                  setOpen(!open);
                  if (!open) {
                    inputRef.current?.focus();
                  }
                }}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
        <div className="relative mt-2">
          {open && selectables.length > 0 ? (
            <div className="absolute w-full z-50 top-0 rounded-md border bg-popover text-popover-foreground shadow-md outline-none animate-in">
              <CommandList>
                <CommandGroup className="h-full overflow-auto max-h-64">
                  {selectables.map((option) => {
                    return (
                      <CommandItem
                        key={option.value}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                        onSelect={() => {
                          setInputValue("");
                          onChange([...selected, option.value]);
                          // Mantém o dropdown aberto e foca no input
                          setTimeout(() => {
                            inputRef.current?.focus();
                          }, 10);
                        }}
                        className="cursor-pointer"
                      >
                        {option.label}
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              </CommandList>
            </div>
          ) : open && selectables.length === 0 ? (
            <div className="absolute w-full z-50 top-0 rounded-md border bg-popover text-popover-foreground shadow-md p-4 text-center text-sm text-muted-foreground">
              Nenhum usuário disponível
            </div>
          ) : null}
        </div>
      </Command>
    </div>
  );
}