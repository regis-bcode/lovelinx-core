import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
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
import { GapManagement } from "@/components/projects/GapManagement";
import { supabase } from "@/integrations/supabase/client";
import { Project } from "@/types/project";
import { cn } from "@/lib/utils";
const getOverflowClasses = (
  orientation: "vertical" | "horizontal" | "both" = "vertical",
) => {
  switch (orientation) {
    case "horizontal":
      return "overflow-x-auto overflow-y-hidden";
    case "both":
      return "overflow-auto";
    default:
      return "overflow-y-auto overflow-x-hidden";
  }
};


export default function ProjectDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
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

  const gapTaskId = searchParams.get('gapTaskId') ?? undefined;

  const tabItems: TabItem[] = useMemo(() => {
    if (!project) {
      return [];
    }

    return [
      {
        value: "tap",
        label: "TAP",
        icon: FileText,
        render: () => <ProjectTabs projectId={project.id} project={project} />,
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
        render: () => <GapManagement projectId={project.id} initialTaskId={gapTaskId} />,
        disableScrollArea: true,
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
  }, [project, gapTaskId]);

  const tabParam = searchParams.get('tab');

  useEffect(() => {
    if (!tabParam) return;
    const matchingTab = tabItems.find(tab => tab.value === tabParam);
    if (matchingTab && matchingTab.value !== activeTab) {
      setActiveTab(matchingTab.value);
    }
  }, [tabParam, tabItems, activeTab]);

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

  const topNavTriggerClass =
    "flex h-10 items-center justify-center gap-2 rounded-xl border px-3 text-xs font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 sm:h-11 sm:px-4 sm:text-sm";
  const activeTopNavTriggerClass =
    "bg-primary text-primary-foreground border-primary shadow-sm";
  const inactiveTopNavTriggerClass =
    "bg-muted text-muted-foreground hover:border-primary/40 hover:bg-primary/10 hover:text-foreground";

  const projectTopNav = (
    <div className="relative w-full rounded-3xl border border-border/60 bg-background/95 p-4 shadow-lg">
      <div className="pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-br from-primary/5 via-background to-primary/10" />
      <div className="relative z-10 flex flex-wrap items-center justify-center gap-2 sm:gap-3">
        {tabItems.map((tab) => {
          const isActive = tab.value === activeTab;
          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => setActiveTab(tab.value)}
              className={cn(
                topNavTriggerClass,
                "min-w-[110px] sm:min-w-[130px]",
                isActive ? activeTopNavTriggerClass : inactiveTopNavTriggerClass
              )}
            >
              <tab.icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
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
                  <div
                    key={tab.value}
                    className={cn(
                      "mt-0 flex h-full min-h-0 min-w-0 flex-col gap-4 p-6",
                      tab.disableScrollArea
                        ? undefined
                        : getOverflowClasses(tab.scrollBarOrientation ?? "vertical"),
                    )}
                  >
                    {tab.render()}
                  </div>
                ) : null
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
