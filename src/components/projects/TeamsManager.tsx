import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Team, TeamFormData } from '@/types/team';
import { Plus, Mail, Phone, Trash2, Users } from 'lucide-react';
import { useTeams } from '@/hooks/useTeams';

interface TeamsManagerProps {
  projectId: string;
}

export function TeamsManager({ projectId }: TeamsManagerProps) {
  const { teams, loading, createTeam, updateTeam, deleteTeam } = useTeams(projectId);
  const [showDialog, setShowDialog] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [formData, setFormData] = useState<Partial<TeamFormData>>({
    nome: '',
    email: '',
    cargo: '',
    departamento: '',
    telefone: '',
    ativo: true,
    project_id: projectId
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingTeam) {
      await updateTeam(editingTeam.id, formData);
    } else {
      await createTeam(formData);
    }
    
    setShowDialog(false);
    setEditingTeam(null);
    setFormData({
      nome: '',
      email: '',
      cargo: '',
      departamento: '',
      telefone: '',
      ativo: true,
      project_id: projectId
    });
  };

  const handleEdit = (team: Team) => {
    setEditingTeam(team);
    setFormData({
      nome: team.nome,
      email: team.email || '',
      cargo: team.cargo || '',
      departamento: team.departamento || '',
      telefone: team.telefone || '',
      ativo: team.ativo,
      project_id: team.project_id
    });
    setShowDialog(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Deseja realmente excluir este membro da equipe?')) {
      await deleteTeam(id);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Equipe do Projeto
        </CardTitle>
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              setEditingTeam(null);
              setFormData({
                nome: '',
                email: '',
                cargo: '',
                departamento: '',
                telefone: '',
                ativo: true,
                project_id: projectId
              });
            }}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Membro
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>
                {editingTeam ? 'Editar Membro' : 'Novo Membro da Equipe'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="nome">Nome *</Label>
                  <Input
                    id="nome"
                    value={formData.nome || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="cargo">Cargo</Label>
                  <Input
                    id="cargo"
                    value={formData.cargo || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, cargo: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="departamento">Departamento</Label>
                  <Input
                    id="departamento"
                    value={formData.departamento || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, departamento: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="telefone">Telefone</Label>
                <Input
                  id="telefone"
                  value={formData.telefone || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, telefone: e.target.value }))}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="ativo"
                  checked={formData.ativo}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, ativo: checked }))}
                />
                <Label htmlFor="ativo">Ativo</Label>
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingTeam ? 'Atualizar' : 'Criar'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      
      <CardContent>
        {loading ? (
          <div className="text-center py-8">Carregando equipe...</div>
        ) : teams.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Nenhum membro cadastrado na equipe
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Cargo</TableHead>
                <TableHead>Departamento</TableHead>
                <TableHead>Contato</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[100px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {teams.map((team) => (
                <TableRow key={team.id}>
                  <TableCell className="font-medium">{team.nome}</TableCell>
                  <TableCell>{team.cargo || '-'}</TableCell>
                  <TableCell>{team.departamento || '-'}</TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      {team.email && (
                        <div className="flex items-center gap-1 text-sm">
                          <Mail className="h-3 w-3" />
                          {team.email}
                        </div>
                      )}
                      {team.telefone && (
                        <div className="flex items-center gap-1 text-sm">
                          <Phone className="h-3 w-3" />
                          {team.telefone}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={team.ativo ? "default" : "secondary"}>
                      {team.ativo ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(team)}
                      >
                        Editar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(team.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}