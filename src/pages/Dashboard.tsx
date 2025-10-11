import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  FolderKanban,
  Users,
  CheckCircle,
  Clock,
  AlertCircle,
  TrendingUp,
  Calendar,
  HelpCircle,
  Activity,
  RadioTower,
  BarChart3,
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useDashboardStats } from "@/hooks/useDashboardStats";

// Dynamic stats migrated to useDashboardStats hook

// Recent projects migrated to useDashboardStats hook

const getStatusColor = (status: string) => {
  switch (status) {
    case "Em progresso":
      return "bg-gradient-to-r from-[#1B5F8C] via-[#29A3E5] to-[#5CC9FF] text-white shadow-soft";
    case "Revisão":
      return "bg-gradient-to-r from-[#4F3CC9] to-[#8F6FFF] text-white shadow-soft";
    case "Planejamento":
      return "bg-white/80 text-foreground ring-1 ring-primary/10";
    default:
      return "bg-muted text-muted-foreground";
  }
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { counts, recentProjects: rp } = useDashboardStats();
  const heroHighlights = [
    {
      title: "Painéis Integrados",
      description: "Monitoramento completo da farmácia, centro cirúrgico e indicadores financeiros.",
      icon: Activity,
    },
    {
      title: "Dados em Tempo Real",
      description: "Atualizações constantes para decisões imediatas em operações críticas do hospital.",
      icon: RadioTower,
    },
    {
      title: "Análises Detalhadas",
      description: "Visualização por período, especialidade e profissionais com filtros personalizados.",
      icon: BarChart3,
    },
  ];
  const statsUI = [
    {
      title: "Projetos Ativos",
      value: String(counts.projects),
      change: "+0",
      icon: FolderKanban,
      gradient: "from-[#0B2E5A] via-[#1B5F8C] to-[#29A3E5]",
      tooltip: "Número total de projetos do usuário",
    },
    {
      title: "Tarefas Concluídas",
      value: String(counts.tasksCompleted),
      change: "+0",
      icon: CheckCircle,
      gradient: "from-[#0F8F73] to-[#3AD7A1]",
      tooltip: "Tarefas finalizadas (100%)",
    },
    {
      title: "Membros da Equipe",
      value: String(counts.teamMembers),
      change: "+0",
      icon: Users,
      gradient: "from-[#FF7A45] to-[#FFAA7A]",
      tooltip: "Total de membros de equipe",
    },
    {
      title: "Prazo Hoje",
      value: String(counts.tasksDueToday),
      change: "+0",
      icon: Clock,
      gradient: "from-[#C04BFF] to-[#7E5BFF]",
      tooltip: "Tarefas com vencimento hoje",
    },
  ];
  const projectsList = rp;
  return (
    <DashboardLayout>
      <TooltipProvider>
      <div className="space-y-10">
        {/* Hero Section */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-primary p-8 text-white shadow-large">
          <div className="absolute right-12 top-10 hidden h-48 w-48 rounded-full border border-white/20 bg-white/10 blur-3xl lg:block" />
          <div className="absolute -left-10 bottom-0 hidden h-48 w-48 rounded-full bg-white/10 blur-3xl lg:block" />
          <div className="relative flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-xl space-y-4">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.35em] text-white/80">
                Visão Geral
              </span>
              <h1 className="text-3xl font-semibold leading-tight lg:text-4xl">
                Painéis Gerenciais Hospitalares
              </h1>
              <p className="text-base text-white/80">
                Soluções integradas para gestão eficiente de estoques, centro cirúrgico e indicadores financeiros com atualização em tempo real.
              </p>
              <div className="flex flex-wrap items-center gap-3 text-xs text-white/70">
                <div className="flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-4 py-2">
                  <span className="h-2 w-2 rounded-full bg-accent shadow-glow" />
                  Atualizado em tempo real
                </div>
                <div className="flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-4 py-2">
                  <Calendar className="h-3.5 w-3.5" />
                  Última sincronização: 24 jun 2025
                </div>
              </div>
            </div>
            <div className="grid gap-3 text-sm text-white/80 md:grid-cols-3 lg:grid-cols-1">
              {heroHighlights.map((highlight) => (
                <div
                  key={highlight.title}
                  className="flex flex-col gap-3 rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20">
                      <highlight.icon className="h-5 w-5" />
                    </span>
                    <h3 className="text-sm font-semibold uppercase tracking-[0.12em]">
                      {highlight.title}
                    </h3>
                  </div>
                  <p className="text-xs leading-relaxed text-white/80">{highlight.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Stats Grid */}
        <section className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
          {statsUI.map((stat) => (
            <Tooltip key={stat.title}>
              <TooltipTrigger asChild>
                <Card className="group relative cursor-help overflow-hidden border-0 bg-white/80 p-0 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-large dark:bg-background/60">
                  <div className="absolute inset-0 bg-gradient-to-br from-white/60 via-white/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 dark:from-white/10 dark:via-white/5" />
                  <CardContent className="relative z-10 p-6">
                    <div className="flex items-start justify-between gap-6">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                          <span>{stat.title}</span>
                          <HelpCircle className="h-3 w-3 text-muted-foreground/60" />
                        </div>
                        <div className="flex items-baseline gap-3">
                          <p className="text-4xl font-semibold tracking-tight text-foreground">
                            {stat.value}
                          </p>
                          <Badge variant="secondary" className="flex items-center gap-1 rounded-full border border-primary/10 bg-primary/10 text-xs text-primary">
                            <TrendingUp className="h-3 w-3" />
                            {stat.change}
                          </Badge>
                        </div>
                      </div>
                      <div
                        className={cn(
                          "flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-[0_18px_35px_rgba(12,47,94,0.2)]",
                          stat.gradient
                        )}
                      >
                        <stat.icon className="h-6 w-6" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TooltipTrigger>
              <TooltipContent>
                <p>{stat.tooltip}</p>
              </TooltipContent>
            </Tooltip>
          ))}
        </section>

        {/* Projects Overview */}
        <section className="grid grid-cols-1 gap-6 xl:grid-cols-[2fr,1fr]">
          {/* Recent Projects */}
          <Card className="border-0 bg-white/80 shadow-soft backdrop-blur-md dark:bg-background/70">
            <CardHeader className="flex flex-col gap-2 pb-0 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-xl font-semibold text-foreground">Projetos Recentes</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Monitoramento das iniciativas estratégicas do hospital
                </p>
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm" className="rounded-full border border-primary/20 bg-white/70 text-primary hover:border-primary/40 hover:bg-white">
                    Ver todos
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Visualizar lista completa de projetos</p>
                </TooltipContent>
              </Tooltip>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              {projectsList.map((project, index) => (
                <div
                  key={index}
                  className="rounded-2xl border border-primary/10 bg-white/75 p-5 shadow-[0_15px_40px_rgba(14,48,92,0.12)] transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-[0_25px_60px_rgba(14,48,92,0.18)] dark:bg-background/70"
                >
                  <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-2">
                      <h3 className="text-lg font-semibold text-foreground">{project.name}</h3>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className={getStatusColor(project.status)} variant="secondary">
                          {project.status}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {project.members} membros
                        </span>
                      </div>
                    </div>
                    <span className="text-sm font-medium text-muted-foreground">
                      {new Date(project.dueDate).toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>Progresso</span>
                      <span className="font-semibold text-foreground">{project.progress}%</span>
                    </div>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="cursor-help">
                          <Progress value={project.progress} className="h-2 bg-primary/10" />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Progresso geral do projeto: {project.progress}% concluído</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Quick Actions & Tasks */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <Card className="border-0 bg-white/80 shadow-soft backdrop-blur-md dark:bg-background/70">
              <CardHeader>
                <CardTitle className="text-xl font-semibold text-foreground">Ações Rápidas</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      className="group flex h-24 flex-col items-center justify-center gap-2 rounded-2xl border border-primary/15 bg-white/75 text-sm font-semibold text-foreground shadow-soft transition-all hover:-translate-y-1 hover:border-primary/35 hover:shadow-large"
                      onClick={() => navigate("/workspaces")}
                    >
                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary group-hover:bg-primary/20">
                        <FolderKanban className="h-5 w-5" />
                      </span>
                      <span>Workspaces</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Gerenciar seus espaços de trabalho e projetos</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      className="group flex h-24 flex-col items-center justify-center gap-2 rounded-2xl border border-primary/15 bg-white/75 text-sm font-semibold text-foreground shadow-soft transition-all hover:-translate-y-1 hover:border-primary/35 hover:shadow-large"
                    >
                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary group-hover:bg-primary/20">
                        <Calendar className="h-5 w-5" />
                      </span>
                      <span>Agendar Reunião</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Criar nova reunião com a equipe</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      className="group flex h-24 flex-col items-center justify-center gap-2 rounded-2xl border border-primary/15 bg-white/75 text-sm font-semibold text-foreground shadow-soft transition-all hover:-translate-y-1 hover:border-primary/35 hover:shadow-large"
                    >
                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary group-hover:bg-primary/20">
                        <AlertCircle className="h-5 w-5" />
                      </span>
                      <span>Relatório</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Gerar relatórios de desempenho e progresso</p>
                  </TooltipContent>
                </Tooltip>
              </CardContent>
            </Card>

            {/* Tasks Due Today */}
            <Card className="border-0 bg-white/80 shadow-soft backdrop-blur-md dark:bg-background/70">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-xl font-semibold text-foreground">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Clock className="h-5 w-5" />
                  </span>
                  Tarefas para Hoje
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  "Revisar design do dashboard",
                  "Implementar autenticação JWT",
                  "Testar integração com banco",
                  "Documentar APIs",
                ].map((task, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 rounded-2xl border border-primary/10 bg-white/75 px-4 py-3 text-sm text-foreground transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-[0_15px_35px_rgba(14,48,92,0.12)] dark:bg-background/70"
                  >
                    <span className="h-2 w-2 rounded-full bg-primary" />
                    <span>{task}</span>
                  </div>
                ))}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="sm" className="mt-4 w-full rounded-full text-primary hover:bg-primary/10">
                      Ver todas as tarefas
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Acessar lista completa de tarefas pendentes</p>
                  </TooltipContent>
                </Tooltip>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
      </TooltipProvider>
    </DashboardLayout>
  );
}