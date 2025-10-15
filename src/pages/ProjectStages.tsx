import { useMemo, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useProjectStages } from '@/hooks/useProjectStages';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Pencil, Plus, Save, Trash2, X } from 'lucide-react';

export default function ProjectStages() {
  const { toast } = useToast();
  const {
    stages,
    subStages,
    loading,
    createStage,
    updateStage,
    deleteStage,
    createSubStage,
    updateSubStage,
    deleteSubStage,
    getSubStagesByStage,
  } = useProjectStages();

  const [newStageName, setNewStageName] = useState('');
  const [newStageDescription, setNewStageDescription] = useState('');
  const [creatingStage, setCreatingStage] = useState(false);
  const [editingStageId, setEditingStageId] = useState<string | null>(null);
  const [editingStageName, setEditingStageName] = useState('');
  const [editingStageDescription, setEditingStageDescription] = useState('');
  const [subStageDrafts, setSubStageDrafts] = useState<Record<string, { nome: string; descricao: string }>>({});
  const [editingSubStageId, setEditingSubStageId] = useState<string | null>(null);
  const [editingSubStageName, setEditingSubStageName] = useState('');
  const [editingSubStageDescription, setEditingSubStageDescription] = useState('');

  const handleCreateStage = async () => {
    if (!newStageName.trim()) {
      toast({
        title: 'Atenção',
        description: 'Informe o nome da etapa antes de salvar.',
        variant: 'destructive',
      });
      return;
    }

    setCreatingStage(true);
    const created = await createStage({ nome: newStageName.trim(), descricao: newStageDescription.trim() || undefined });
    setCreatingStage(false);

    if (created) {
      setNewStageName('');
      setNewStageDescription('');
    }
  };

  const startEditingStage = (stageId: string, nome: string, descricao?: string | null) => {
    setEditingStageId(stageId);
    setEditingStageName(nome);
    setEditingStageDescription(descricao ?? '');
  };

  const cancelEditingStage = () => {
    setEditingStageId(null);
    setEditingStageName('');
    setEditingStageDescription('');
  };

  const saveStageEdition = async () => {
    if (!editingStageId) return;

    if (!editingStageName.trim()) {
      toast({
        title: 'Atenção',
        description: 'O nome da etapa é obrigatório.',
        variant: 'destructive',
      });
      return;
    }

    const updated = await updateStage(editingStageId, {
      nome: editingStageName.trim(),
      descricao: editingStageDescription.trim() || null,
    });

    if (updated) {
      toast({
        title: 'Etapa atualizada',
        description: 'As informações da etapa foram atualizadas com sucesso.',
      });
      cancelEditingStage();
    }
  };

  const handleDeleteStage = async (stageId: string, stageName: string) => {
    if (!confirm(`Tem certeza que deseja remover a etapa "${stageName}"?`)) return;

    await deleteStage(stageId);
  };

  const handleDraftChange = (stageId: string, field: 'nome' | 'descricao', value: string) => {
    setSubStageDrafts(prev => ({
      ...prev,
      [stageId]: {
        nome: field === 'nome' ? value : prev[stageId]?.nome ?? '',
        descricao: field === 'descricao' ? value : prev[stageId]?.descricao ?? '',
      },
    }));
  };

  const handleCreateSubStage = async (stageId: string) => {
    const draft = subStageDrafts[stageId];
    const nome = draft?.nome?.trim();

    if (!nome) {
      toast({
        title: 'Atenção',
        description: 'Informe o nome da sub-etapa antes de salvar.',
        variant: 'destructive',
      });
      return;
    }

    const created = await createSubStage(stageId, {
      nome,
      descricao: draft?.descricao?.trim() || undefined,
    });

    if (created) {
      setSubStageDrafts(prev => ({
        ...prev,
        [stageId]: { nome: '', descricao: '' },
      }));
    }
  };

  const startEditingSubStage = (subStageId: string, nome: string, descricao?: string | null) => {
    setEditingSubStageId(subStageId);
    setEditingSubStageName(nome);
    setEditingSubStageDescription(descricao ?? '');
  };

  const cancelEditingSubStage = () => {
    setEditingSubStageId(null);
    setEditingSubStageName('');
    setEditingSubStageDescription('');
  };

  const saveSubStageEdition = async () => {
    if (!editingSubStageId) return;

    if (!editingSubStageName.trim()) {
      toast({
        title: 'Atenção',
        description: 'O nome da sub-etapa é obrigatório.',
        variant: 'destructive',
      });
      return;
    }

    const updated = await updateSubStage(editingSubStageId, {
      nome: editingSubStageName.trim(),
      descricao: editingSubStageDescription.trim() || null,
    });

    if (updated) {
      toast({
        title: 'Sub-etapa atualizada',
        description: 'As informações da sub-etapa foram atualizadas com sucesso.',
      });
      cancelEditingSubStage();
    }
  };

  const handleDeleteSubStage = async (subStageId: string, subStageName: string) => {
    if (!confirm(`Tem certeza que deseja remover a sub-etapa "${subStageName}"?`)) return;

    await deleteSubStage(subStageId);
  };

  const stageSubStages = useMemo(() => {
    return stages.reduce<Record<string, typeof subStages>>((acc, stage) => {
      acc[stage.id] = getSubStagesByStage(stage.id);
      return acc;
    }, {});
  }, [stages, getSubStagesByStage, subStages]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Etapas e Sub-Etapas do Projeto</h1>
          <p className="text-muted-foreground">
            Configure as etapas macro do projeto e detalhe as sub-etapas para padronizar o cronograma.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Criar nova etapa</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-[1fr_200px]">
              <div className="space-y-2">
                <Input
                  placeholder="Nome da etapa"
                  value={newStageName}
                  onChange={event => setNewStageName(event.target.value)}
                />
                <Textarea
                  placeholder="Descrição (opcional)"
                  value={newStageDescription}
                  onChange={event => setNewStageDescription(event.target.value)}
                  className="min-h-[80px]"
                />
              </div>
              <div className="flex flex-col gap-2 sm:items-end">
                <Button onClick={handleCreateStage} disabled={creatingStage} className="w-full sm:w-auto">
                  {creatingStage ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  <span className="ml-2">Adicionar etapa</span>
                </Button>
                <p className="text-xs text-muted-foreground">
                  Sugerimos seguir o fluxo padrão: Iniciação, Planejamento, Controle, Execução e Encerramento.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Carregando etapas do projeto...
          </div>
        ) : stages.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Nenhuma etapa configurada até o momento.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6">
            {stages.map(stage => {
              const draft = subStageDrafts[stage.id] ?? { nome: '', descricao: '' };
              const stageSubStageList = stageSubStages[stage.id] ?? [];

              return (
                <Card key={stage.id} className="border-border/80">
                  <CardHeader className="space-y-4">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-2">
                        {editingStageId === stage.id ? (
                          <div className="space-y-2">
                            <Input
                              value={editingStageName}
                              onChange={event => setEditingStageName(event.target.value)}
                              placeholder="Nome da etapa"
                            />
                            <Textarea
                              value={editingStageDescription}
                              onChange={event => setEditingStageDescription(event.target.value)}
                              placeholder="Descrição da etapa"
                            />
                          </div>
                        ) : (
                          <div>
                            <CardTitle className="text-xl">{stage.nome}</CardTitle>
                            {stage.descricao ? (
                              <p className="text-sm text-muted-foreground">{stage.descricao}</p>
                            ) : (
                              <p className="text-sm text-muted-foreground">
                                Etapa #{stage.ordem}. Clique em editar para adicionar uma descrição.
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {editingStageId === stage.id ? (
                          <>
                            <Button size="sm" variant="secondary" onClick={saveStageEdition}>
                              <Save className="mr-2 h-4 w-4" /> Salvar
                            </Button>
                            <Button size="sm" variant="ghost" onClick={cancelEditingStage}>
                              <X className="mr-2 h-4 w-4" /> Cancelar
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button size="sm" variant="ghost" onClick={() => startEditingStage(stage.id, stage.nome, stage.descricao)}>
                              <Pencil className="mr-2 h-4 w-4" /> Editar
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-destructive hover:text-destructive"
                              onClick={() => handleDeleteStage(stage.id, stage.nome)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" /> Excluir
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Sub-etapas</h3>
                        <p className="text-sm text-muted-foreground">
                          Utilize sub-etapas para detalhar entregas específicas desta fase do projeto.
                        </p>
                      </div>
                      <div className="grid gap-3 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)_auto]">
                        <Input
                          placeholder="Nome da sub-etapa"
                          value={draft.nome}
                          onChange={event => handleDraftChange(stage.id, 'nome', event.target.value)}
                        />
                        <Textarea
                          placeholder="Descrição (opcional)"
                          value={draft.descricao}
                          onChange={event => handleDraftChange(stage.id, 'descricao', event.target.value)}
                          className="min-h-[60px]"
                        />
                        <Button onClick={() => handleCreateSubStage(stage.id)} className="h-full">
                          <Plus className="mr-2 h-4 w-4" /> Adicionar
                        </Button>
                      </div>
                    </div>

                    <Separator />

                    {stageSubStageList.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-muted p-6 text-center text-sm text-muted-foreground">
                        Nenhuma sub-etapa cadastrada para esta etapa.
                      </div>
                    ) : (
                      <div className="overflow-x-auto rounded-lg border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Nome</TableHead>
                              <TableHead>Descrição</TableHead>
                              <TableHead className="w-[140px]">Ações</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {stageSubStageList.map(subStage => (
                              <TableRow key={subStage.id}>
                                <TableCell>
                                  {editingSubStageId === subStage.id ? (
                                    <Input
                                      value={editingSubStageName}
                                      onChange={event => setEditingSubStageName(event.target.value)}
                                      placeholder="Nome da sub-etapa"
                                    />
                                  ) : (
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium">{subStage.nome}</span>
                                      <Badge variant="outline">Ordem {subStage.ordem}</Badge>
                                    </div>
                                  )}
                                </TableCell>
                                <TableCell>
                                  {editingSubStageId === subStage.id ? (
                                    <Textarea
                                      value={editingSubStageDescription}
                                      onChange={event => setEditingSubStageDescription(event.target.value)}
                                      placeholder="Descrição da sub-etapa"
                                      className="min-h-[60px]"
                                    />
                                  ) : subStage.descricao ? (
                                    <p className="text-sm text-muted-foreground">{subStage.descricao}</p>
                                  ) : (
                                    <span className="text-sm text-muted-foreground">Sem descrição</span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-1.5">
                                    {editingSubStageId === subStage.id ? (
                                      <>
                                        <Button size="sm" variant="secondary" onClick={saveSubStageEdition}>
                                          <Save className="mr-1.5 h-4 w-4" />
                                        </Button>
                                        <Button size="sm" variant="ghost" onClick={cancelEditingSubStage}>
                                          <X className="mr-1.5 h-4 w-4" />
                                        </Button>
                                      </>
                                    ) : (
                                      <>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={() => startEditingSubStage(subStage.id, subStage.nome, subStage.descricao)}
                                        >
                                          <Pencil className="mr-1.5 h-4 w-4" />
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="text-destructive hover:text-destructive"
                                          onClick={() => handleDeleteSubStage(subStage.id, subStage.nome)}
                                        >
                                          <Trash2 className="mr-1.5 h-4 w-4" />
                                        </Button>
                                      </>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
