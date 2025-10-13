import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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

  type StatusCategory =
    | 'projeto'
    | 'suporte'
    | 'avulso'
    | 'tarefa_suporte'
    | 'tarefa_projeto'
    | 'tarefa_avulso';

  const tiposDisponiveis: { value: StatusCategory; label: string }[] = [
    { value: 'projeto', label: 'Projeto' },
    { value: 'suporte', label: 'Suporte' },
    { value: 'avulso', label: 'Avulso' },
    { value: 'tarefa_suporte', label: 'Tarefa de Suporte' },
    { value: 'tarefa_projeto', label: 'Tarefa de Projeto' },
    { value: 'tarefa_avulso', label: 'Tarefa de Avulso' },
  ];

  const kanbanColumns: { key: StatusCategory; title: string; description: string }[] = [
    {
      key: 'projeto',
      title: 'Projeto',
      description: 'Status aplicáveis a projetos em andamento.',
    },
    {
      key: 'suporte',
      title: 'Suporte',
      description: 'Status utilizados no atendimento de suporte.',
    },
    {
      key: 'avulso',
      title: 'Avulso',
      description: 'Status para demandas avulsas.',
    },
    {
      key: 'tarefa_suporte',
      title: 'Tarefa de Suporte',
      description: 'Status para tarefas individuais de suporte.',
    },
    {
      key: 'tarefa_projeto',
      title: 'Tarefa de Projeto',
      description: 'Status aplicáveis às tarefas vinculadas a projetos.',
    },
    {
      key: 'tarefa_avulso',
      title: 'Tarefa de Avulso',
      description: 'Status de tarefas avulsas.',
    },
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

  const handleTipoChange = (tipo: StatusCategory, checked: boolean) => {
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
      case 'suporte': return 'secondary';
      case 'avulso': return 'destructive';
      case 'tarefa_suporte': return 'secondary';
      case 'tarefa_projeto': return 'outline';
      case 'tarefa_avulso': return 'default';
      default: return 'default';
    }
  };

  const statusesByCategory = useMemo(() => {
    const grouped: Record<StatusCategory, Status[]> = {
      projeto: [],
      suporte: [],
      avulso: [],
      tarefa_suporte: [],
      tarefa_projeto: [],
      tarefa_avulso: [],
    };

    statuses.forEach((status) => {
      status.tipo_aplicacao.forEach((tipo) => {
        const category = tipo as StatusCategory;
        if (grouped[category]) {
          grouped[category].push(status);
        }
      });
    });

    return grouped;
  }, [statuses]);

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

        <div className="space-y-6">
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
            <div className="overflow-x-auto pb-4">
              <div className="grid min-w-full gap-6 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
                {kanbanColumns.map((column) => {
                  const columnStatuses = statusesByCategory[column.key];

                  return (
                    <Card
                      key={column.key}
                      className="border-white/40 bg-white/65 shadow-[0_25px_60px_-30px_rgba(15,23,42,0.6)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/60"
                    >
                      <CardHeader className="pb-4">
                        <CardTitle className="flex items-center justify-between gap-2 text-lg text-slate-900 dark:text-slate-100">
                          {column.title}
                          <span className="rounded-full bg-primary/15 px-3 py-0.5 text-xs font-medium text-primary">
                            {columnStatuses.length}
                          </span>
                        </CardTitle>
                        <CardDescription className="text-xs text-muted-foreground">
                          {column.description}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {columnStatuses.length === 0 ? (
                          <div className="rounded-lg border border-dashed border-slate-200/70 bg-white/40 p-6 text-center text-xs text-muted-foreground dark:border-slate-700/60 dark:bg-slate-900/30">
                            Nenhum status atribuído.
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {columnStatuses.map((status) => (
                              <div
                                key={`${column.key}-${status.id}`}
                                className="rounded-xl border border-white/40 bg-white/70 p-4 shadow-sm transition hover:border-primary/40 hover:shadow-md dark:border-slate-700/60 dark:bg-slate-900/60"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                        {status.nome}
                                      </span>
                                      {!status.ativo && (
                                        <Badge variant="outline">Inativo</Badge>
                                      )}
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                      {status.tipo_aplicacao.map(tipo => (
                                        <Badge
                                          key={`${status.id}-${tipo}`}
                                          variant={getBadgeVariant(tipo)}
                                          className="text-[10px]"
                                        >
                                          {getTipoLabel(tipo)}
                                        </Badge>
                                      ))}
                                    </div>
                                  </div>
                                  <div className="flex shrink-0 flex-col gap-2">
                                    <Button
                                      variant="outline"
                                      size="icon"
                                      className="h-8 w-8"
                                      onClick={() => openEditDialog(status)}
                                    >
                                      <Pencil className="h-3.5 w-3.5" />
                                    </Button>
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <Button variant="outline" size="icon" className="h-8 w-8">
                                          <Trash2 className="h-3.5 w-3.5" />
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
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default StatusPage;