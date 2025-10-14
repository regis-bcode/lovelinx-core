import React, { useMemo, useState } from 'react';
import { Pencil, Trash2, Plus, Loader2 } from 'lucide-react';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useStatus } from '@/hooks/useStatus';
import { STATUS_COLOR_PALETTE, DEFAULT_STATUS_COLOR_BY_NAME, getStatusColorValue } from '@/lib/status-colors';
import { cn } from '@/lib/utils';
import { Status, StatusFormData } from '@/types/status';

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
  const [loadingKeys, setLoadingKeys] = useState<string[]>([]);

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
    { value: 'tarefa_projeto', label: 'Tarefa de Projeto' },
    { value: 'tarefa_suporte', label: 'Tarefa de Suporte' },
    { value: 'tarefa_avulso', label: 'Tarefa de Avulso' },
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
      tipo_aplicacao: Array.isArray(status.tipo_aplicacao) ? status.tipo_aplicacao : [],
      ativo: status.ativo,
      cor: getStatusColorValue(status),
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

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

  const getTipoLabel = (tipo: string) => {
    const tipoObj = tiposDisponiveis.find((item) => item.value === tipo);
    return tipoObj ? tipoObj.label : tipo;
  };

  const getAplicacoes = (status: Status) =>
    Array.isArray(status.tipo_aplicacao) ? status.tipo_aplicacao : [];

  const setLoadingState = (key: string, isLoading: boolean) => {
    setLoadingKeys((prev) => {
      if (isLoading) {
        if (prev.includes(key)) return prev;
        return [...prev, key];
      }
      return prev.filter((item) => item !== key);
    });
  };

  const isKeyLoading = (key: string) => loadingKeys.includes(key);

  const handleMatrixToggle = async (
    status: Status,
    tipo: StatusCategory,
    nextState: boolean,
  ) => {
    const key = `${status.id}-${tipo}`;
    const aplicacoesAtuais = getAplicacoes(status);
    const possuiAplicacao = aplicacoesAtuais.includes(tipo);

    if (nextState === possuiAplicacao) return;

    setLoadingState(key, true);

    const updatedAplicacoes = nextState
      ? Array.from(new Set([...aplicacoesAtuais, tipo]))
      : aplicacoesAtuais.filter((item) => item !== tipo);

    try {
      await updateStatus(status.id, { tipo_aplicacao: updatedAplicacoes });
    } finally {
      setLoadingState(key, false);
    }
  };

  const handleActiveToggle = async (status: Status, nextState: boolean) => {
    const key = `${status.id}-ativo`;
    if (status.ativo === nextState) return;

    setLoadingState(key, true);
    try {
      await updateStatus(status.id, { ativo: nextState });
    } finally {
      setLoadingState(key, false);
    }
  };

  const sortedStatuses = useMemo(
    () => [...statuses].sort((a, b) => a.nome.localeCompare(b.nome)),
    [statuses],
  );

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
      },
      {
        key: 'active',
        label: 'Ativos',
        value: activeStatuses,
        description:
          inactiveStatuses > 0
            ? `${inactiveStatuses} aguardando revisão.`
            : 'Todos disponíveis para uso imediato.',
      },
      {
        key: 'custom',
        label: 'Personalizados',
        value: customStatuses,
        description:
          customStatuses > 0
            ? 'Status criados sob medida para a operação.'
            : 'Comece criando um status exclusivo.',
      },
    ],
    [activeStatuses, customStatuses, inactiveStatuses, totalStatuses],
  );

  const getRemainingAplicacoes = (status: Status) =>
    getAplicacoes(status).filter(
      (tipo) => !tiposDisponiveis.some((category) => category.value === tipo),
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

  return (
    <DashboardLayout>
      <div className="flex h-full flex-col gap-6 p-4 md:p-6">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Gestão de Status
            </p>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Gerenciar Status
            </h1>
            <p className="max-w-2xl text-sm text-muted-foreground">
              Defina os estados que representam o progresso dos projetos e tarefas da organização.
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreateDialog}>
                <Plus className="mr-2 h-4 w-4" />
                Novo Status
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>
                  {editingStatus ? 'Editar Status' : 'Criar Status'}
                </DialogTitle>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome do Status</Label>
                  <Input
                    id="nome"
                    value={formData.nome}
                    onChange={(event) =>
                      setFormData((prev) => ({ ...prev, nome: event.target.value }))
                    }
                    placeholder="Digite o nome do status"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Cor do Status</Label>
                  <RadioGroup
                    value={formData.cor}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, cor: value }))}
                    className="grid grid-cols-2 gap-2 sm:grid-cols-3"
                  >
                    {STATUS_COLOR_PALETTE.map((option) => (
                      <Label
                        key={option.value}
                        htmlFor={`color-${option.value}`}
                        className={cn(
                          'flex cursor-pointer items-center gap-3 rounded-md border bg-card p-3 text-sm shadow-sm transition-colors',
                          formData.cor === option.value
                            ? 'border-primary/60 ring-2 ring-primary/20 ring-offset-2'
                            : 'border-border hover:border-muted-foreground/40',
                        )}
                      >
                        <RadioGroupItem id={`color-${option.value}`} value={option.value} className="sr-only" />
                        <span
                          className="h-5 w-5 rounded-full border border-border"
                          style={{ backgroundColor: option.value }}
                          aria-hidden="true"
                        />
                        <span className="flex flex-1 flex-col gap-0.5">
                          <span className="font-medium text-foreground">{option.name}</span>
                          <span className="text-xs text-muted-foreground">{option.description}</span>
                        </span>
                        {formData.cor === option.value && (
                          <span className="text-xs font-medium text-primary">Selecionado</span>
                        )}
                      </Label>
                    ))}
                  </RadioGroup>
                </div>

                <div className="space-y-2">
                  <Label>Aplicável para</Label>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {tiposDisponiveis.map((tipo) => {
                      const checked = formData.tipo_aplicacao.includes(tipo.value);
                      return (
                        <Label
                          key={tipo.value}
                          className={cn(
                            'flex cursor-pointer items-center gap-3 rounded-md border bg-card p-3 text-sm shadow-sm transition-colors',
                            checked
                              ? 'border-primary/60 ring-1 ring-primary/20'
                              : 'border-border hover:border-muted-foreground/40',
                          )}
                        >
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(value) =>
                              setFormData((prev) => {
                                const next = new Set(prev.tipo_aplicacao);
                                if (value === true) {
                                  next.add(tipo.value);
                                } else {
                                  next.delete(tipo.value);
                                }
                                return {
                                  ...prev,
                                  tipo_aplicacao: Array.from(next) as StatusCategory[],
                                };
                              })
                            }
                          />
                          <span>{tipo.label}</span>
                        </Label>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-md border border-dashed border-border bg-card p-3">
                  <div className="space-y-1">
                    <Label htmlFor="ativo">Status ativo</Label>
                    <p className="text-xs text-muted-foreground">
                      Status inativos ficam disponíveis apenas para consulta.
                    </p>
                  </div>
                  <Switch
                    id="ativo"
                    checked={formData.ativo}
                    onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, ativo: checked }))}
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" className="min-w-[120px]">
                    {editingStatus ? 'Atualizar' : 'Criar'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {highlightStats.map((stat) => (
            <Card key={stat.key}>
              <CardHeader className="space-y-1 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.label}
                </CardTitle>
                <div className="text-2xl font-semibold text-foreground">{stat.value}</div>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                {stat.description}
              </CardContent>
            </Card>
          ))}
        </section>

        {statuses.length === 0 ? (
          <Card>
            <CardContent className="flex h-48 flex-col items-center justify-center gap-3 text-center">
              <div className="space-y-1">
                <h2 className="text-lg font-semibold text-foreground">Nenhum status cadastrado</h2>
                <p className="text-sm text-muted-foreground">
                  Crie um status para começar a organizar seus fluxos.
                </p>
              </div>
              <Button onClick={openCreateDialog}>
                <Plus className="mr-2 h-4 w-4" />
                Criar Primeiro Status
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="flex flex-1 flex-col">
            <CardHeader className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1">
                <CardTitle className="text-base font-semibold text-foreground">
                  Visualização em Matriz
                </CardTitle>
                <CardDescription className="text-sm text-muted-foreground">
                  Acompanhe rapidamente onde cada status está habilitado e sua situação atual.
                </CardDescription>
              </div>
              <Button size="sm" onClick={openCreateDialog}>
                <Plus className="mr-2 h-4 w-4" />
                Novo Status
              </Button>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden p-0">
              <ScrollArea className="h-[480px]">
                <div className="min-w-[720px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[120px]">Ações</TableHead>
                        <TableHead className="w-[220px]">Status</TableHead>
                        {tiposDisponiveis.map((tipo) => (
                          <TableHead key={tipo.value} className="text-center">
                            {tipo.label}
                          </TableHead>
                        ))}
                        <TableHead className="w-[120px] text-center">Ativo</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedStatuses.map((status) => {
                        const remainingAplicacoes = getRemainingAplicacoes(status);
                        const statusColor = getStatusColorValue(status);
                        const aplicacoes = getAplicacoes(status);

                        return (
                          <TableRow key={status.id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={() => openEditDialog(status)}
                                  aria-label={`Editar status ${status.nome}`}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      variant="outline"
                                      size="icon"
                                      aria-label={`Excluir status ${status.nome}`}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Excluir Status</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Tem certeza que deseja excluir o status "{status.nome}"? Esta ação não pode ser desfeita.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => void handleDelete(status.id)}
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
                            <TableCell>
                              <div className="flex flex-col gap-3 py-2">
                                <div className="flex items-center gap-3">
                                  <span
                                    className="flex h-10 w-10 items-center justify-center rounded-md text-sm font-semibold uppercase text-white"
                                    style={{ backgroundColor: statusColor }}
                                  >
                                    {status.nome.slice(0, 2).toUpperCase()}
                                  </span>
                                  <div className="space-y-1">
                                    <span className="text-sm font-medium text-foreground">{status.nome}</span>
                                    <div className="flex flex-wrap items-center gap-2">
                                      <Badge variant="secondary" className="flex items-center gap-1">
                                        <span
                                          className="h-2 w-2 rounded-full"
                                          style={{ backgroundColor: statusColor }}
                                          aria-hidden="true"
                                        />
                                        {statusColor.toUpperCase()}
                                      </Badge>
                                      {!status.ativo && <Badge variant="outline">Inativo</Badge>}
                                    </div>
                                  </div>
                                </div>
                                {remainingAplicacoes.length > 0 && (
                                  <div className="flex flex-wrap gap-2">
                                    {remainingAplicacoes.map((tipo) => (
                                      <Badge key={`${status.id}-${tipo}`} variant="outline">
                                        {getTipoLabel(tipo)}
                                      </Badge>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            {tiposDisponiveis.map((tipo) => {
                              const key = `${status.id}-${tipo.value}`;
                              const isSelected = aplicacoes.includes(tipo.value);
                              const loadingCell = isKeyLoading(key);

                              return (
                                <TableCell key={key}>
                                  <div className="flex items-center justify-center gap-2">
                                    <Checkbox
                                      checked={isSelected}
                                      onCheckedChange={(value) =>
                                        void handleMatrixToggle(status, tipo.value, value === true)
                                      }
                                      disabled={loadingCell}
                                      aria-label={`Marcar status ${status.nome} como aplicável para ${tipo.label}`}
                                    />
                                    {loadingCell && (
                                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                    )}
                                  </div>
                                </TableCell>
                              );
                            })}
                            <TableCell>
                              <div className="flex items-center justify-center gap-2">
                                <Switch
                                  id={`ativo-${status.id}`}
                                  checked={status.ativo}
                                  onCheckedChange={(checked) => void handleActiveToggle(status, checked)}
                                  aria-label={`Alterar status ${status.nome} para ${status.ativo ? 'inativo' : 'ativo'}`}
                                  disabled={isKeyLoading(`${status.id}-ativo`)}
                                />
                                {isKeyLoading(`${status.id}-ativo`) && (
                                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default StatusPage;
