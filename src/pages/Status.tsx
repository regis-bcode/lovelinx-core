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
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { GlassPanelHeader } from '@/components/common/GlassPanelHeader';

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
      <DashboardLayout>
        <div className="flex min-h-[320px] items-center justify-center text-muted-foreground">
          Carregando status...
        </div>
      </DashboardLayout>
    );
  }

  const totalStatuses = statuses.length;
  const activeStatuses = statuses.filter((status) => status.ativo).length;

  return (
    <DashboardLayout>
      <div className="space-y-8 pb-10">
        <GlassPanelHeader
          eyebrow="Gestão de Status"
          title="Gerenciar Status"
          description="Defina os estados que representam o progresso dos projetos e tarefas da organização."
          actions={(
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="lg" className="shadow-[0_18px_40px_rgba(8,47,73,0.25)]" onClick={openCreateDialog}>
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
                    <div className="mt-2 space-y-2">
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
          )}
        >
          <div className="inline-flex flex-wrap gap-3">
            <span className="inline-flex items-center rounded-full bg-primary/15 px-4 py-1 text-sm font-medium text-primary">
              {totalStatuses} status cadastrados
            </span>
            <span className="inline-flex items-center rounded-full bg-emerald-500/15 px-4 py-1 text-sm font-medium text-emerald-600">
              {activeStatuses} ativos
            </span>
          </div>
        </GlassPanelHeader>

        <div className="grid gap-4">
          {statuses.length === 0 ? (
            <Card className="border-white/40 bg-white/65 shadow-[0_25px_60px_-30px_rgba(15,23,42,0.6)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/60">
              <CardContent className="flex flex-col items-center justify-center py-10 text-center">
                <p className="mb-4 text-muted-foreground">Nenhum status cadastrado</p>
                <Button onClick={openCreateDialog}>
                  <Plus className="mr-2 h-4 w-4" />
                  Criar Primeiro Status
                </Button>
              </CardContent>
            </Card>
          ) : (
            statuses.map((status) => (
              <Card
                key={status.id}
                className="border-white/40 bg-white/65 shadow-[0_25px_60px_-30px_rgba(15,23,42,0.6)] backdrop-blur-xl transition hover:shadow-[0_30px_70px_-28px_rgba(15,23,42,0.65)] dark:border-white/10 dark:bg-slate-900/60"
              >
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <CardTitle className="flex items-center gap-2 text-xl text-slate-900 dark:text-slate-100">
                        {status.nome}
                        {!status.ativo && (
                          <Badge variant="outline">Inativo</Badge>
                        )}
                      </CardTitle>
                      <div className="mt-3 flex flex-wrap gap-2">
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
                    <div className="flex shrink-0 gap-2">
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
    </DashboardLayout>
  );
};

export default StatusPage;