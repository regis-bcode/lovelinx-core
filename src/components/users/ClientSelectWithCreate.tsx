import { useState } from "react";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useClients } from "@/hooks/useClients";
import { ClientForm } from "@/components/clients/ClientForm";
import type { Client } from "@/types/client";

interface ClientSelectWithCreateProps {
  value?: string;
  onChange: (value?: string) => void;
}

export function ClientSelectWithCreate({ value, onChange }: ClientSelectWithCreateProps) {
  const [open, setOpen] = useState(false);
  const [isClientFormOpen, setIsClientFormOpen] = useState(false);
  const { clients, isLoading, createClient, isCreating } = useClients();

  const selectedClient = clients.find((client) => client.id === value);

  const handleCreateClient = (clientData: any) => {
    createClient(clientData);
    setIsClientFormOpen(false);
  };

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
          >
            {selectedClient
              ? `${selectedClient.cod_int_cli} - ${selectedClient.nome}`
              : "Selecionar cliente..."}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0">
          <Command>
            <CommandInput placeholder="Buscar cliente..." />
            <CommandEmpty>
              <div className="p-4 text-center">
                <p className="text-sm text-muted-foreground mb-2">
                  Nenhum cliente encontrado.
                </p>
                <Button
                  size="sm"
                  onClick={() => {
                    setIsClientFormOpen(true);
                    setOpen(false);
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Criar novo cliente
                </Button>
              </div>
            </CommandEmpty>
            <CommandGroup>
              <CommandItem
                onSelect={() => {
                  onChange(undefined);
                  setOpen(false);
                }}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    !value ? "opacity-100" : "opacity-0"
                  )}
                />
                Nenhum cliente
              </CommandItem>
              {clients.map((client) => (
                <CommandItem
                  key={client.id}
                  value={`${client.cod_int_cli}-${client.nome}`}
                  onSelect={() => {
                    onChange(client.id);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === client.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div>
                    <div className="font-medium">
                      {client.cod_int_cli} - {client.nome}
                    </div>
                    {client.email && (
                      <div className="text-xs text-muted-foreground">
                        {client.email}
                      </div>
                    )}
                  </div>
                </CommandItem>
              ))}
              <CommandItem
                onSelect={() => {
                  setIsClientFormOpen(true);
                  setOpen(false);
                }}
                className="border-t mt-2 pt-2"
              >
                <Plus className="mr-2 h-4 w-4" />
                Criar novo cliente
              </CommandItem>
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>

      <ClientForm
        isOpen={isClientFormOpen}
        onClose={() => setIsClientFormOpen(false)}
        onSubmit={handleCreateClient}
        isLoading={isCreating}
      />
    </>
  );
}