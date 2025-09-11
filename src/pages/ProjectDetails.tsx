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

export default function ProjectDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getProject, updateProject } = useProjects();
  
  const project = id ? getProject(id) : null;

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

        {/* Project Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Valor do Projeto</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                R$ {project.valor_projeto?.toLocaleString() || '0'}
              </div>
              <p className="text-xs text-muted-foreground">
                Receita Atual: R$ {project.receita_atual?.toLocaleString() || '0'}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Margem Atual</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {project.margem_atual_percent?.toFixed(1) || '0'}%
              </div>
              <p className="text-xs text-muted-foreground">
                R$ {project.margem_atual_reais?.toLocaleString() || '0'}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Go Live</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {project.go_live_previsto ? new Date(project.go_live_previsto).toLocaleDateString('pt-BR') : 'N/A'}
              </div>
              <p className="text-xs text-muted-foreground">
                Início: {project.data_inicio ? new Date(project.data_inicio).toLocaleDateString('pt-BR') : 'N/A'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="tap" className="w-full">
          <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8 gap-1 h-auto">
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
            <ProjectTabs 
              project={project} 
              onSave={async (data) => {
                try {
                  await updateProject(project.id, data);
                  console.log('TAP atualizada com sucesso');
                } catch (error) {
                  console.error('Erro ao salvar TAP:', error);
                }
              }} 
            />
          </TabsContent>

          <TabsContent value="risks" className="space-y-4">
            <RisksList projectId={project.id} />
          </TabsContent>

          <TabsContent value="stakeholders" className="space-y-4">
            <StakeholdersList projectId={project.id} />
          </TabsContent>

          <TabsContent value="tasks" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Tarefas do Projeto</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Funcionalidade de tarefas será implementada em breve.</p>
              </CardContent>
            </Card>
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