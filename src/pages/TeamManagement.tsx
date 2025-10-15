import { useEffect, useState, useMemo } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { DateInput } from "@/components/ui/date-input";
import { Textarea } from "@/components/ui/textarea";
import { useProjectAllocations } from "@/hooks/useProjectAllocations";
import { useProjects } from "@/hooks/useProjects";
import { useTAP } from "@/hooks/useTAP";
import { useUsers } from "@/hooks/useUsers";
import { ProjectAllocationFormData, FUNCOES_PROJETO } from "@/types/project-allocation";
import { Plus, Edit, Trash2, Users, Filter, X } from "lucide-react";
import { format } from "date-fns";

export default function TeamManagement() {
  const [showDialog, setShowDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<ProjectAllocationFormData>>({
    status_participacao: 'Ativo',
    valor_hora: 0,
  });

  // Filtros
  const [filterProject, setFilterProject] = useState<string>("");
  const [filterTap, setFilterTap] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("");

  const { projects } = useProjects();
  const { tap } = useTAP();
  const { users } = useUsers();
  
  // Converter TAP único para array para compatibilidade
  const taps = tap ? [tap] : [];
  const { allocations, loading, createAllocation, updateAllocation, deleteAllocation } = useProjectAllocations();

  // SEO
  useEffect(() => {
    document.title = "Gestão de Equipes | Sistema de Gestão de Projetos";
    const desc = "Gerencie alocações de membros da equipe em projetos e TAPs";
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "description");
      document.head.appendChild(meta);
    }
    meta.setAttribute("content", desc);
  }, []);

  // Filtrar TAPs baseado no projeto selecionado
  const filteredTaps = useMemo(() => {
    if (!formData.project_id) return taps;
    return taps.filter(tap => tap.project_id === formData.project_id);
  }, [formData.project_id, taps]);

  // Filtrar usuários que têm cliente associado
  const usersWithClient = useMemo(() => {
    return users.filter(u => u.client_id);
  }, [users]);

  // Aplicar filtros às alocações
  const filteredAllocations = useMemo(() => {
    return allocations.filter(allocation => {
      if (filterProject && allocation.project_id !== filterProject) return false;
      if (filterTap && allocation.tap_id !== filterTap) return false;
      if (filterStatus && allocation.status_participacao !== filterStatus) return false;
      return true;
    });
  }, [allocations, filterProject, filterTap, filterStatus]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.project_id || !formData.allocated_user_id || !formData.funcao_projeto || !formData.data_inicio) {
      return;
    }

    const success = editingId
      ? await updateAllocation(editingId, formData)
      : await createAllocation(formData as ProjectAllocationFormData);

    if (success) {
      setShowDialog(false);
      resetForm();
    }
  };

  const handleEdit = (allocation: any) => {
    setEditingId(allocation.id);
    setFormData({
      project_id: allocation.project_id,
      tap_id: allocation.tap_id,
      allocated_user_id: allocation.allocated_user_id,
      funcao_projeto: allocation.funcao_projeto,
      valor_hora: allocation.valor_hora,
      data_inicio: allocation.data_inicio,
      data_saida: allocation.data_saida,
      status_participacao: allocation.status_participacao,
      observacoes: allocation.observacoes,
    });
    setShowDialog(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Tem certeza que deseja remover esta alocação?")) {
      await deleteAllocation(id);
    }
  };

  const resetForm = () => {
    setFormData({
      status_participacao: 'Ativo',
      valor_hora: 0,
    });
    setEditingId(null);
  };

  const clearFilters = () => {
    setFilterProject("");
    setFilterTap("");
    setFilterStatus("");
  };

  // Agrupar por Projeto → TAP
  const groupedAllocations = useMemo(() => {
    const groups: Record<string, Record<string, typeof filteredAllocations>> = {};
    
    filteredAllocations.forEach(allocation => {
      const projectKey = allocation.project_id;
      const tapKey = allocation.tap_id || 'sem-tap';
      
      if (!groups[projectKey]) {
        groups[projectKey] = {};
      }
      if (!groups[projectKey][tapKey]) {
        groups[projectKey][tapKey] = [];
      }
      groups[projectKey][tapKey].push(allocation);
    });
    
    return groups;
  }, [filteredAllocations]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Users className="h-8 w-8" />
              Gestão de Equipes
            </h1>
            <p className="text-muted-foreground mt-1">
              Gerencie alocações de membros em projetos e TAPs
            </p>
          </div>
          <Dialog open={showDialog} onOpenChange={setShowDialog}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="mr-2 h-4 w-4" />
                Adicionar Membro à Equipe
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle>
                    {editingId ? "Editar Alocação" : "Nova Alocação de Equipe"}
                  </DialogTitle>
                  <DialogDescription>
                    Preencha os dados para alocar um membro à equipe do projeto
                  </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="project">Projeto *</Label>
                    <Select
                      value={formData.project_id}
                      onValueChange={(value) => setFormData({ ...formData, project_id: value, tap_id: undefined })}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um projeto" />
                      </SelectTrigger>
                      <SelectContent className="z-50 bg-popover">
                        {projects.map((project) => (
                          <SelectItem key={project.id} value={project.id}>
                            {project.nome_projeto} - {project.cliente}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="tap">TAP (opcional)</Label>
                    <Select
                      value={formData.tap_id}
                      onValueChange={(value) => setFormData({ ...formData, tap_id: value })}
                      disabled={!formData.project_id}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma TAP" />
                      </SelectTrigger>
                      <SelectContent className="z-50 bg-popover">
                        {filteredTaps.map((tap) => (
                          <SelectItem key={tap.id} value={tap.id}>
                            {tap.nome_projeto}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="user">Analista (Usuário) *</Label>
                    <Select
                      value={formData.allocated_user_id}
                      onValueChange={(value) => setFormData({ ...formData, allocated_user_id: value })}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um usuário" />
                      </SelectTrigger>
                      <SelectContent className="z-50 bg-popover">
                        {usersWithClient.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.nome_completo} - {user.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Apenas usuários com cliente associado
                    </p>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="funcao">Função no Projeto *</Label>
                    <Select
                      value={formData.funcao_projeto}
                      onValueChange={(value) => setFormData({ ...formData, funcao_projeto: value })}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma função" />
                      </SelectTrigger>
                      <SelectContent className="z-50 bg-popover">
                        {FUNCOES_PROJETO.map((funcao) => (
                          <SelectItem key={funcao} value={funcao}>
                            {funcao}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="valor_hora">Valor Hora (R$) *</Label>
                    <CurrencyInput
                      id="valor_hora"
                      value={formData.valor_hora ?? ''}
                      onChange={(value) => setFormData({ ...formData, valor_hora: value ? Number(value) : undefined })}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="grid gap-2">
                      <Label htmlFor="data_inicio">Data de Início *</Label>
                      <DateInput
                        id="data_inicio"
                        value={formData.data_inicio}
                        onChange={(value) => setFormData({ ...formData, data_inicio: value })}
                        required
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="data_saida">Data de Saída</Label>
                      <DateInput
                        id="data_saida"
                        value={formData.data_saida || ''}
                        onChange={(value) => setFormData({ ...formData, data_saida: value })}
                      />
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="status">Status *</Label>
                    <Select
                      value={formData.status_participacao}
                      onValueChange={(value: 'Ativo' | 'Inativo') => setFormData({ ...formData, status_participacao: value })}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="z-50 bg-popover">
                        <SelectItem value="Ativo">Ativo</SelectItem>
                        <SelectItem value="Inativo">Inativo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="observacoes">Observações</Label>
                    <Textarea
                      id="observacoes"
                      value={formData.observacoes || ''}
                      onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                      rows={3}
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit">
                    {editingId ? "Atualizar" : "Adicionar"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </header>

        {/* Filtros */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                <CardTitle>Filtros</CardTitle>
              </div>
              {(filterProject || filterTap || filterStatus) && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="mr-2 h-4 w-4" />
                  Limpar Filtros
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Projeto</Label>
                <Select value={filterProject || "all"} onValueChange={(value) => setFilterProject(value === "all" ? "" : value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os projetos" />
                  </SelectTrigger>
                  <SelectContent className="z-50 bg-popover">
                    <SelectItem value="all">Todos</SelectItem>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.nome_projeto}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>TAP</Label>
                <Select value={filterTap || "all"} onValueChange={(value) => setFilterTap(value === "all" ? "" : value)} disabled={!filterProject}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas as TAPs" />
                  </SelectTrigger>
                  <SelectContent className="z-50 bg-popover">
                    <SelectItem value="all">Todas</SelectItem>
                    {taps
                      .filter(tap => !filterProject || tap.project_id === filterProject)
                      .map((tap) => (
                        <SelectItem key={tap.id} value={tap.id}>
                          {tap.nome_projeto}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={filterStatus || "all"} onValueChange={(value) => setFilterStatus(value === "all" ? "" : value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os status" />
                  </SelectTrigger>
                  <SelectContent className="z-50 bg-popover">
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="Ativo">Ativo</SelectItem>
                    <SelectItem value="Inativo">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lista de Alocações Agrupadas */}
        {loading ? (
          <Card>
            <CardContent className="py-8">
              <p className="text-center text-muted-foreground">Carregando...</p>
            </CardContent>
          </Card>
        ) : Object.keys(groupedAllocations).length === 0 ? (
          <Card>
            <CardContent className="py-8">
              <p className="text-center text-muted-foreground">
                Nenhuma alocação encontrada. Adicione membros à equipe dos seus projetos.
              </p>
            </CardContent>
          </Card>
        ) : (
          Object.entries(groupedAllocations).map(([projectId, tapGroups]) => {
            const project = projects.find(p => p.id === projectId);
            
            return (
              <Card key={projectId} className="overflow-hidden">
                <CardHeader className="bg-muted/50">
                  <CardTitle className="text-xl">
                    {project?.nome_projeto || 'Projeto não encontrado'}
                  </CardTitle>
                  <CardDescription>
                    Cliente: {project?.cliente || 'N/A'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  {Object.entries(tapGroups).map(([tapKey, members]) => {
                    const tap = tapKey !== 'sem-tap' ? taps.find(t => t.id === tapKey) : null;
                    
                    return (
                      <div key={tapKey} className="border-t first:border-t-0">
                        {tap && (
                          <div className="bg-accent/50 px-6 py-3">
                            <h3 className="font-medium text-sm">
                              TAP: {tap.nome_projeto}
                            </h3>
                          </div>
                        )}
                        <div className="overflow-x-auto">
                          <Table className="min-w-[720px] w-full">
                            <TableHeader>
                              <TableRow>
                                <TableHead>Membro</TableHead>
                                <TableHead>Cliente</TableHead>
                                <TableHead>Função</TableHead>
                                <TableHead>Valor/Hora</TableHead>
                                <TableHead>Período</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Ações</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {members.map((allocation) => (
                                <TableRow key={allocation.id}>
                                  <TableCell>
                                    <div>
                                      <div className="font-medium">{allocation.user?.nome_completo}</div>
                                      <div className="text-sm text-muted-foreground">{allocation.user?.email}</div>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    {allocation.client?.nome || 'N/A'}
                                  </TableCell>
                                  <TableCell>{allocation.funcao_projeto}</TableCell>
                                  <TableCell>R$ {allocation.valor_hora.toFixed(2)}</TableCell>
                                  <TableCell>
                                    <div className="text-sm">
                                      <div>{format(new Date(allocation.data_inicio), 'dd/MM/yyyy')}</div>
                                      {allocation.data_saida && (
                                        <div className="text-muted-foreground">
                                          até {format(new Date(allocation.data_saida), 'dd/MM/yyyy')}
                                        </div>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant={allocation.status_participacao === 'Ativo' ? 'default' : 'secondary'}>
                                      {allocation.status_participacao}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <div className="flex justify-end gap-2">
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleEdit(allocation)}
                                      >
                                        <Edit className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleDelete(allocation.id)}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </DashboardLayout>
  );
}
