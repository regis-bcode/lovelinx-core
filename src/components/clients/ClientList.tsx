import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Search, Edit, Trash2, Filter, Layers } from "lucide-react";
import { useClients } from "@/hooks/useClients";
import { ClientForm } from "./ClientForm";
import type { Client } from "@/types/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";

type GroupableField =
  | "none"
  | "status"
  | "cidade"
  | "estado"
  | "pais"
  | "cod_int_cli"
  | "nome"
  | "razao_social"
  | "cnpj"
  | "cpf"
  | "email"
  | "telefone"
  | "endereco"
  | "cep"
  | "observacoes";

type ClientGroupField = Exclude<GroupableField, "none" | "status">;
type ClientFieldKey = Extract<ClientGroupField, keyof Client>;

export function ClientList() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [deletingClient, setDeletingClient] = useState<Client | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [groupBy, setGroupBy] = useState<GroupableField>("none");
  const [filters, setFilters] = useState({
    cod_int_cli: "",
    nome: "",
    razao_social: "",
    cnpj: "",
    cpf: "",
    email: "",
    telefone: "",
    endereco: "",
    cidade: "",
    estado: "",
    cep: "",
    pais: "",
    status: "all" as "all" | "Ativo" | "Inativo",
    observacoes: "",
  });

  const {
    clients,
    isLoading,
    createClient,
    updateClient,
    deleteClient,
    isCreating,
    isUpdating,
    isDeleting,
  } = useClients();

  const groupableFields: { value: GroupableField; label: string }[] = useMemo(
    () => [
      { value: "none", label: "Sem agrupamento" },
      { value: "status", label: "Status" },
      { value: "cidade", label: "Cidade" },
      { value: "estado", label: "Estado" },
      { value: "pais", label: "País" },
      { value: "cod_int_cli", label: "Código interno" },
      { value: "nome", label: "Nome" },
      { value: "razao_social", label: "Razão social" },
      { value: "cnpj", label: "CNPJ" },
      { value: "cpf", label: "CPF" },
      { value: "email", label: "E-mail" },
      { value: "telefone", label: "Telefone" },
      { value: "endereco", label: "Endereço" },
      { value: "cep", label: "CEP" },
      { value: "observacoes", label: "Observações" },
    ],
    []
  );

  const handleFilterChange = (field: keyof typeof filters, value: string) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const filteredClients = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return clients.filter((client) => {
      const searchMatches =
        normalizedSearch.length === 0 ||
        client.nome.toLowerCase().includes(normalizedSearch) ||
        client.cod_int_cli.toLowerCase().includes(normalizedSearch) ||
        (client.email?.toLowerCase().includes(normalizedSearch) ?? false) ||
        (client.cnpj?.replace(/\D/g, "").includes(normalizedSearch.replace(/\D/g, "")) ?? false) ||
        (client.cpf?.replace(/\D/g, "").includes(normalizedSearch.replace(/\D/g, "")) ?? false);

      const matchesStatus =
        filters.status === "all" ||
        client.status === filters.status;

      const matchesFields =
        (filters.cod_int_cli ? client.cod_int_cli.toLowerCase().includes(filters.cod_int_cli.toLowerCase()) : true) &&
        (filters.nome ? client.nome.toLowerCase().includes(filters.nome.toLowerCase()) : true) &&
        (filters.razao_social ? (client.razao_social ?? "").toLowerCase().includes(filters.razao_social.toLowerCase()) : true) &&
        (filters.cnpj ? (client.cnpj ?? "").toLowerCase().includes(filters.cnpj.toLowerCase()) : true) &&
        (filters.cpf ? (client.cpf ?? "").toLowerCase().includes(filters.cpf.toLowerCase()) : true) &&
        (filters.email ? (client.email ?? "").toLowerCase().includes(filters.email.toLowerCase()) : true) &&
        (filters.telefone ? (client.telefone ?? "").toLowerCase().includes(filters.telefone.toLowerCase()) : true) &&
        (filters.endereco ? (client.endereco ?? "").toLowerCase().includes(filters.endereco.toLowerCase()) : true) &&
        (filters.cidade ? (client.cidade ?? "").toLowerCase().includes(filters.cidade.toLowerCase()) : true) &&
        (filters.estado ? (client.estado ?? "").toLowerCase().includes(filters.estado.toLowerCase()) : true) &&
        (filters.cep ? (client.cep ?? "").toLowerCase().includes(filters.cep.toLowerCase()) : true) &&
        (filters.pais ? (client.pais ?? "").toLowerCase().includes(filters.pais.toLowerCase()) : true) &&
        (filters.observacoes ? (client.observacoes ?? "").toLowerCase().includes(filters.observacoes.toLowerCase()) : true);

      return searchMatches && matchesStatus && matchesFields;
    });
  }, [clients, searchTerm, filters]);

  const groupedClients = useMemo(() => {
    if (groupBy === "none") {
      return [{ key: "Todos os clientes", clients: filteredClients }];
    }

    const map = new Map<string, Client[]>();

    filteredClients.forEach((client) => {
      let key = "";

      if (groupBy === "status") {
        key = client.status;
      } else {
        const field = groupBy as ClientFieldKey;
        const value = client[field];
        if (typeof value === "string" && value.trim().length > 0) {
          key = value;
        } else {
          key = "Não informado";
        }
      }

      if (!map.has(key)) {
        map.set(key, []);
      }

      map.get(key)!.push(client);
    });

    return Array.from(map.entries()).map(([key, clients]) => ({ key, clients }));
  }, [filteredClients, groupBy]);

  const handleClearFilters = () => {
    setFilters({
      cod_int_cli: "",
      nome: "",
      razao_social: "",
      cnpj: "",
      cpf: "",
      email: "",
      telefone: "",
      endereco: "",
      cidade: "",
      estado: "",
      cep: "",
      pais: "",
      status: "all",
      observacoes: "",
    });
    setSearchTerm("");
  };

  const handleEdit = (client: Client) => {
    setEditingClient(client);
    setIsFormOpen(true);
  };

  const handleDelete = (client: Client) => {
    setDeletingClient(client);
  };

  const confirmDelete = () => {
    if (deletingClient) {
      deleteClient(deletingClient.id);
      setDeletingClient(null);
    }
  };

  const handleFormSubmit = (data: any) => {
    if (editingClient) {
      updateClient({ ...data, id: editingClient.id });
    } else {
      createClient(data);
    }
    setEditingClient(null);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingClient(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-3">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Buscar por nome, código, e-mail, CNPJ ou CPF..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowFilters((prev) => !prev)}>
              <Filter className="h-4 w-4 mr-2" />
              {showFilters ? "Ocultar filtros" : "Exibir filtros"}
            </Button>
            <Select value={groupBy} onValueChange={setGroupBy}>
              <SelectTrigger className="min-w-[180px]">
                <SelectValue placeholder="Agrupar por" />
              </SelectTrigger>
              <SelectContent>
                {groupableFields.map((field) => (
                  <SelectItem key={field.value} value={field.value}>
                    {field.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <Button onClick={() => setIsFormOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Cliente
        </Button>
      </div>

      {showFilters && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              <Input
                placeholder="Código interno"
                value={filters.cod_int_cli}
                onChange={(event) => handleFilterChange("cod_int_cli", event.target.value)}
              />
              <Input
                placeholder="Nome"
                value={filters.nome}
                onChange={(event) => handleFilterChange("nome", event.target.value)}
              />
              <Input
                placeholder="Razão social"
                value={filters.razao_social}
                onChange={(event) => handleFilterChange("razao_social", event.target.value)}
              />
              <Input
                placeholder="CNPJ"
                value={filters.cnpj}
                onChange={(event) => handleFilterChange("cnpj", event.target.value)}
              />
              <Input
                placeholder="CPF"
                value={filters.cpf}
                onChange={(event) => handleFilterChange("cpf", event.target.value)}
              />
              <Input
                placeholder="E-mail"
                value={filters.email}
                onChange={(event) => handleFilterChange("email", event.target.value)}
              />
              <Input
                placeholder="Telefone"
                value={filters.telefone}
                onChange={(event) => handleFilterChange("telefone", event.target.value)}
              />
              <Input
                placeholder="Endereço"
                value={filters.endereco}
                onChange={(event) => handleFilterChange("endereco", event.target.value)}
              />
              <Input
                placeholder="Cidade"
                value={filters.cidade}
                onChange={(event) => handleFilterChange("cidade", event.target.value)}
              />
              <Input
                placeholder="Estado"
                value={filters.estado}
                onChange={(event) => handleFilterChange("estado", event.target.value)}
              />
              <Input
                placeholder="CEP"
                value={filters.cep}
                onChange={(event) => handleFilterChange("cep", event.target.value)}
              />
              <Input
                placeholder="País"
                value={filters.pais}
                onChange={(event) => handleFilterChange("pais", event.target.value)}
              />
              <Select value={filters.status} onValueChange={(value) => handleFilterChange("status", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="Ativo">Ativo</SelectItem>
                  <SelectItem value="Inativo">Inativo</SelectItem>
                </SelectContent>
              </Select>
              <Input
                placeholder="Observações"
                value={filters.observacoes}
                onChange={(event) => handleFilterChange("observacoes", event.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleClearFilters}>
                Limpar filtros
              </Button>
              <Button variant="outline" onClick={() => setShowFilters(false)}>
                Concluir
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-6">
        {isLoading ? (
          <div className="rounded-md border p-6 text-center text-muted-foreground">Carregando clientes...</div>
        ) : groupedClients.every((group) => group.clients.length === 0) ? (
          <div className="rounded-md border p-6 text-center text-muted-foreground">
            Nenhum cliente encontrado com os filtros selecionados.
          </div>
        ) : (
          groupedClients.map((group) => (
            <div key={group.key} className="space-y-3">
              {groupBy !== "none" && (
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold">
                    {group.key} <span className="text-sm text-muted-foreground">({group.clients.length})</span>
                  </h3>
                </div>
              )}
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>E-mail</TableHead>
                      <TableHead>Telefone</TableHead>
                      <TableHead>Cidade</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[100px]">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {group.clients.map((client) => (
                      <TableRow key={client.id}>
                        <TableCell className="font-medium">{client.cod_int_cli}</TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{client.nome}</div>
                            {client.razao_social && client.razao_social !== client.nome && (
                              <div className="text-sm text-muted-foreground">{client.razao_social}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{client.email}</TableCell>
                        <TableCell>{client.telefone}</TableCell>
                        <TableCell>{client.cidade}</TableCell>
                        <TableCell>
                          <Badge variant={client.status === "Ativo" ? "default" : "secondary"}>
                            {client.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(client)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(client)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          ))
        )}
      </div>

      <ClientForm
        isOpen={isFormOpen}
        onClose={handleCloseForm}
        onSubmit={handleFormSubmit}
        client={editingClient}
        isLoading={isCreating || isUpdating}
      />

      <AlertDialog open={!!deletingClient} onOpenChange={() => setDeletingClient(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o cliente "{deletingClient?.nome}"?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={isDeleting}
            >
              {isDeleting ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}