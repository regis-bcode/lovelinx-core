import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Pencil, Trash2, Plus } from 'lucide-react';
import { useStatus } from '@/hooks/useStatus';
import { Status, StatusFormData } from '@/types/status';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

const StatusPage: React.FC = () => {
  const { statuses, loading, createStatus, updateStatus, deleteStatus } = useStatus();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingStatus, setEditingStatus] = useState<Status | null>(null);
  const [formData, setFormData] = useState<StatusFormData>({
    nome: '',
    tipo_aplicacao: [],
    ativo: true,
  });

  const tiposDisponiveis = [
    { value: 'projeto', label: 'Projeto' },
    { value: 'tarefa_suporte', label: 'Tarefa de Suporte' },
    { value: 'tarefa_projeto', label: 'Tarefa de Projeto' },
  ];

  const resetForm = () => {
    setFormData({
      nome: '',
      tipo_aplicacao: [],
      ativo: true,
    });
    setEditingStatus(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = (status: Status) => {
    setEditingStatus(status);
    setFormData({
      nome: status.nome,
      tipo_aplicacao: status.tipo_aplicacao,
      ativo: status.ativo,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nome.trim()) return;

    try {
      if (editingStatus) {
        await updateStatus(editingStatus.id, formData);
      } else {
        await createStatus(formData);
      }
      
      setDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('Erro ao salvar status:', error);
    }
  };

  const handleDelete = async (id: string) => {
    await deleteStatus(id);
  };

  const handleTipoChange = (tipo: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      tipo_aplicacao: checked 
        ? [...prev.tipo_aplicacao, tipo]
        : prev.tipo_aplicacao.filter(t => t !== tipo)
    }));
  };

  const getTipoLabel = (tipo: string) => {
    const tipoObj = tiposDisponiveis.find(t => t.value === tipo);
    return tipoObj ? tipoObj.label : tipo;
  };

  const getBadgeVariant = (tipo: string) => {
    switch (tipo) {
      case 'projeto': return 'default';
      case 'tarefa_suporte': return 'secondary';
      case 'tarefa_projeto': return 'outline';
      default: return 'default';
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">Carregando status...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Status</h1>
          <p className="text-muted-foreground">
            Gerencie os status para projetos e tarefas
          </p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Status
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingStatus ? 'Editar Status' : 'Criar Status'}
              </DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="nome">Nome do Status</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                  placeholder="Digite o nome do status"
                  required
                />
              </div>

              <div>
                <Label>Aplicável para:</Label>
                <div className="space-y-2 mt-2">
                  {tiposDisponiveis.map(tipo => (
                    <div key={tipo.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={tipo.value}
                        checked={formData.tipo_aplicacao.includes(tipo.value)}
                        onCheckedChange={(checked) => handleTipoChange(tipo.value, checked as boolean)}
                      />
                      <Label htmlFor={tipo.value}>{tipo.label}</Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="ativo"
                  checked={formData.ativo}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, ativo: checked }))}
                />
                <Label htmlFor="ativo">Status ativo</Label>
              </div>

              <div className="flex gap-2">
                <Button type="submit" className="flex-1">
                  {editingStatus ? 'Atualizar' : 'Criar'}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setDialogOpen(false)}
                  className="flex-1"
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {statuses.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-10">
              <p className="text-muted-foreground mb-4">Nenhum status cadastrado</p>
              <Button onClick={openCreateDialog}>
                <Plus className="mr-2 h-4 w-4" />
                Criar Primeiro Status
              </Button>
            </CardContent>
          </Card>
        ) : (
          statuses.map((status) => (
            <Card key={status.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {status.nome}
                      {!status.ativo && (
                        <Badge variant="outline">Inativo</Badge>
                      )}
                    </CardTitle>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {status.tipo_aplicacao.map(tipo => (
                        <Badge 
                          key={tipo} 
                          variant={getBadgeVariant(tipo)}
                          className="text-xs"
                        >
                          {getTipoLabel(tipo)}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(status)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir Status</AlertDialogTitle>
                          <AlertDialogDescription>
                            Tem certeza que deseja excluir o status "{status.nome}"? 
                            Esta ação não pode ser desfeita.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(status.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Excluir
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default StatusPage;