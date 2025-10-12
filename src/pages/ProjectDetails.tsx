import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Edit, Calendar, DollarSign, FileText, Users, AlertTriangle, ClipboardList, MessageCircle, BarChart, FileX, RotateCw, FolderOpen } from "lucide-react";
import { useProjects } from "@/hooks/useProjects";
import { ProjectTabs } from "@/components/projects/ProjectTabs";
import { StakeholdersList } from "@/components/projects/StakeholdersList";
import { RisksList } from "@/components/projects/RisksList";
import { CommunicationPlanList } from "@/components/projects/CommunicationPlanList";
import { TaskManagementSystem } from "@/components/projects/TaskManagementSystem";
import { CustomFieldListManager } from "@/components/projects/CustomFieldListManager";
import { TimeManagement } from "@/components/projects/TimeManagement";
import { supabase } from "@/integrations/supabase/client";
import { Project } from "@/types/project";


export default function ProjectDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getProject, updateProject, loading: projectsLoading, refreshProjects } = useProjects();

  const [fetchedProject, setFetchedProject] = useState<Project | null>(null);
  const [isFetchingProject, setIsFetchingProject] = useState(false);
  const projectFromStore = id ? getProject(id) : null;
  const project = projectFromStore ?? fetchedProject;

  useEffect(() => {
    if (!id) return;
    if (projectFromStore || fetchedProject || isFetchingProject) return;

    const fetchProject = async () => {
      try {
        setIsFetchingProject(true);
        const { data, error } = await supabase
          .from("projects")
          .select("*")
          .eq("id", id)
          .maybeSingle<Project>();

        if (error) throw error;
        if (data) {
          setFetchedProject({
            ...data,
            criticidade: data.criticidade as Project["criticidade"],
          });
          // Recarrega o cache local para manter os hooks sincronizados
          refreshProjects();
        }
      } catch (error) {
        console.error("Erro ao buscar projeto diretamente:", error);
      } finally {
        setIsFetchingProject(false);
      }
    };

    fetchProject();
  }, [id, projectFromStore, fetchedProject, isFetchingProject, projectsLoading, refreshProjects]);

  useEffect(() => {
    if (projectFromStore) {
      setFetchedProject(projectFromStore);
    }
  }, [projectFromStore]);


  if (projectsLoading || isFetchingProject) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex items-center gap-2 text-muted-foreground">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <span>Carregando projeto...</span>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!project) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-2">Projeto não encontrado</h2>
            <p className="text-muted-foreground mb-4">O projeto que você está procurando não existe.</p>
            <Button onClick={() => navigate('/projects-tap')}>
              Voltar para Projetos
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const getCriticalityBadge = (criticality: string) => {
    switch (criticality) {
      case 'Crítica': return 'destructive';
      case 'Alta': return 'secondary';
      case 'Média': return 'outline';
      case 'Baixa': return 'default';
      default: return 'outline';
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/projects-tap')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <div>
              <h1 className="text-3xl font-bold">{project.nome_projeto}</h1>
              <p className="text-muted-foreground">
                Cliente: {project.cliente} | Código: {project.cod_cliente}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={getCriticalityBadge(project.criticidade)}>
              {project.criticidade}
            </Badge>
            <Button onClick={() => navigate(`/projects-tap/${id}/edit`)}>
              <Edit className="h-4 w-4 mr-2" />
              Editar
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="tasks" className="w-full">
          <TabsList className="grid w-full grid-cols-4 lg:grid-cols-9 gap-1 h-auto">
            <TabsTrigger value="tap" className="text-xs p-2">
              <FileText className="h-3 w-3 mr-1" />
              <span className="hidden sm:inline">TAP</span>
            </TabsTrigger>
            <TabsTrigger value="stakeholders" className="text-xs p-2">
              <Users className="h-3 w-3 mr-1" />
              <span className="hidden sm:inline">Stakeholders</span>
            </TabsTrigger>
            <TabsTrigger value="tasks" className="text-xs p-2">
              <ClipboardList className="h-3 w-3 mr-1" />
              <span className="hidden sm:inline">Tarefas</span>
            </TabsTrigger>
            <TabsTrigger value="time" className="text-xs p-2">
              <Calendar className="h-3 w-3 mr-1" />
              <span className="hidden sm:inline">Tempo</span>
            </TabsTrigger>
            <TabsTrigger value="communication" className="text-xs p-2">
              <MessageCircle className="h-3 w-3 mr-1" />
              <span className="hidden sm:inline">Comunicação</span>
            </TabsTrigger>
            <TabsTrigger value="risks" className="text-xs p-2">
              <AlertTriangle className="h-3 w-3 mr-1" />
              <span className="hidden sm:inline">Riscos</span>
            </TabsTrigger>
            <TabsTrigger value="gaps" className="text-xs p-2">
              <FileX className="h-3 w-3 mr-1" />
              <span className="hidden sm:inline">Gaps</span>
            </TabsTrigger>
            <TabsTrigger value="turnover" className="text-xs p-2">
              <RotateCw className="h-3 w-3 mr-1" />
              <span className="hidden sm:inline">Virada</span>
            </TabsTrigger>
            <TabsTrigger value="documents" className="text-xs p-2">
              <FolderOpen className="h-3 w-3 mr-1" />
              <span className="hidden sm:inline">Documentos</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tap" className="space-y-4">
            <ProjectTabs projectId={project.id} />
          </TabsContent>

          <TabsContent value="risks" className="space-y-4">
            <RisksList projectId={project.id} />
          </TabsContent>

          <TabsContent value="stakeholders" className="space-y-4">
            <StakeholdersList projectId={project.id} />
          </TabsContent>

          <TabsContent value="tasks" className="space-y-4">
            <TaskManagementSystem projectId={project.id} projectClient={project.cliente ?? undefined} />
          </TabsContent>

          <TabsContent value="time" className="space-y-4">
            <TimeManagement projectId={project.id} />
          </TabsContent>

          <TabsContent value="communication" className="space-y-4">
            <CommunicationPlanList projectId={project.id} />
          </TabsContent>

          <TabsContent value="gaps" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Gaps e Mudanças</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Funcionalidade de gaps e mudanças será implementada em breve.</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="turnover" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Plano de Virada</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Funcionalidade de plano de virada será implementada em breve.</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="documents" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Gestão de Documentos</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Funcionalidade de gestão de documentos será implementada em breve.</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}