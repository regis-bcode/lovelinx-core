import { useMemo, useState } from "react";
import { Plus, Edit2, Trash2, UserCheck, UserX, Layers, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useUsers, CreateUserData, UserType, ProfileType } from "@/hooks/useUsers";
import { useToast } from "@/hooks/use-toast";
import { ClientSelectWithCreate } from "@/components/users/ClientSelectWithCreate";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

const userTypeLabels: Record<UserType, string> = {
  cliente: "Cliente",
  analista: "Analista",
  gerente_projetos: "Gerente de Projetos",
  gerente_portfolio: "Gerente de Portfólio", 
  coordenador_consultoria: "Coordenador do Projeto (Consultoria)",
  gerente_cliente: "Gerente do Projeto (Cliente)",
  arquiteto: "Arquiteto",
  sponsor: "Sponsor",
  vendedor: "Vendedor"
};

const profileTypeLabels: Record<ProfileType, string> = {
  visualizador: "Visualizador",
  editor: "Editor", 
  administrador: "Administrador"
};

const groupOptions = [
  { value: "none", label: "Sem agrupamento" },
  { value: "tipo_usuario", label: "Tipo de usuário" },
  { value: "tipo_perfil", label: "Tipo de perfil" },
  { value: "status", label: "Status" },
  { value: "cliente", label: "Cliente" }
];

export default function Users() {
  const { users, isLoading, createUser, updateUser, deleteUser, toggleUserStatus, isCreating } = useUsers();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [userTypeFilter, setUserTypeFilter] = useState<string>("all");
  const [profileFilter, setProfileFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [clientFilter, setClientFilter] = useState<string>("all");
  const [groupBy, setGroupBy] = useState<string>("none");

  const [formData, setFormData] = useState<CreateUserData>({
    cpf: "",
    nome_completo: "",
    email: "",
    telefone: "",
    tipo_usuario: "cliente",
    tipo_perfil: "visualizador",
    client_id: undefined,
    observacoes: "",
    horas_diarias_aprovadas: undefined,
    horas_liberadas_por_dia: undefined
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validação básica
    if (!formData.cpf || !formData.nome_completo || !formData.email || !formData.telefone) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha todos os campos obrigatórios.",
        variant: "destructive"
      });
      return;
    }

    // Validação do CPF (11 dígitos)
    const cpfNumbers = formData.cpf.replace(/\D/g, '');
    if (cpfNumbers.length !== 11) {
      toast({
        title: "CPF inválido",
        description: "O CPF deve conter 11 dígitos.",
        variant: "destructive"
      });
      return;
    }

    if (
      formData.horas_diarias_aprovadas !== undefined &&
      (formData.horas_diarias_aprovadas < 0 || formData.horas_diarias_aprovadas > 24)
    ) {
      toast({
        title: "Valor inválido",
        description: "Informe um valor de horas entre 0 e 24.",
        variant: "destructive"
      });
      return;
    }

    if (
      formData.horas_liberadas_por_dia !== undefined &&
      (formData.horas_liberadas_por_dia < 0 || formData.horas_liberadas_por_dia > 24)
    ) {
      toast({
        title: "Valor inválido",
        description: "Informe um valor de horas liberadas entre 0 e 24.",
        variant: "destructive"
      });
      return;
    }

    if (editingUser) {
      updateUser({ id: editingUser.id, updates: formData });
    } else {
      createUser(formData);
    }
    
    setIsDialogOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      cpf: "",
      nome_completo: "",
      email: "",
      telefone: "",
      tipo_usuario: "cliente",
      tipo_perfil: "visualizador",
      client_id: undefined,
      observacoes: "",
      horas_diarias_aprovadas: undefined,
      horas_liberadas_por_dia: undefined
    });
    setEditingUser(null);
  };

  const handleEdit = (user: any) => {
    setEditingUser(user);
    setFormData({
      cpf: user.cpf,
      nome_completo: user.nome_completo,
      email: user.email,
      telefone: user.telefone,
      tipo_usuario: user.tipo_usuario,
      tipo_perfil: user.tipo_perfil,
      client_id: user.client_id,
      observacoes: user.observacoes || "",
      horas_diarias_aprovadas:
        user.horas_diarias_aprovadas != null && !Number.isNaN(Number(user.horas_diarias_aprovadas))
          ? Number(user.horas_diarias_aprovadas)
          : undefined,
      horas_liberadas_por_dia:
        user.horas_liberadas_por_dia != null && !Number.isNaN(Number(user.horas_liberadas_por_dia))
          ? Number(user.horas_liberadas_por_dia)
          : undefined
    });
    setIsDialogOpen(true);
  };

  const formatCPF = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  };

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    return numbers.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  };

  const clientOptions = useMemo(() => {
    const map = new Map<string, string>();
    users.forEach((user) => {
      if (user.client) {
        const label = `${user.client.cod_int_cli} - ${user.client.nome}`;
        map.set(user.client.id, label);
      }
    });
    return Array.from(map.entries()).map(([value, label]) => ({ value, label }));
  }, [users]);

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const normalizedSearch = searchTerm.trim().toLowerCase();
      const matchesSearch =
        normalizedSearch.length === 0 ||
        user.nome_completo.toLowerCase().includes(normalizedSearch) ||
        user.email.toLowerCase().includes(normalizedSearch) ||
        user.cpf.replace(/\D/g, "").includes(normalizedSearch.replace(/\D/g, "")) ||
        user.telefone.replace(/\D/g, "").includes(normalizedSearch.replace(/\D/g, "")) ||
        (user.client?.nome?.toLowerCase().includes(normalizedSearch) ?? false) ||
        (user.client?.cod_int_cli?.toLowerCase().includes(normalizedSearch) ?? false);

      const matchesType = userTypeFilter === "all" || user.tipo_usuario === userTypeFilter;
      const matchesProfile = profileFilter === "all" || user.tipo_perfil === profileFilter;
      const matchesStatus = statusFilter === "all" || (statusFilter === "ativo" ? user.ativo : !user.ativo);
      const matchesClient =
        clientFilter === "all" ||
        (clientFilter === "sem-cliente" ? !user.client_id : user.client_id === clientFilter);

      return matchesSearch && matchesType && matchesProfile && matchesStatus && matchesClient;
    });
  }, [users, searchTerm, userTypeFilter, profileFilter, statusFilter, clientFilter]);

  const groupedUsers = useMemo(() => {
    if (groupBy === "none") {
      return [{ key: "Todos os usuários", users: filteredUsers }];
    }

    const groups = new Map<string, typeof filteredUsers>();

    filteredUsers.forEach((user) => {
      let groupKey = "";
      switch (groupBy) {
        case "tipo_usuario":
          groupKey = userTypeLabels[user.tipo_usuario];
          break;
        case "tipo_perfil":
          groupKey = profileTypeLabels[user.tipo_perfil];
          break;
        case "status":
          groupKey = user.ativo ? "Ativo" : "Inativo";
          break;
        case "cliente":
          groupKey = user.client?.nome || "Sem cliente";
          break;
        default:
          groupKey = "Outros";
      }

      if (!groups.has(groupKey)) {
        groups.set(groupKey, []);
      }
      groups.get(groupKey)!.push(user);
    });

    return Array.from(groups.entries()).map(([key, users]) => ({ key, users }));
  }, [filteredUsers, groupBy]);

  const handleClearFilters = () => {
    setSearchTerm("");
    setUserTypeFilter("all");
    setProfileFilter("all");
    setStatusFilter("all");
    setClientFilter("all");
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Cadastro de Usuários</h1>
            <p className="text-muted-foreground">Gerencie os usuários do sistema</p>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => resetForm()}>
                <Plus className="w-4 h-4 mr-2" />
                Novo Usuário
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editingUser ? "Editar Usuário" : "Novo Usuário"}</DialogTitle>
                <DialogDescription>
                  {editingUser ? "Atualize os dados do usuário" : "Preencha os dados do novo usuário"}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="nome_completo">Nome Completo *</Label>
                    <Input
                      id="nome_completo"
                      value={formData.nome_completo}
                      onChange={(e) => setFormData({ ...formData, nome_completo: e.target.value })}
                      placeholder="Nome completo do usuário"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cpf">CPF *</Label>
                    <Input
                      id="cpf"
                      value={formData.cpf}
                      onChange={(e) => {
                        const formatted = formatCPF(e.target.value);
                        if (formatted.length <= 14) {
                          setFormData({ ...formData, cpf: formatted });
                        }
                      }}
                      placeholder="000.000.000-00"
                      required
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="email">E-mail *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="usuario@email.com"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="telefone">Telefone Contato (Cel) *</Label>
                    <Input
                      id="telefone"
                      value={formData.telefone}
                      onChange={(e) => {
                        const formatted = formatPhone(e.target.value);
                        if (formatted.length <= 15) {
                          setFormData({ ...formData, telefone: formatted });
                        }
                      }}
                      placeholder="(00) 00000-0000"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="horas_diarias_aprovadas">Horas diárias aprovadas</Label>
                    <Input
                      id="horas_diarias_aprovadas"
                      type="number"
                      min={0}
                      max={24}
                      step={0.5}
                      value={formData.horas_diarias_aprovadas ?? ""}
                      onChange={(e) => {
                        const value = e.target.value;
                        setFormData({
                          ...formData,
                          horas_diarias_aprovadas: value === "" ? undefined : Number(value)
                        });
                      }}
                      placeholder="Ex: 8"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="horas_liberadas_por_dia">Horas liberadas por dia</Label>
                    <Input
                      id="horas_liberadas_por_dia"
                      type="number"
                      min={0}
                      max={24}
                      step={0.5}
                      value={formData.horas_liberadas_por_dia ?? ""}
                      onChange={(e) => {
                        const value = e.target.value;
                        setFormData({
                          ...formData,
                          horas_liberadas_por_dia: value === "" ? undefined : Number(value)
                        });
                      }}
                      placeholder="Ex: 4"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="tipo_usuario">Tipo de Usuário</Label>
                    <Select
                      value={formData.tipo_usuario}
                      onValueChange={(value) => setFormData({ ...formData, tipo_usuario: value as UserType })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(userTypeLabels).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tipo_perfil">Tipo de Perfil</Label>
                    <Select
                      value={formData.tipo_perfil}
                      onValueChange={(value) => setFormData({ ...formData, tipo_perfil: value as ProfileType })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(profileTypeLabels).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Cliente</Label>
                  <ClientSelectWithCreate
                    value={formData.client_id}
                    onChange={(value) => setFormData({ ...formData, client_id: value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="observacoes">Observações</Label>
                  <Textarea
                    id="observacoes"
                    value={formData.observacoes}
                    onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                    placeholder="Observações adicionais sobre o usuário"
                    rows={3}
                  />
                </div>

                <div className="flex justify-end gap-3">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={isCreating}>
                    {editingUser ? "Atualizar" : "Criar"} Usuário
                  </Button>
                </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle>Usuários Cadastrados</CardTitle>
              <CardDescription>
                Lista de todos os usuários cadastrados no sistema
              </CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
              <div className="relative flex-1">
                <Input
                  placeholder="Buscar por nome, e-mail, documento ou telefone"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  className="pl-9"
                />
                <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              </div>
              <div className="flex gap-2">
                <Select value={groupBy} onValueChange={setGroupBy}>
                  <SelectTrigger className="min-w-[180px]">
                    <SelectValue placeholder="Agrupar por" />
                  </SelectTrigger>
                  <SelectContent>
                    {groupOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" onClick={handleClearFilters}>
                  Limpar
                </Button>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 pt-4">
            <Select value={userTypeFilter} onValueChange={setUserTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Tipo de usuário" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                {Object.entries(userTypeLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={profileFilter} onValueChange={setProfileFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Tipo de perfil" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os perfis</SelectItem>
                {Object.entries(profileTypeLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="ativo">Ativos</SelectItem>
                <SelectItem value="inativo">Inativos</SelectItem>
              </SelectContent>
            </Select>
            <Select value={clientFilter} onValueChange={setClientFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Cliente" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os clientes</SelectItem>
                <SelectItem value="sem-cliente">Sem cliente</SelectItem>
                {clientOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-6">Carregando usuários...</div>
          ) : groupedUsers.every((group) => group.users.length === 0) ? (
            <div className="text-center py-6 text-muted-foreground">
              Nenhum usuário encontrado com os filtros selecionados
            </div>
          ) : (
            <div className="space-y-6">
              {groupedUsers.map((group) => (
                <div key={group.key} className="space-y-3">
                  {groupBy !== "none" && (
                    <div className="flex items-center gap-2">
                      <Layers className="h-4 w-4 text-muted-foreground" />
                      <h3 className="text-lg font-semibold">
                        {group.key} <span className="text-sm text-muted-foreground">({group.users.length})</span>
                      </h3>
                    </div>
                  )}
                  <div className="overflow-x-auto rounded-md border">
                    <Table className="min-w-[820px] w-full">
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nome</TableHead>
                          <TableHead>CPF</TableHead>
                          <TableHead>E-mail</TableHead>
                          <TableHead>Telefone</TableHead>
                          <TableHead>Cliente</TableHead>
                          <TableHead>Tipo Usuário</TableHead>
                          <TableHead>Perfil</TableHead>
                          <TableHead>Horas aprov./dia</TableHead>
                          <TableHead>Horas liberadas/dia</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {group.users.map((user) => (
                          <TableRow key={user.id}>
                            <TableCell className="font-medium">{user.nome_completo}</TableCell>
                            <TableCell>{user.cpf}</TableCell>
                            <TableCell>{user.email}</TableCell>
                            <TableCell>{user.telefone}</TableCell>
                            <TableCell>
                              {user.client ? (
                                <div>
                                  <div className="font-medium">{user.client.cod_int_cli}</div>
                                  <div className="text-sm text-muted-foreground">{user.client.nome}</div>
                                </div>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell>{userTypeLabels[user.tipo_usuario]}</TableCell>
                            <TableCell>
                              <Badge variant={user.tipo_perfil === "administrador" ? "default" : "secondary"}>
                                {profileTypeLabels[user.tipo_perfil]}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {user.horas_diarias_aprovadas != null && !Number.isNaN(Number(user.horas_diarias_aprovadas)) ? (
                                `${Number(user.horas_diarias_aprovadas).toLocaleString("pt-BR", {
                                  minimumFractionDigits: 0,
                                  maximumFractionDigits: 2
                                })}h`
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {user.horas_liberadas_por_dia != null && !Number.isNaN(Number(user.horas_liberadas_por_dia)) ? (
                                `${Number(user.horas_liberadas_por_dia).toLocaleString("pt-BR", {
                                  minimumFractionDigits: 0,
                                  maximumFractionDigits: 2
                                })}h`
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge variant={user.ativo ? "default" : "destructive"}>
                                {user.ativo ? "Ativo" : "Inativo"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleEdit(user)}
                                >
                                  <Edit2 className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => toggleUserStatus({ id: user.id, ativo: !user.ativo })}
                                >
                                  {user.ativo ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="outline" size="sm">
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Tem certeza que deseja excluir o usuário "{user.nome_completo}"?
                                        Esta ação não pode ser desfeita.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => deleteUser(user.id)}>
                                        Excluir
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      </div>
    </DashboardLayout>
  );
}
