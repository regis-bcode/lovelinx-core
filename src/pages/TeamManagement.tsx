import { useState, useEffect } from "react";
import { useProjectTeams } from "@/hooks/useProjectTeams";
import { useTeamMembers } from "@/hooks/useTeamMembers";
import { useTAP } from "@/hooks/useTAP";
import { useProjects } from "@/hooks/useProjects";
import { useUsers } from "@/hooks/useUsers";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Save, Users } from "lucide-react";
import { TeamType } from "@/types/project-team";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

export default function TeamManagement() {
  const { teams, createTeam, deleteTeam, loading: teamsLoading } = useProjectTeams();
  const { users } = useUsers();
  const { projects } = useProjects();
  
  const [selectedTeam, setSelectedTeam] = useState<string>("");
  const [tipoEquipe, setTipoEquipe] = useState<TeamType>("projeto");
  const [selectedTap, setSelectedTap] = useState<string>("");
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [teamName, setTeamName] = useState("");
  const [teamDescription, setTeamDescription] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const { members, addMember, removeMember, loading: membersLoading } = useTeamMembers(selectedTeam);
  
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

  const handleAddMember = async () => {
    if (!selectedTeam || !selectedUserId) return;

    await addMember({
      team_id: selectedTeam,
      user_id: selectedUserId,
    });
    setSelectedUserId("");
  };

  const handleRemoveMember = async (memberId: string) => {
    if (confirm("Deseja realmente remover este membro da equipe?")) {
      await removeMember(memberId);
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
              <div className="flex gap-4">
                <div className="flex-1">
                  <Label>Adicionar Membro</Label>
                  <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um usuário" />
                    </SelectTrigger>
                    <SelectContent>
                      {users
                        .filter(u => !members.find(m => m.user_id === u.user_id))
                        .map(user => (
                          <SelectItem key={user.user_id} value={user.user_id}>
                            {user.nome_completo}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button onClick={handleAddMember} disabled={!selectedUserId}>
                    <Plus className="mr-2 h-4 w-4" />
                    Adicionar
                  </Button>
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>E-mail</TableHead>
                    <TableHead className="text-right">Custo/Hora</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map(member => (
                    <TableRow key={member.id}>
                      <TableCell className="font-medium">{member.user?.nome_completo}</TableCell>
                      <TableCell>{member.user?.email}</TableCell>
                      <TableCell className="text-right">
                        R$ {(member.custo_hora_override ?? member.user?.custo_hora ?? 0).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveMember(member.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {members.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">
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
        </>
      )}
    </div>
  );
}
