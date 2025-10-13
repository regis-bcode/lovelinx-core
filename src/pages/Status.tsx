import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Pencil, Trash2, Plus, Loader2, Palette } from 'lucide-react';
import { useStatus } from '@/hooks/useStatus';
import { Status, StatusFormData } from '@/types/status';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { GlassPanelHeader } from '@/components/common/GlassPanelHeader';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { STATUS_COLOR_PALETTE, DEFAULT_STATUS_COLOR_BY_NAME, getStatusColorValue, hexToRgba } from '@/lib/status-colors';
import { cn } from '@/lib/utils';

const StatusPage: React.FC = () => {
  const { statuses, loading, createStatus, updateStatus, deleteStatus } = useStatus();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingStatus, setEditingStatus] = useState<Status | null>(null);
  const [formData, setFormData] = useState<StatusFormData>({
    nome: '',
    tipo_aplicacao: [],
    ativo: true,
    cor: STATUS_COLOR_PALETTE[0].value,
  });
  const [deletingId, setDeletingId] = useState<string | null>(null);

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

  const matrixCategories = [
    { key: 'suporte', label: 'Suporte', matchers: ['suporte', 'tarefa_suporte'] as StatusCategory[] },
    { key: 'projeto', label: 'Projeto', matchers: ['projeto', 'tarefa_projeto'] as StatusCategory[] },
    { key: 'avulso', label: 'Avulso', matchers: ['avulso', 'tarefa_avulso'] as StatusCategory[] },
  ];

  const resetForm = () => {
    setFormData({
      nome: '',
      tipo_aplicacao: [],
      ativo: true,
      cor: STATUS_COLOR_PALETTE[0].value,
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
      cor: getStatusColorValue(status),
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
    setDeletingId(id);
    try {
      await deleteStatus(id);
    } finally {
      setDeletingId(null);
    }
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

  const sortedStatuses = useMemo(
    () => [...statuses].sort((a, b) => a.nome.localeCompare(b.nome)),
    [statuses],
  );

  const statusMatchesCategory = (status: Status, matchers: StatusCategory[]) =>
    status.tipo_aplicacao.some((tipo) => matchers.includes(tipo as StatusCategory));

  const getRemainingAplicacoes = (status: Status) =>
    status.tipo_aplicacao.filter(
      (tipo) => !matrixCategories.some((category) => category.matchers.includes(tipo as StatusCategory)),
    );

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
  const inactiveStatuses = Math.max(totalStatuses - activeStatuses, 0);
  const customStatuses = statuses.filter((status) => !DEFAULT_STATUS_COLOR_BY_NAME[status.nome]).length;

  const highlightStats = useMemo(
    () => [
      {
        key: 'total',
        label: 'Status cadastrados',
        value: totalStatuses,
        description: 'Mapeie cada etapa dos seus fluxos.',
        accent: '#38bdf8',
      },
      {
        key: 'active',
        label: 'Ativos',
        value: activeStatuses,
        description:
          inactiveStatuses > 0
            ? `${inactiveStatuses} aguardando revisão.`
            : 'Todos disponíveis para uso imediato.',
        accent: '#34d399',
      },
      {
        key: 'custom',
        label: 'Personalizados',
        value: customStatuses,
        description:
          customStatuses > 0
            ? 'Status criados sob medida para a operação.'
            : 'Comece criando um status exclusivo.',
        accent: '#a855f7',
      },
    ],
    [activeStatuses, customStatuses, inactiveStatuses, totalStatuses],
  );

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

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Cor do Status</Label>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>Pré-visualização</span>
                        <span
                          className="h-4 w-4 rounded-full border border-white/60 shadow-sm dark:border-slate-700/70"
                          style={{ backgroundColor: formData.cor }}
                          aria-hidden="true"
                        />
                      </div>
                    </div>

                    <RadioGroup
                      value={formData.cor}
                      onValueChange={(value) => setFormData((prev) => ({ ...prev, cor: value }))}
                      className="grid gap-3 sm:grid-cols-2"
                    >
                      {STATUS_COLOR_PALETTE.map((option) => {
                        const isSelected = formData.cor === option.value;

                        return (
                          <Label key={option.value} htmlFor={`color-${option.value}`} className="cursor-pointer">
                            <RadioGroupItem id={`color-${option.value}`} value={option.value} className="sr-only" />
                            <div
                              className={cn(
                                'flex h-20 items-center gap-3 rounded-2xl border border-white/40 bg-white/75 p-3 text-left shadow-[0_10px_28px_rgba(15,23,42,0.08)] transition-all hover:-translate-y-0.5 hover:shadow-[0_16px_40px_rgba(15,23,42,0.14)] dark:border-slate-700/60 dark:bg-slate-900/60',
                                isSelected && 'ring-2 ring-offset-2 ring-offset-white dark:ring-offset-slate-950',
                              )}
                              style={{
                                borderColor: isSelected ? hexToRgba(option.value, 0.55) : undefined,
                                boxShadow: isSelected
                                  ? `0 18px 45px ${hexToRgba(option.value, 0.2)}`
                                  : undefined,
                              }}
                            >
                              <span
                                className="flex h-12 w-12 flex-none items-center justify-center rounded-xl font-semibold uppercase tracking-wide text-white shadow-[0_12px_24px_rgba(15,23,42,0.16)]"
                                style={{
                                  background: `linear-gradient(135deg, ${hexToRgba(option.value, 0.95)}, ${hexToRgba(option.value, 0.6)})`,
                                }}
                                aria-hidden="true"
                              >
                                {option.name.charAt(0)}
                              </span>
                              <div className="flex flex-col">
                                <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{option.name}</span>
                                <span className="text-xs text-slate-500 dark:text-slate-400">{option.description}</span>
                              </div>
                              {isSelected && <Palette className="ml-auto h-4 w-4 text-slate-400 dark:text-slate-300" />}
                            </div>
                          </Label>
                        );
                      })}
                    </RadioGroup>
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
          <div className="grid w-full gap-4 text-left sm:grid-cols-3">
            {highlightStats.map((stat) => (
              <div
                key={stat.key}
                className="relative overflow-hidden rounded-2xl border border-white/40 bg-white/65 p-4 shadow-[0_18px_40px_-24px_rgba(15,23,42,0.8)] backdrop-blur-xl dark:border-slate-700/60 dark:bg-slate-900/60"
                style={{
                  boxShadow: `0 18px 40px ${hexToRgba(stat.accent, 0.18)}`,
                  borderColor: hexToRgba(stat.accent, 0.2),
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    {stat.label}
                  </span>
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: stat.accent }}
                    aria-hidden="true"
                  />
                </div>
                <p className="mt-2 text-3xl font-semibold text-slate-900 dark:text-slate-100">{stat.value}</p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{stat.description}</p>
              </div>
            ))}
          </div>
        </GlassPanelHeader>

        <div className="space-y-6">
          {statuses.length === 0 ? (
            <Card className="overflow-hidden border-none bg-gradient-to-br from-white/85 via-white/70 to-white/45 shadow-[0_45px_120px_-50px_rgba(15,23,42,0.85)] backdrop-blur-2xl dark:from-slate-900/80 dark:via-slate-900/70 dark:to-slate-900/50">
              <CardContent className="flex flex-col items-center justify-center py-10 text-center">
                <p className="mb-4 text-muted-foreground">Nenhum status cadastrado</p>
                <Button onClick={openCreateDialog}>
                  <Plus className="mr-2 h-4 w-4" />
                  Criar Primeiro Status
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card className="overflow-hidden border-none bg-gradient-to-br from-white/85 via-white/70 to-white/45 shadow-[0_45px_120px_-50px_rgba(15,23,42,0.85)] backdrop-blur-2xl dark:from-slate-900/80 dark:via-slate-900/70 dark:to-slate-900/50">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg text-slate-900 dark:text-slate-100">
                  Visualização em Matriz
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Utilize a matriz para identificar rapidamente quais status estão disponíveis para Suporte, Projeto ou Avulso.
                </CardDescription>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[220px]">Status</TableHead>
                      {matrixCategories.map((category) => (
                        <TableHead key={category.key} className="text-center">
                          {category.label}
                        </TableHead>
                      ))}
                      <TableHead className="text-center">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedStatuses.map((status) => {
                      const remainingAplicacoes = getRemainingAplicacoes(status);
                      const statusColor = getStatusColorValue(status);

                      return (
                        <TableRow
                          key={status.id}
                          className="group border-b-transparent bg-white/55 transition-all hover:-translate-y-[1px] hover:bg-white/80 hover:shadow-[0_24px_65px_-30px_rgba(15,23,42,0.55)] dark:bg-slate-900/55 dark:hover:bg-slate-900/70"
                          style={{ boxShadow: `inset 4px 0 0 ${hexToRgba(statusColor, 0.85)}` }}
                        >
                          <TableCell className="align-top">
                            <div className="flex flex-col gap-3 py-3">
                              <div className="flex items-start gap-4">
                                <div
                                  className="flex h-12 w-12 flex-none items-center justify-center rounded-2xl text-sm font-semibold uppercase tracking-wide text-white shadow-[0_14px_28px_rgba(15,23,42,0.18)]"
                                  style={{
                                    background: `linear-gradient(135deg, ${hexToRgba(statusColor, 0.95)}, ${hexToRgba(statusColor, 0.58)})`,
                                  }}
                                >
                                  {status.nome.slice(0, 2).toUpperCase()}
                                </div>
                                <div className="flex flex-col gap-2">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                      {status.nome}
                                    </span>
                                    <Badge
                                      variant="outline"
                                      className="flex items-center gap-1 border-transparent text-[10px] font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300"
                                      style={{ backgroundColor: hexToRgba(statusColor, 0.12) }}
                                    >
                                      <span
                                        className="h-2 w-2 rounded-full"
                                        style={{ backgroundColor: statusColor }}
                                        aria-hidden="true"
                                      />
                                      {statusColor.toUpperCase()}
                                    </Badge>
                                    {!status.ativo && (
                                      <Badge variant="outline" className="border-dashed text-[10px] uppercase tracking-wide">
                                        Inativo
                                      </Badge>
                                    )}
                                  </div>
                                  {remainingAplicacoes.length > 0 && (
                                    <div className="flex flex-wrap gap-2">
                                      {remainingAplicacoes.map((tipo) => (
                                        <Badge
                                          key={`${status.id}-${tipo}`}
                                          variant="outline"
                                          className="border-transparent bg-slate-100/70 text-[10px] font-medium tracking-wide text-slate-600 dark:bg-slate-800/60 dark:text-slate-300"
                                        >
                                          {getTipoLabel(tipo)}
                                        </Badge>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          {matrixCategories.map((category) => {
                            const matchesCategory = statusMatchesCategory(status, category.matchers);
                            return (
                              <TableCell key={`${status.id}-${category.key}`} className="text-center">
                                <div
                                  className={cn(
                                    'mx-auto flex h-9 w-9 items-center justify-center rounded-full border border-white/50 bg-white/60 shadow-inner dark:border-slate-700/60 dark:bg-slate-900/60',
                                    matchesCategory && 'border-transparent',
                                  )}
                                  style={{
                                    backgroundColor: matchesCategory ? hexToRgba(statusColor, 0.18) : undefined,
                                    color: matchesCategory ? statusColor : undefined,
                                  }}
                                >
                                  <Checkbox
                                    checked={matchesCategory}
                                    disabled
                                    aria-label={`Status ${status.nome} ${matchesCategory ? 'aplicável' : 'não aplicável'} a ${category.label}`}
                                    className="pointer-events-none"
                                  />
                                </div>
                              </TableCell>
                            );
                          })}
                          <TableCell className="align-top">
                            <div className="flex items-center justify-center gap-2 py-2">
                              <Button
                                variant="secondary"
                                size="icon"
                                className="h-9 w-9 rounded-full border-none bg-white/90 shadow-[0_10px_25px_rgba(15,23,42,0.12)] hover:bg-white dark:bg-slate-900/70 dark:hover:bg-slate-900"
                                onClick={() => openEditDialog(status)}
                              >
                                <Pencil className="h-4 w-4 text-slate-600 dark:text-slate-200" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="secondary"
                                    size="icon"
                                    className="h-9 w-9 rounded-full border-none bg-white/90 shadow-[0_10px_25px_rgba(15,23,42,0.12)] hover:bg-white dark:bg-slate-900/70 dark:hover:bg-slate-900"
                                  >
                                    <Trash2 className="h-4 w-4 text-slate-600 dark:text-slate-200" />
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
                                      onClick={() => void handleDelete(status.id)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                      disabled={deletingId === status.id}
                                    >
                                      {deletingId === status.id ? (
                                        <span className="flex items-center gap-2">
                                          <Loader2 className="h-4 w-4 animate-spin" />
                                          Excluindo...
                                        </span>
                                      ) : (
                                        'Excluir'
                                      )}
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default StatusPage;