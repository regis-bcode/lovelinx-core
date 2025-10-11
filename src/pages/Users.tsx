import { useState } from "react";
import { Plus, Edit2, Trash2, UserCheck, UserX } from "lucide-react";
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

export default function Users() {
  const { users, isLoading, createUser, updateUser, deleteUser, toggleUserStatus, isCreating } = useUsers();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);

  const [formData, setFormData] = useState<CreateUserData>({
    cpf: "",
    nome_completo: "",
    email: "",
    telefone: "",
    tipo_usuario: "cliente",
    tipo_perfil: "visualizador",
    client_id: undefined,
    observacoes: ""
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
      observacoes: ""
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
      observacoes: user.observacoes || ""
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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
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
                <div className="grid grid-cols-2 gap-4">
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
                
                <div className="grid grid-cols-2 gap-4">
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
                </div>

                <div className="grid grid-cols-2 gap-4">
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
          <CardTitle>Usuários Cadastrados</CardTitle>
          <CardDescription>
            Lista de todos os usuários cadastrados no sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-6">Carregando usuários...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>CPF</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Tipo Usuário</TableHead>
                  <TableHead>Perfil</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
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
                      <Badge variant={user.tipo_perfil === 'administrador' ? 'default' : 'secondary'}>
                        {profileTypeLabels[user.tipo_perfil]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.ativo ? 'default' : 'destructive'}>
                        {user.ativo ? 'Ativo' : 'Inativo'}
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
                {users.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-6">
                      Nenhum usuário cadastrado
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      </div>
    </DashboardLayout>
  );
}
