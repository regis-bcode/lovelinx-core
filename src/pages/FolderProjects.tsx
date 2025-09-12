import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Plus, 
  Search, 
  Filter, 
  MoreVertical,
  FileText,
  ArrowLeft,
  Settings,
  Calendar,
  DollarSign,
  Users
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useProjects } from "@/hooks/useProjects";
import { useFolders } from "@/hooks/useFolders";
import { useWorkspaces } from "@/hooks/useWorkspaces";
import { useToast } from "@/hooks/use-toast";
import { ProjectSummaryCards } from "@/components/projects/ProjectSummaryCards";

export default function FolderProjects() {
  const { workspaceId, folderId } = useParams<{ workspaceId: string; folderId: string }>();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");

  const { projects, loading, deleteProject } = useProjects(folderId);
  const { getFolder } = useFolders(workspaceId);
  const { getWorkspace } = useWorkspaces();
  const { toast } = useToast();

  const workspace = workspaceId ? getWorkspace(workspaceId) : null;
  const folder = folderId ? getFolder(folderId) : null;

  const filteredProjects = projects.filter(project =>
    project.nome_projeto?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    project.cliente?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    project.gpp?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleProjectClick = (projectId: string) => {
    navigate(`/projects-tap/${projectId}`);
  };

  const handleDeleteProject = async (projectId: string) => {
    if (confirm("Tem certeza que deseja excluir este projeto?")) {
      try {
        const success = await deleteProject(projectId);
        if (success) {
          toast({
            title: "Projeto excluído",
            description: "O projeto foi excluído com sucesso.",
          });
        }
      } catch (error: any) {
        toast({
          title: "Erro ao excluir",
          description: error.message || "Erro ao excluir o projeto.",
          variant: "destructive",
        });
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'ativo':
        return 'bg-green-100 text-green-800';
      case 'concluído':
        return 'bg-blue-100 text-blue-800';
      case 'pausado':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
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
            <div className="flex items-center gap-2 mb-2">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigate(`/workspaces/${workspaceId}/folders`)}
                className="p-1"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <span>Workspaces</span>
                <span>/</span>
                <span>{workspace?.nome}</span>
                <span>/</span>
                <span className="text-foreground">{folder?.nome}</span>
              </div>
            </div>
            <h1 className="text-3xl font-bold text-foreground">Projetos TAP</h1>
            <p className="text-muted-foreground">
              Gerencie os projetos TAP desta pasta
            </p>
          </div>
          
          <Button 
            className="bg-gradient-primary hover:opacity-90"
            onClick={() => navigate(`/projects-tap/new?folderId=${folderId}`)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Novo Projeto TAP
          </Button>
        </div>

        <ProjectSummaryCards projects={projects} />

        {/* Search and Filters */}
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
          <Button variant="outline" size="sm">
            <Filter className="mr-2 h-4 w-4" />
            Filtros
          </Button>
        </div>

        {/* Projects Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project) => (
            <Card 
              key={project.id} 
              className="shadow-soft hover:shadow-medium transition-all duration-200 cursor-pointer group"
              onClick={() => handleProjectClick(project.id)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg group-hover:text-primary transition-colors mb-2">
                      {project.nome_projeto || 'Projeto sem nome'}
                    </CardTitle>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Badge variant="secondary" className="text-xs">
                        {project.gpp || 'GPP-000'}
                      </Badge>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleProjectClick(project.id); }}>
                        <FileText className="mr-2 h-4 w-4" />
                        Abrir
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/projects-tap/${project.id}/edit`); }}>
                        <Settings className="mr-2 h-4 w-4" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className="text-destructive"
                        onClick={(e) => { e.stopPropagation(); handleDeleteProject(project.id); }}
                      >
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              
              <CardContent className="pt-0 space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Cliente:</span>
                    <span className="font-medium">{project.cliente || 'Não informado'}</span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Data:</span>
                    <span>{project.data ? new Date(project.data).toLocaleDateString("pt-BR") : 'Não informado'}</span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Valor:</span>
                    <span className="font-medium">
                      {project.valor_projeto 
                        ? `R$ ${Number(project.valor_projeto).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` 
                        : 'Não informado'
                      }
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between pt-2 border-t">
                  <span className="text-sm text-muted-foreground">Criado em</span>
                  <span className="text-sm">{new Date(project.created_at).toLocaleDateString("pt-BR")}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredProjects.length === 0 && !loading && (
          <div className="text-center py-12">
            <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">Nenhum projeto encontrado</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm ? "Tente buscar com outros termos." : "Crie seu primeiro projeto TAP para começar."}
            </p>
            {!searchTerm && (
              <Button onClick={() => navigate(`/projects-tap/new?folderId=${folderId}`)}>
                <Plus className="mr-2 h-4 w-4" />
                Criar Projeto TAP
              </Button>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}