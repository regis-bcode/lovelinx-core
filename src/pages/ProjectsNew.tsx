import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Plus, 
  Search, 
  Filter, 
  MoreVertical,
  Calendar,
  DollarSign,
  FolderKanban,
  Edit,
  Trash2,
  Eye
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ProjectForm } from "@/components/projects/ProjectForm";
import { useProjects } from "@/hooks/useProjects";
import { Project, ProjectFormData } from "@/types/project";
import { toast } from "sonner";
import { useParams, useNavigate } from "react-router-dom";

export default function ProjectsNew() {
  const { projects, loading, createProject, updateProject, deleteProject, getProject } = useProjects();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const isEditing = !!id;
  const [searchTerm, setSearchTerm] = useState("");
  const [showForm, setShowForm] = useState(isEditing);
  const [editingProject, setEditingProject] = useState<Project | null>(
    isEditing && id ? getProject(id) : null
  );
  
  const filteredProjects = projects.filter(project =>
    project.nomeProjeto.toLowerCase().includes(searchTerm.toLowerCase()) ||
    project.cliente.toLowerCase().includes(searchTerm.toLowerCase()) ||
    project.codCliente.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateProject = () => {
    setEditingProject(null);
    setShowForm(true);
  };

  const handleEditProject = (project: Project) => {
    setEditingProject(project);
    setShowForm(true);
  };

  const handleSaveProject = (data: ProjectFormData) => {
    try {
      if (editingProject) {
        updateProject(editingProject.id, data);
        toast.success("Projeto atualizado com sucesso!");
        if (isEditing) {
          navigate('/projects-tap');
        }
      } else {
        createProject(data);
        toast.success("Projeto criado com sucesso!");
      }
      setShowForm(false);
      setEditingProject(null);
    } catch (error) {
      toast.error("Erro ao salvar projeto");
    }
  };

  const handleDeleteProject = (id: string) => {
    if (confirm("Tem certeza que deseja excluir este projeto?")) {
      deleteProject(id);
      toast.success("Projeto excluído com sucesso!");
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (date: string) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('pt-BR');
  };

  const getCriticalityColor = (criticidade: string) => {
    switch (criticidade) {
      case 'Crítica':
        return 'bg-destructive text-destructive-foreground';
      case 'Alta':
        return 'bg-warning text-warning-foreground';
      case 'Média':
        return 'bg-primary text-primary-foreground';
      case 'Baixa':
        return 'bg-success text-success-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-muted-foreground">Carregando projetos...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Projetos TAP</h1>
            <p className="text-muted-foreground">
              Gerencie todos os seus projetos TAP em um só lugar
            </p>
          </div>
          <Button onClick={handleCreateProject} className="bg-gradient-primary hover:opacity-90">
            <Plus className="mr-2 h-4 w-4" />
            Novo Projeto
          </Button>
        </div>

        {/* Filters and Search */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Buscar projetos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Filter className="mr-2 h-4 w-4" />
              Filtros
            </Button>
            <Button variant="outline" size="sm">
              Criticidade
            </Button>
            <Button variant="outline" size="sm">
              Cliente
            </Button>
          </div>
        </div>

        {/* Projects Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="shadow-soft">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Projetos</p>
                  <p className="text-2xl font-bold">{projects.length}</p>
                </div>
                <FolderKanban className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-soft">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Valor Total</p>
                  <p className="text-2xl font-bold">
                    {formatCurrency(projects.reduce((sum, p) => sum + p.valorProjeto, 0))}
                  </p>
                </div>
                <DollarSign className="h-8 w-8 text-success" />
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-soft">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Projetos Críticos</p>
                  <p className="text-2xl font-bold">
                    {projects.filter(p => p.criticidade === 'Crítica').length}
                  </p>
                </div>
                <div className="h-8 w-8 bg-destructive rounded-full"></div>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-soft">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Em Perda</p>
                  <p className="text-2xl font-bold">
                    {projects.filter(p => p.projetoEmPerda).length}
                  </p>
                </div>
                <div className="h-8 w-8 bg-destructive rounded-full"></div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Projects Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredProjects.map((project) => (
            <Card key={project.id} className="shadow-soft hover:shadow-medium transition-all duration-200">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{project.nomeProjeto}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {project.codCliente} - {project.cliente}
                    </p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => navigate(`/projects-tap/${project.id}`)}>
                        <Eye className="mr-2 h-4 w-4" />
                        Ver Detalhes
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleEditProject(project)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteProject(project.id)}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  <Badge className={getCriticalityColor(project.criticidade)} variant="secondary">
                    {project.criticidade}
                  </Badge>
                  {project.projetoEmPerda && (
                    <Badge variant="destructive">Em Perda</Badge>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Valor do Projeto</span>
                    <span className="font-medium">{formatCurrency(project.valorProjeto)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Receita Atual</span>
                    <span className="font-medium">{formatCurrency(project.receitaAtual)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">MRR</span>
                    <span className="font-medium">{formatCurrency(project.mrr)}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm pt-2 border-t">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>Início: {formatDate(project.dataInicio)}</span>
                  </div>
                  <div className="text-muted-foreground">
                    <span>Go Live: {formatDate(project.goLivePrevisto)}</span>
                  </div>
                </div>

                <div className="text-sm">
                  <div className="text-muted-foreground">
                    <strong>GPP:</strong> {project.gpp}
                  </div>
                  <div className="text-muted-foreground">
                    <strong>Coordenador:</strong> {project.coordenador}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredProjects.length === 0 && (
          <Card className="p-8 text-center">
            <CardContent>
              <FolderKanban className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhum projeto encontrado</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm ? 'Nenhum projeto corresponde aos critérios de busca.' : 'Comece criando seu primeiro projeto TAP.'}
              </p>
              <Button onClick={handleCreateProject} className="bg-gradient-primary">
                <Plus className="mr-2 h-4 w-4" />
                Criar Primeiro Projeto
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Project Form Dialog */}
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
            <ProjectForm
              project={editingProject}
              onSave={handleSaveProject}
              onCancel={() => setShowForm(false)}
            />
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}