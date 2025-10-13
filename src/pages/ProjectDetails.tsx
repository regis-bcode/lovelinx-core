import { useEffect, useState, type ReactNode } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Edit, Calendar, FileText, Users, AlertTriangle, ClipboardList, MessageCircle, FileX, RotateCw, FolderOpen, type LucideIcon } from "lucide-react";
import { useProjects } from "@/hooks/useProjects";
import { ProjectTabs } from "@/components/projects/ProjectTabs";
import { StakeholdersList } from "@/components/projects/StakeholdersList";
import { RisksList } from "@/components/projects/RisksList";
import { CommunicationPlanList } from "@/components/projects/CommunicationPlanList";
import { TaskManagementSystem } from "@/components/projects/TaskManagementSystem";
import { TimeManagement } from "@/components/projects/TimeManagement";
import { supabase } from "@/integrations/supabase/client";
import { Project } from "@/types/project";
import { cn } from "@/lib/utils";


export default function ProjectDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getProject, loading: projectsLoading, refreshProjects } = useProjects();

  const [fetchedProject, setFetchedProject] = useState<Project | null>(null);
  const [isFetchingProject, setIsFetchingProject] = useState(false);
  const [activeTab, setActiveTab] = useState("tasks");
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
      case "Crítica":
        return "destructive";
      case "Alta":
        return "secondary";
      case "Média":
        return "outline";
      case "Baixa":
        return "default";
      default:
        return "outline";
    }
  };

  type TabItem = {
    value: string;
    label: string;
    icon: LucideIcon;
    render: () => ReactNode;
    tabContentClassName?: string;
  };

  const tabItems: TabItem[] = [
    {
      value: "tap",
      label: "TAP",
      icon: FileText,
      render: () => <ProjectTabs projectId={project.id} />,
      tabContentClassName: "overflow-y-auto",
    },
    {
      value: "stakeholders",
      label: "Stakeholders",
      icon: Users,
      render: () => <StakeholdersList projectId={project.id} />,
      tabContentClassName: "overflow-y-auto",
    },
    {
      value: "tasks",
      label: "Tarefas",
      icon: ClipboardList,
      render: () => (
        <div className="flex h-full flex-col overflow-hidden">
          <TaskManagementSystem projectId={project.id} projectClient={project.cliente ?? undefined} />
        </div>
      ),
      tabContentClassName: "overflow-hidden",
    },
    {
      value: "time",
      label: "Tempo",
      icon: Calendar,
      render: () => <TimeManagement projectId={project.id} />,
      tabContentClassName: "overflow-y-auto",
    },
    {
      value: "communication",
      label: "Comunicação",
      icon: MessageCircle,
      render: () => <CommunicationPlanList projectId={project.id} />,
      tabContentClassName: "overflow-y-auto",
    },
    {
      value: "risks",
      label: "Riscos",
      icon: AlertTriangle,
      render: () => <RisksList projectId={project.id} />,
      tabContentClassName: "overflow-y-auto",
    },
    {
      value: "gaps",
      label: "Gaps",
      icon: FileX,
      render: () => (
        <Card>
          <CardHeader>
            <CardTitle>Gaps e Mudanças</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Funcionalidade de gaps e mudanças será implementada em breve.</p>
          </CardContent>
        </Card>
      ),
      tabContentClassName: "overflow-y-auto",
    },
    {
      value: "turnover",
      label: "Virada",
      icon: RotateCw,
      render: () => (
        <Card>
          <CardHeader>
            <CardTitle>Plano de Virada</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Funcionalidade de plano de virada será implementada em breve.</p>
          </CardContent>
        </Card>
      ),
      tabContentClassName: "overflow-y-auto",
    },
    {
      value: "documents",
      label: "Documentos",
      icon: FolderOpen,
      render: () => (
        <Card>
          <CardHeader>
            <CardTitle>Gestão de Documentos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Funcionalidade de gestão de documentos será implementada em breve.</p>
          </CardContent>
        </Card>
      ),
      tabContentClassName: "overflow-y-auto",
    },
  ];

  const topNavTriggerClass =
    "inline-flex h-11 flex-shrink-0 items-center justify-center gap-2 rounded-full border border-white/30 bg-white/10 px-5 text-xs font-semibold uppercase tracking-wide text-white/80 transition-all duration-200 hover:border-white/60 hover:bg-white/20 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-0 data-[state=active]:border-white data-[state=active]:bg-white/25 data-[state=active]:text-white data-[state=active]:shadow-[0_20px_40px_-20px_rgba(15,65,120,0.55)] sm:text-sm";

  const projectTopNav = (
    <div className="relative overflow-hidden rounded-[44px] border border-white/25 bg-white/10 p-4 text-white shadow-[0_30px_80px_-40px_rgba(9,30,70,0.9)] backdrop-blur-xl dark:border-white/10 dark:bg-background/60">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[linear-gradient(140deg,rgba(20,54,110,0.95),rgba(41,163,229,0.7))] opacity-90" />
        <div className="absolute -left-24 top-[-30%] h-48 w-48 rounded-full bg-[#29A3E5]/45 blur-3xl" />
        <div className="absolute right-[-12%] top-1/2 h-40 w-40 -translate-y-1/2 rounded-full bg-white/25 blur-3xl" />
        <div className="absolute bottom-[-35%] left-1/3 h-44 w-44 rounded-full bg-[#FFB56B]/40 blur-[110px]" />
      </div>
      <div className="relative z-10 overflow-x-auto pb-1">
        <TabsList className="flex w-full min-w-max flex-nowrap items-center gap-2 bg-transparent p-0">
          {tabItems.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value} className={topNavTriggerClass}>
              <tab.icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>
      </div>
    </div>
  );

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab}>
      <DashboardLayout topNav={projectTopNav}>
        <div className="flex min-h-[calc(100vh-220px)] flex-col gap-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Button variant="outline" size="sm" onClick={() => navigate("/projects-tap")}>
                <ArrowLeft className="mr-2 h-4 w-4" />
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
              <Badge variant={getCriticalityBadge(project.criticidade)}>{project.criticidade}</Badge>
              <Button onClick={() => navigate(`/projects-tap/${id}/edit`)}>
                <Edit className="mr-2 h-4 w-4" />
                Editar
              </Button>
            </div>
          </div>

          <div className="flex flex-1 min-h-0 overflow-hidden rounded-r-3xl border border-border/40 bg-background/80 shadow-sm">
            <div className="flex h-full flex-1 min-h-0 flex-col">
              <div className="flex-1 min-h-0">
                {tabItems.map((tab) => (
                  <TabsContent
                    key={tab.value}
                    value={tab.value}
                    className={cn(
                      "mt-0 flex h-full flex-col gap-4 p-6",
                      tab.tabContentClassName ?? "overflow-y-auto",
                    )}
                  >
                    {tab.render()}
                  </TabsContent>
                ))}
              </div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    </Tabs>
  );
}