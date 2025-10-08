import { useState, useEffect } from "react";
import { useProjectTeams } from "@/hooks/useProjectTeams";
import { useTeamMembers } from "@/hooks/useTeamMembers";
import { useTAP } from "@/hooks/useTAP";
import { useProjects } from "@/hooks/useProjects";
import { useUsers } from "@/hooks/useUsers";
import { useUserRoles } from "@/hooks/useUserRoles";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Users, Pencil } from "lucide-react";
import { TeamType, MemberRoleType } from "@/types/project-team";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { MultiSelect, Option } from "@/components/ui/multi-select";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
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

function TeamManagementContent() {
  const { teams, createTeam, deleteTeam, loading: teamsLoading } = useProjectTeams();
  const { users } = useUsers();
  const { projects } = useProjects();
  const { toast } = useToast();
  const { userRoles } = useUserRoles();
  
  const [selectedTeam, setSelectedTeam] = useState<string>("");
  const [tipoEquipe, setTipoEquipe] = useState<TeamType>("projeto");
  const [selectedTap, setSelectedTap] = useState<string>("");
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [teamName, setTeamName] = useState("");
  const [teamDescription, setTeamDescription] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [selectedRoleType, setSelectedRoleType] = useState<MemberRoleType>("interno");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [editingMember, setEditingMember] = useState<{ id: string; custo_hora_override?: number; role_type: MemberRoleType } | null>(null);
  const [showEditMemberDialog, setShowEditMemberDialog] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState<string | null>(null);

  const { members, addMember, removeMember, updateMember, loading: membersLoading } = useTeamMembers(selectedTeam);

  // Verificar se o usuário é admin ou gestor
  const isAdminOrGestor = userRoles.includes('admin') || userRoles.includes('gestor');
  
  // Todos os projetos por enquanto (filtro por tipo pode ser implementado futuramente)
  const filteredProjects = projects;

  // Filtra TAPs baseado no projeto selecionado
  const availableTaps = selectedProject ? [] : []; // TODO: Implementar filtro de TAPs por projeto

  const calculateTotalCost = () => {
    return members.reduce((total, member) => {
      const custoHora = member.custo_hora_override ?? member.user?.custo_hora ?? 0;
      return total + custoHora;
    }, 0);
  };

  const handleCreateTeam = async () => {
    if (!teamName) {
      return;
    }

    const result = await createTeam({
      tipo_equipe: tipoEquipe,
      tap_id: selectedTap || undefined,
      project_id: selectedProject || undefined,
      nome: teamName,
      descricao: teamDescription,
    });

    if (result) {
      setSelectedTeam(result.id);
      setShowCreateDialog(false);
      setTeamName("");
      setTeamDescription("");
    }
  };

  const handleAddMembers = async () => {
    if (!selectedTeam || selectedUserIds.length === 0) {
      toast({
        title: "Erro",
        description: "Selecione pelo menos um usuário",
        variant: "destructive",
      });
      return;
    }

    try {
      // Adicionar todos os membros selecionados
      for (const userId of selectedUserIds) {
        await addMember({
          team_id: selectedTeam,
          user_id: userId,
          role_type: selectedRoleType,
        });
      }

      setSelectedUserIds([]);
      setSelectedRoleType("interno");
      setShowSuccessDialog(true);
      
      toast({
        title: "Sucesso",
        description: `${selectedUserIds.length} membro(s) adicionado(s) com sucesso!`,
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao adicionar membros",
        variant: "destructive",
      });
    }
  };

  const handleEditMember = async () => {
    if (!editingMember) return;

    await updateMember(editingMember.id, {
      custo_hora_override: editingMember.custo_hora_override,
      role_type: editingMember.role_type,
    });
    setEditingMember(null);
    setShowEditMemberDialog(false);
  };

  const openEditMemberDialog = (member: any) => {
    setEditingMember({
      id: member.id,
      custo_hora_override: member.custo_hora_override,
      role_type: member.role_type,
    });
    setShowEditMemberDialog(true);
  };

  const confirmRemoveMember = async () => {
    if (!memberToDelete) return;

    try {
      await removeMember(memberToDelete);
      toast({
        title: "Sucesso",
        description: "Membro removido com sucesso!",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao remover membro",
        variant: "destructive",
      });
    } finally {
      setMemberToDelete(null);
    }
  };

  const handleDeleteTeam = async () => {
    if (!selectedTeam) return;
    
    if (confirm("Deseja realmente excluir esta equipe?")) {
      const success = await deleteTeam(selectedTeam);
      if (success) {
        setSelectedTeam("");
      }
    }
  };

  const currentTeam = teams.find(t => t.id === selectedTeam);
  const selectedProjectData = projects.find(p => p.id === selectedProject);

  // Preparar opções para o multi-select
  const userOptions: Option[] = users
    .filter(u => !members.find(m => m.user_id === u.user_id))
    .map(user => ({
      value: user.user_id,
      label: user.nome_completo,
    }));

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gestão de Equipes</h1>
          <p className="text-muted-foreground">Gerencie equipes, membros e custos dos projetos</p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nova Equipe
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Nova Equipe</DialogTitle>
              <DialogDescription>
                Preencha os dados para criar uma nova equipe de projeto ou suporte
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Tipo de Equipe</Label>
                <Select value={tipoEquipe} onValueChange={(v) => setTipoEquipe(v as TeamType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="projeto">Projeto</SelectItem>
                    <SelectItem value="suporte">Suporte</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Projeto</Label>
                <Select value={selectedProject} onValueChange={setSelectedProject}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um projeto" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredProjects.map(project => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.nome_projeto}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Nome da Equipe</Label>
                <Input
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="Ex: Equipe Desenvolvimento SPDM"
                />
              </div>

              <div>
                <Label>Descrição</Label>
                <Textarea
                  value={teamDescription}
                  onChange={(e) => setTeamDescription(e.target.value)}
                  placeholder="Descreva o propósito da equipe..."
                />
              </div>

              <Button onClick={handleCreateTeam} className="w-full">
                Criar Equipe
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Selecionar Equipe</CardTitle>
          <CardDescription>Escolha uma equipe para gerenciar seus membros</CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selectedTeam} onValueChange={setSelectedTeam}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione uma equipe" />
            </SelectTrigger>
            <SelectContent>
              {teams.map(team => (
                <SelectItem key={team.id} value={team.id}>
                  {team.nome} ({team.tipo_equipe})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedTeam && currentTeam && (
        <>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Membros da Equipe
                  </CardTitle>
                  <CardDescription>{currentTeam.nome}</CardDescription>
                </div>
                <Button variant="destructive" onClick={handleDeleteTeam}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Excluir Equipe
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div>
                  <Label>Selecionar Membros</Label>
                  <MultiSelect
                    options={userOptions}
                    selected={selectedUserIds}
                    onChange={setSelectedUserIds}
                    placeholder="Selecione um ou mais usuários..."
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {selectedUserIds.length > 0 
                      ? `${selectedUserIds.length} usuário(s) selecionado(s)`
                      : "Nenhum usuário selecionado"}
                  </p>
                </div>
                <div>
                  <Label>Tipo de Função</Label>
                  <Select value={selectedRoleType} onValueChange={(v) => setSelectedRoleType(v as MemberRoleType)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="interno">Interno</SelectItem>
                      <SelectItem value="cliente">Cliente</SelectItem>
                      <SelectItem value="parceiro">Parceiro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button 
                  onClick={handleAddMembers} 
                  disabled={selectedUserIds.length === 0}
                  className="w-full"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Adicionar {selectedUserIds.length > 0 ? `${selectedUserIds.length} Membro(s)` : "Membros"}
                </Button>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>E-mail</TableHead>
                    <TableHead>Tipo de Função</TableHead>
                    <TableHead>Data de Inclusão</TableHead>
                    <TableHead className="text-right">Custo/Hora</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map(member => (
                    <TableRow key={member.id}>
                      <TableCell className="font-medium">{member.user?.nome_completo}</TableCell>
                      <TableCell>{member.user?.email}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {member.role_type === 'interno' && 'Interno'}
                          {member.role_type === 'cliente' && 'Cliente'}
                          {member.role_type === 'parceiro' && 'Parceiro'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {format(new Date(member.created_at), "dd/MM/yyyy", { locale: ptBR })}
                      </TableCell>
                      <TableCell className="text-right">
                        R$ {(member.custo_hora_override ?? member.user?.custo_hora ?? 0).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditMemberDialog(member)}
                            title="Editar função"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          {isAdminOrGestor && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setMemberToDelete(member.id)}
                              title="Remover membro"
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {members.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        Nenhum membro na equipe
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Resumo da Equipe</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Tipo</p>
                  <p className="font-medium">{currentTeam.tipo_equipe === 'projeto' ? 'Projeto' : 'Suporte'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Projeto</p>
                  <p className="font-medium">{selectedProjectData?.nome_projeto || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Membros</p>
                  <p className="font-medium">{members.length}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Custo Total/Hora</p>
                  <p className="font-medium text-lg">R$ {calculateTotalCost().toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Success Dialog */}
          <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Membros Adicionados com Sucesso!</DialogTitle>
                <DialogDescription>
                  Os membros foram adicionados à equipe
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Equipe: <span className="font-medium text-foreground">{currentTeam.nome}</span>
                </p>
                <div>
                  <p className="text-sm font-medium mb-2">Membros da Equipe:</p>
                  <div className="space-y-2">
                    {members.map(member => (
                      <div key={member.id} className="flex items-center justify-between p-2 border rounded">
                        <div>
                          <p className="font-medium">{member.user?.nome_completo}</p>
                          <p className="text-sm text-muted-foreground">{member.user?.email}</p>
                        </div>
                        <Badge variant="outline">
                          {member.role_type === 'interno' && 'Interno'}
                          {member.role_type === 'cliente' && 'Cliente'}
                          {member.role_type === 'parceiro' && 'Parceiro'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
                <Button onClick={() => setShowSuccessDialog(false)} className="w-full">
                  Fechar
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Edit Member Dialog */}
          <Dialog open={showEditMemberDialog} onOpenChange={setShowEditMemberDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Editar Membro</DialogTitle>
                <DialogDescription>
                  Atualize o tipo de função ou o custo por hora do membro
                </DialogDescription>
              </DialogHeader>
              {editingMember && (
                <div className="space-y-4">
                  <div>
                    <Label>Tipo de Função</Label>
                    <Select 
                      value={editingMember.role_type} 
                      onValueChange={(v) => setEditingMember({...editingMember, role_type: v as MemberRoleType})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="interno">Interno</SelectItem>
                        <SelectItem value="cliente">Cliente</SelectItem>
                        <SelectItem value="parceiro">Parceiro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Custo/Hora Override (opcional)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={editingMember.custo_hora_override || ""}
                      onChange={(e) => setEditingMember({
                        ...editingMember, 
                        custo_hora_override: e.target.value ? parseFloat(e.target.value) : undefined
                      })}
                      placeholder="Deixe vazio para usar o custo padrão"
                    />
                  </div>
                  <Button onClick={handleEditMember} className="w-full">
                    Salvar Alterações
                  </Button>
                </div>
              )}
            </DialogContent>
          </Dialog>

          {/* Alert Dialog for Delete Confirmation */}
          <AlertDialog open={!!memberToDelete} onOpenChange={(open) => !open && setMemberToDelete(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                <AlertDialogDescription>
                  Deseja realmente remover este membro da equipe? Esta ação não pode ser desfeita.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={confirmRemoveMember} className="bg-destructive hover:bg-destructive/90">
                  Remover
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
    </div>
  );
}

export default function TeamManagement() {
  return (
    <DashboardLayout>
      <TeamManagementContent />
    </DashboardLayout>
  );
}
