import { useEffect, useState, type ReactNode } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { ScrollArea } from "@/components/ui/scroll-area";


export default function ProjectDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getProject, loading: projectsLoading, refreshProjects } = useProjects();

  const [fetchedProject, setFetchedProject] = useState<Project | null>(null);
  const [isFetchingProject, setIsFetchingProject] = useState(false);
  const [activeTab, setActiveTab] = useState("tap");
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
    scrollBarOrientation?: "vertical" | "horizontal" | "both";
    disableScrollArea?: boolean;
  };

  const tabItems: TabItem[] = [
    {
      value: "tap",
      label: "TAP",
      icon: FileText,
      render: () => <ProjectTabs projectId={project.id} />,
    },
    {
      value: "stakeholders",
      label: "Stakeholders",
      icon: Users,
      render: () => <StakeholdersList projectId={project.id} />,
    },
    {
      value: "tasks",
      label: "Tarefas",
      icon: ClipboardList,
      render: () => (
        <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden">
          <TaskManagementSystem projectId={project.id} projectClient={project.cliente ?? undefined} />
        </div>
      ),
      disableScrollArea: true,
    },
    {
      value: "time",
      label: "Tempo",
      icon: Calendar,
      render: () => <TimeManagement projectId={project.id} />,
    },
    {
      value: "communication",
      label: "Comunicação",
      icon: MessageCircle,
      render: () => <CommunicationPlanList projectId={project.id} />,
    },
    {
      value: "risks",
      label: "Riscos",
      icon: AlertTriangle,
      render: () => <RisksList projectId={project.id} />,
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
    },
  ];

  const topNavTriggerClass =
    "flex h-11 w-full flex-1 items-center justify-center gap-2 rounded-full border border-white/30 px-5 text-xs font-semibold uppercase tracking-wide transition-all duration-200 focus-visible:outline-none sm:text-sm";
  const activeTopNavTriggerClass =
    "bg-white/25 text-white shadow-[0_20px_40px_-20px_rgba(15,65,120,0.55)] border-white";
  const inactiveTopNavTriggerClass =
    "bg-white/10 text-white/80 hover:border-white/60 hover:bg-white/20 hover:text-white focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-0";

  const projectTopNav = (
    <div className="relative w-full overflow-hidden rounded-[44px] border border-white/25 bg-white/10 p-4 text-white shadow-[0_30px_80px_-40px_rgba(9,30,70,0.9)] backdrop-blur-xl dark:border-white/10 dark:bg-background/60">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[linear-gradient(140deg,rgba(20,54,110,0.95),rgba(41,163,229,0.7))] opacity-90" />
        <div className="absolute -left-24 top-[-30%] h-48 w-48 rounded-full bg-[#29A3E5]/45 blur-3xl" />
        <div className="absolute right-[-12%] top-1/2 h-40 w-40 -translate-y-1/2 rounded-full bg-white/25 blur-3xl" />
        <div className="absolute bottom-[-35%] left-1/3 h-44 w-44 rounded-full bg-[#FFB56B]/40 blur-[110px]" />
      </div>
      <ScrollArea
        className="relative z-10 pb-3"
        scrollBarOrientation="horizontal"
        type="always"
      >
        <div className="grid min-w-full grid-flow-col auto-cols-[minmax(150px,1fr)] items-center gap-2">
          {tabItems.map((tab) => {
            const isActive = tab.value === activeTab;
            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => setActiveTab(tab.value)}
                className={cn(
                  topNavTriggerClass,
                  "min-w-[150px]",
                  isActive ? activeTopNavTriggerClass : inactiveTopNavTriggerClass
                )}
              >
                <tab.icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );

  return (
    <DashboardLayout topNav={projectTopNav}>
      <div className="flex min-h-[calc(100vh-220px)] min-w-0 flex-col gap-6">
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

        <div className="flex flex-1 min-h-0 min-w-0 overflow-hidden rounded-r-3xl border border-border/40 bg-background/80 shadow-sm">
          <div className="flex h-full flex-1 min-h-0 min-w-0 flex-col">
            <div className="flex-1 min-h-0 min-w-0">
              {tabItems.map((tab) =>
                tab.value === activeTab ? (
                  tab.disableScrollArea ? (
                    <div
                      key={tab.value}
                      className="mt-0 flex h-full min-h-0 min-w-0 flex-col gap-4 p-6"
                    >
                      {tab.render()}
                    </div>
                  ) : (
                    <ScrollArea
                      key={tab.value}
                      className="mt-0 h-full"
                      scrollBarOrientation={tab.scrollBarOrientation ?? "vertical"}
                      type="scroll"
                    >
                      <div className="flex min-h-full flex-col gap-4 p-6">
                        {tab.render()}
                      </div>
                    </ScrollArea>
                  )
                ) : null
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
