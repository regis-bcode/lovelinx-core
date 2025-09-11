import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Edit, Trash2 } from "lucide-react";
import { useStakeholders } from "@/hooks/useStakeholders";
import { StakeholderFormData } from "@/types/stakeholder";
import { useToast } from "@/hooks/use-toast";

interface StakeholdersListProps {
  projectId: string;
}

export function StakeholdersList({ projectId }: StakeholdersListProps) {
  const { stakeholders, loading, createStakeholder, updateStakeholder, deleteStakeholder } = useStakeholders(projectId);
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<StakeholderFormData>({
    projectId,
    nome: '',
    cargo: '',
    departamento: '',
    nivel: 'Operacional',
    email: '',
    telefone: '',
    tipoInfluencia: 'Médio',
    interesses: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingId) {
        updateStakeholder(editingId, formData);
        toast({ title: "Stakeholder atualizado com sucesso!" });
      } else {
        createStakeholder(formData);
        toast({ title: "Stakeholder criado com sucesso!" });
      }
      
      resetForm();
      setIsDialogOpen(false);
    } catch (error) {
      toast({
        title: "Erro ao salvar stakeholder",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      projectId,
      nome: '',
      cargo: '',
      departamento: '',
      nivel: 'Operacional',
      email: '',
      telefone: '',
      tipoInfluencia: 'Médio',
      interesses: '',
    });
    setEditingId(null);
  };

  const handleEdit = (stakeholder: any) => {
    setFormData(stakeholder);
    setEditingId(stakeholder.id);
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este stakeholder?')) {
      deleteStakeholder(id);
      toast({ title: "Stakeholder excluído com sucesso!" });
    }
  };

  if (loading) {
    return <div>Carregando...</div>;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Mapa de Stakeholders</CardTitle>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Stakeholder
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingId ? 'Editar Stakeholder' : 'Novo Stakeholder'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="nome">Nome</Label>
                  <Input
                    id="nome"
                    value={formData.nome}
                    onChange={(e) => setFormData({...formData, nome: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="cargo">Cargo</Label>
                  <Input
                    id="cargo"
                    value={formData.cargo}
                    onChange={(e) => setFormData({...formData, cargo: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="departamento">Departamento</Label>
                  <Input
                    id="departamento"
                    value={formData.departamento}
                    onChange={(e) => setFormData({...formData, departamento: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="nivel">Nível</Label>
                  <Select value={formData.nivel} onValueChange={(value: any) => setFormData({...formData, nivel: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Executivo">Executivo</SelectItem>
                      <SelectItem value="Gerencial">Gerencial</SelectItem>
                      <SelectItem value="Operacional">Operacional</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="telefone">Telefone</Label>
                  <Input
                    id="telefone"
                    value={formData.telefone}
                    onChange={(e) => setFormData({...formData, telefone: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="tipoInfluencia">Tipo de Influência</Label>
                  <Select value={formData.tipoInfluencia} onValueChange={(value: any) => setFormData({...formData, tipoInfluencia: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Alto">Alto</SelectItem>
                      <SelectItem value="Médio">Médio</SelectItem>
                      <SelectItem value="Baixo">Baixo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="interesses">Interesses</Label>
                <Textarea
                  id="interesses"
                  value={formData.interesses}
                  onChange={(e) => setFormData({...formData, interesses: e.target.value})}
                  rows={3}
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingId ? 'Atualizar' : 'Criar'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Cargo</TableHead>
              <TableHead>Departamento</TableHead>
              <TableHead>Nível</TableHead>
              <TableHead>Influência</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {stakeholders.map((stakeholder) => (
              <TableRow key={stakeholder.id}>
                <TableCell>{stakeholder.nome}</TableCell>
                <TableCell>{stakeholder.cargo}</TableCell>
                <TableCell>{stakeholder.departamento}</TableCell>
                <TableCell>{stakeholder.nivel}</TableCell>
                <TableCell>{stakeholder.tipoInfluencia}</TableCell>
                <TableCell>
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(stakeholder)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDelete(stakeholder.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {stakeholders.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            Nenhum stakeholder cadastrado
          </div>
        )}
      </CardContent>
    </Card>
  );
}