import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DateInput } from '@/components/ui/date-input';
import { Switch } from '@/components/ui/switch';
import { CurrencyInput } from '@/components/ui/currency-input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useGaps } from '@/hooks/useGaps';
import { useTasks } from '@/hooks/useTasks';
import { useToast } from '@/hooks/use-toast';
import { Gap, GapFormData } from '@/types/gap';
import { cn } from '@/lib/utils';
import { CheckCircle2, ClipboardEdit, FilePlus2, Loader2, Trash2 } from 'lucide-react';

const IMPACT_OPTIONS = ['Escopo', 'Prazo', 'Custo'] as const;

type GapFormState = Partial<GapFormData> & {
  impacto: string[];
  anexosTexto?: string;
  valor_impacto_financeiro?: string | number | null;
};

interface GapManagementProps {
  projectId: string;
  initialTaskId?: string;
}

const emptyForm: GapFormState = {
  task_id: '',
  titulo: '',
  descricao: '',
  tipo: '',
  origem: '',
  severidade: '',
  urgencia: '',
  prioridade: '',
  impacto: [],
  faturavel: false,
  valor_impacto_financeiro: '',
  causa_raiz: '',
  plano_acao: '',
  responsavel: '',
  data_prometida: '',
  status: '',
  necessita_aprovacao: false,
  decisao: '',
  aprovado_por: '',
  data_aprovacao: '',
  anexos: [],
  observacoes: '',
  impacto_financeiro_descricao: '',
  impacto_resumo: '',
  anexosTexto: '',
};

export function GapManagement({ projectId, initialTaskId }: GapManagementProps) {
  const { gaps, loading, createGap, updateGap, deleteGap, ensureGapForTask } = useGaps(projectId);
  const { tasks } = useTasks(projectId);
  const { toast } = useToast();

  const [selectedTaskId, setSelectedTaskId] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formState, setFormState] = useState<GapFormState>(emptyForm);
  const [editingGap, setEditingGap] = useState<Gap | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (initialTaskId) {
      setSelectedTaskId(initialTaskId);
    }
  }, [initialTaskId]);

  useEffect(() => {
    if (!isDialogOpen) {
      setFormState(emptyForm);
      setEditingGap(null);
    }
  }, [isDialogOpen]);

  const filteredGaps = useMemo(() => {
    if (selectedTaskId === 'all') {
      return gaps;
    }
    return gaps.filter(gap => gap.task_id === selectedTaskId);
  }, [gaps, selectedTaskId]);

  const tasksOptions = useMemo(() => {
    return tasks
      .slice()
      .sort((a, b) => a.nome.localeCompare(b.nome));
  }, [tasks]);

  const highlightTaskId = initialTaskId ?? null;

  const openCreateDialog = (taskId?: string) => {
    const baseTaskId = taskId ?? (selectedTaskId !== 'all' ? selectedTaskId : '');
    setFormState({
      ...emptyForm,
      task_id: baseTaskId,
      impacto: [],
      faturavel: false,
      necessita_aprovacao: false,
    });
    setEditingGap(null);
    setIsDialogOpen(true);
  };

  const openEditDialog = (gap: Gap) => {
    setFormState({
      ...gap,
      impacto: Array.isArray(gap.impacto) ? gap.impacto : gap.impacto ? [...(gap.impacto as string[])] : [],
      anexosTexto: Array.isArray(gap.anexos) ? gap.anexos.join('\n') : '',
      valor_impacto_financeiro: gap.valor_impacto_financeiro ?? '',
    });
    setEditingGap(gap);
    setIsDialogOpen(true);
  };

  const handleImpactToggle = (impact: string) => {
    setFormState(prev => {
      const current = new Set(prev.impacto ?? []);
      if (current.has(impact)) {
        current.delete(impact);
      } else {
        current.add(impact);
      }
      return { ...prev, impacto: Array.from(current) };
    });
  };

  const handleSubmit = async () => {
    if (!formState.task_id) {
      toast({
        title: 'Atenção',
        description: 'Selecione a tarefa vinculada ao GAP antes de salvar.',
        variant: 'destructive',
      });
      return;
    }

    if (!formState.titulo?.trim()) {
      toast({
        title: 'Atenção',
        description: 'Informe o título do GAP.',
        variant: 'destructive',
      });
      return;
    }

    const anexosArray = formState.anexosTexto
      ?.split('\n')
      .map(item => item.trim())
      .filter(Boolean);

    const payload: Partial<GapFormData> = {
      task_id: formState.task_id,
      titulo: formState.titulo?.trim(),
      descricao: formState.descricao?.trim() || null,
      tipo: formState.tipo?.trim() || null,
      origem: formState.origem?.trim() || null,
      severidade: formState.severidade?.trim() || null,
      urgencia: formState.urgencia?.trim() || null,
      prioridade: formState.prioridade?.trim() || null,
      impacto: (formState.impacto ?? []).length ? formState.impacto : null,
      faturavel: Boolean(formState.faturavel),
      valor_impacto_financeiro:
        formState.valor_impacto_financeiro === '' || formState.valor_impacto_financeiro === undefined
          ? null
          : Number(formState.valor_impacto_financeiro),
      causa_raiz: formState.causa_raiz?.trim() || null,
      plano_acao: formState.plano_acao?.trim() || null,
      responsavel: formState.responsavel?.trim() || null,
      data_prometida: formState.data_prometida || null,
      status: formState.status?.trim() || null,
      necessita_aprovacao: Boolean(formState.necessita_aprovacao),
      decisao: formState.decisao?.trim() || null,
      aprovado_por: formState.aprovado_por?.trim() || null,
      data_aprovacao: formState.data_aprovacao || null,
      anexos: anexosArray && anexosArray.length ? anexosArray : null,
      observacoes: formState.observacoes?.trim() || null,
      impacto_financeiro_descricao: formState.impacto_financeiro_descricao?.trim() || null,
      impacto_resumo: formState.impacto_resumo?.trim() || null,
    };

    setIsSaving(true);
    const result = editingGap
      ? await updateGap(editingGap.id, payload)
      : await createGap(payload);
    setIsSaving(false);

    if (result) {
      toast({
        title: editingGap ? 'GAP atualizado' : 'GAP criado',
        description: editingGap
          ? 'As informações do GAP foram atualizadas com sucesso.'
          : 'O GAP foi registrado com sucesso.',
      });
      setIsDialogOpen(false);
    }
  };

  const handleDelete = async (gap: Gap) => {
    if (!confirm(`Deseja realmente remover o GAP "${gap.titulo}"?`)) return;
    const success = await deleteGap(gap.id);
    if (success && editingGap?.id === gap.id) {
      setIsDialogOpen(false);
    }
  };

  const handleEnsureGap = async (taskId: string) => {
    const task = tasks.find(item => item.id === taskId);
    if (!task) return;
    const ensured = await ensureGapForTask(task);
    if (ensured) {
      toast({
        title: 'GAP gerado',
        description: 'Um GAP foi criado automaticamente para a tarefa fora de escopo.',
      });
    }
  };

  const selectedTaskHasGap = selectedTaskId === 'all'
    ? false
    : gaps.some(gap => gap.task_id === selectedTaskId);

  return (
    <div className="flex h-full flex-col gap-4">
      <Card className="border-border/80">
        <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <CardTitle>Gestão de GAPs</CardTitle>
            <CardDescription>
              Registre lacunas identificadas no projeto, acompanhe planos de ação e mantenha o histórico de decisões.
            </CardDescription>
          </div>
          <div className="flex w-full flex-col gap-3 lg:w-auto lg:flex-row lg:items-center">
            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Filtrar por tarefa</span>
              <Select value={selectedTaskId} onValueChange={value => setSelectedTaskId(value)}>
                <SelectTrigger className="w-full min-w-[240px]">
                  <SelectValue placeholder="Todas as tarefas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as tarefas</SelectItem>
                  {tasksOptions.map(task => (
                    <SelectItem key={task.id} value={task.id}>
                      {task.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
              {selectedTaskId !== 'all' && !selectedTaskHasGap ? (
                <Button variant="outline" onClick={() => handleEnsureGap(selectedTaskId)}>
                  <CheckCircle2 className="mr-2 h-4 w-4" /> Gerar GAP automático
                </Button>
              ) : null}
              <Button onClick={() => openCreateDialog(selectedTaskId !== 'all' ? selectedTaskId : undefined)}>
                <FilePlus2 className="mr-2 h-4 w-4" /> Novo GAP
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Carregando registros de GAP...
            </div>
          ) : filteredGaps.length === 0 ? (
            <div className="rounded-lg border border-dashed border-muted p-8 text-center text-muted-foreground">
              Nenhum GAP registrado para o filtro selecionado.
            </div>
          ) : (
            <ScrollArea className="h-[520px]">
              <Table className="min-w-[900px] text-sm">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">Título</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Origem</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Responsável</TableHead>
                    <TableHead>Impacto</TableHead>
                    <TableHead className="w-[120px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredGaps.map(gap => (
                    <TableRow
                      key={gap.id}
                      className={cn(
                        highlightTaskId && gap.task_id === highlightTaskId
                          ? 'bg-primary/5 hover:bg-primary/10'
                          : undefined,
                      )}
                    >
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-semibold text-foreground">{gap.titulo}</span>
                          <span className="text-xs text-muted-foreground">{tasks.find(task => task.id === gap.task_id)?.nome}</span>
                        </div>
                      </TableCell>
                      <TableCell>{gap.tipo || '-'}</TableCell>
                      <TableCell>{gap.origem || '-'}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap items-center gap-1">
                          {gap.status ? <Badge variant="outline">{gap.status}</Badge> : <span>-</span>}
                          {gap.necessita_aprovacao ? (
                            <Badge variant="secondary">Aprovação</Badge>
                          ) : null}
                          {gap.faturavel ? <Badge variant="default">Faturável</Badge> : null}
                        </div>
                      </TableCell>
                      <TableCell>{gap.responsavel || '-'}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {(gap.impacto as string[] | null)?.map(impact => (
                            <Badge key={impact} variant="outline">
                              {impact}
                            </Badge>
                          )) || <span>-</span>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <Button size="sm" variant="ghost" onClick={() => openEditDialog(gap)}>
                            <ClipboardEdit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleDelete(gap)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-hidden sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>{editingGap ? 'Editar GAP' : 'Novo GAP'}</DialogTitle>
            <DialogDescription>
              Preencha os campos abaixo para registrar a lacuna identificada e definir o plano de tratamento.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[65vh] pr-4">
            <div className="space-y-6 py-2">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-muted-foreground">Tarefa vinculada</label>
                  <Select
                    value={formState.task_id || ''}
                    onValueChange={value => setFormState(prev => ({ ...prev, task_id: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a tarefa" />
                    </SelectTrigger>
                    <SelectContent>
                      {tasksOptions.map(task => (
                        <SelectItem key={task.id} value={task.id}>
                          {task.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-muted-foreground">Título</label>
                  <Input
                    value={formState.titulo || ''}
                    onChange={event => setFormState(prev => ({ ...prev, titulo: event.target.value }))}
                    placeholder="Resumo do GAP"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-muted-foreground">Descrição</label>
                  <Textarea
                    value={formState.descricao || ''}
                    onChange={event => setFormState(prev => ({ ...prev, descricao: event.target.value }))}
                    placeholder="Detalhe o GAP identificado..."
                    className="min-h-[120px]"
                  />
                </div>
                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-muted-foreground">Tipo de GAP</label>
                      <Input
                        value={formState.tipo || ''}
                        onChange={event => setFormState(prev => ({ ...prev, tipo: event.target.value }))}
                        placeholder="Processo, Sistema..."
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-muted-foreground">Origem</label>
                      <Input
                        value={formState.origem || ''}
                        onChange={event => setFormState(prev => ({ ...prev, origem: event.target.value }))}
                        placeholder="Cliente, Interno..."
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-muted-foreground">Severidade</label>
                      <Input
                        value={formState.severidade || ''}
                        onChange={event => setFormState(prev => ({ ...prev, severidade: event.target.value }))}
                        placeholder="Baixa, Média, Alta..."
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-muted-foreground">Urgência</label>
                      <Input
                        value={formState.urgencia || ''}
                        onChange={event => setFormState(prev => ({ ...prev, urgencia: event.target.value }))}
                        placeholder="Imediata, Breve..."
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-muted-foreground">Prioridade</label>
                      <Input
                        value={formState.prioridade || ''}
                        onChange={event => setFormState(prev => ({ ...prev, prioridade: event.target.value }))}
                        placeholder="Baixa, Média, Alta..."
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-muted-foreground">Status do GAP</label>
                      <Input
                        value={formState.status || ''}
                        onChange={event => setFormState(prev => ({ ...prev, status: event.target.value }))}
                        placeholder="Aberto, Em análise..."
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-muted-foreground">Impacto</label>
                    <div className="flex flex-wrap gap-2">
                      {IMPACT_OPTIONS.map(option => {
                        const checked = formState.impacto?.includes(option) ?? false;
                        return (
                          <Button
                            key={option}
                            type="button"
                            variant={checked ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => handleImpactToggle(option)}
                          >
                            {option}
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-muted-foreground">Faturável?</label>
                  <div className="flex items-center justify-between rounded-md border border-dashed border-muted px-3 py-2">
                    <span className="text-sm text-muted-foreground">Este GAP gera cobrança adicional?</span>
                    <Switch
                      checked={Boolean(formState.faturavel)}
                      onCheckedChange={checked => setFormState(prev => ({ ...prev, faturavel: checked }))}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-muted-foreground">Valor de Impacto Financeiro</label>
                  <CurrencyInput
                    value={formState.valor_impacto_financeiro ?? ''}
                    onChange={value => setFormState(prev => ({ ...prev, valor_impacto_financeiro: value }))}
                    placeholder="R$ 0,00"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-muted-foreground">Causa raiz</label>
                  <Textarea
                    value={formState.causa_raiz || ''}
                    onChange={event => setFormState(prev => ({ ...prev, causa_raiz: event.target.value }))}
                    placeholder="Explique a causa principal identificada..."
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-muted-foreground">Plano de ação</label>
                  <Textarea
                    value={formState.plano_acao || ''}
                    onChange={event => setFormState(prev => ({ ...prev, plano_acao: event.target.value }))}
                    placeholder="Defina as ações necessárias..."
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-muted-foreground">Responsável</label>
                  <Input
                    value={formState.responsavel || ''}
                    onChange={event => setFormState(prev => ({ ...prev, responsavel: event.target.value }))}
                    placeholder="Nome do responsável"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-muted-foreground">Data prometida para tratativa</label>
                  <DateInput
                    value={formState.data_prometida || ''}
                    onChange={value => setFormState(prev => ({ ...prev, data_prometida: value }))}
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-muted-foreground">Necessita aprovação?</label>
                  <div className="flex items-center justify-between rounded-md border border-dashed border-muted px-3 py-2">
                    <span className="text-sm text-muted-foreground">Indica se o GAP exige aprovação formal.</span>
                    <Switch
                      checked={Boolean(formState.necessita_aprovacao)}
                      onCheckedChange={checked => setFormState(prev => ({ ...prev, necessita_aprovacao: checked }))}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-muted-foreground">Decisão</label>
                  <Textarea
                    value={formState.decisao || ''}
                    onChange={event => setFormState(prev => ({ ...prev, decisao: event.target.value }))}
                    placeholder="Resumo da decisão tomada"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-muted-foreground">Aprovado por</label>
                  <Input
                    value={formState.aprovado_por || ''}
                    onChange={event => setFormState(prev => ({ ...prev, aprovado_por: event.target.value }))}
                    placeholder="Nome do aprovador"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-muted-foreground">Data de aprovação</label>
                  <DateInput
                    value={formState.data_aprovacao || ''}
                    onChange={value => setFormState(prev => ({ ...prev, data_aprovacao: value }))}
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-muted-foreground">Impacto financeiro (descrição)</label>
                  <Textarea
                    value={formState.impacto_financeiro_descricao || ''}
                    onChange={event => setFormState(prev => ({ ...prev, impacto_financeiro_descricao: event.target.value }))}
                    placeholder="Descreva como o GAP impacta financeiramente o projeto"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-muted-foreground">Resumo do impacto</label>
                  <Textarea
                    value={formState.impacto_resumo || ''}
                    onChange={event => setFormState(prev => ({ ...prev, impacto_resumo: event.target.value }))}
                    placeholder="Resumo executivo do impacto"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-muted-foreground">Anexos (um por linha)</label>
                <Textarea
                  value={formState.anexosTexto || ''}
                  onChange={event => setFormState(prev => ({ ...prev, anexosTexto: event.target.value }))}
                  placeholder="Cole URLs ou descrições de anexos, um por linha"
                  className="min-h-[120px]"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-muted-foreground">Observações</label>
                <Textarea
                  value={formState.observacoes || ''}
                  onChange={event => setFormState(prev => ({ ...prev, observacoes: event.target.value }))}
                  placeholder="Informações adicionais relevantes"
                  className="min-h-[100px]"
                />
              </div>
            </div>
          </ScrollArea>
          <DialogFooter className="gap-2">
            {editingGap ? (
              <Button
                type="button"
                variant="destructive"
                onClick={() => handleDelete(editingGap)}
                disabled={isSaving}
              >
                <Trash2 className="mr-2 h-4 w-4" /> Excluir
              </Button>
            ) : null}
            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isSaving}>
              Cancelar
            </Button>
            <Button type="button" onClick={handleSubmit} disabled={isSaving}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Salvar GAP
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
