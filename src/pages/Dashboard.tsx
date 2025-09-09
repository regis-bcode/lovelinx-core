import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  FolderKanban, 
  Users, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  Plus,
  TrendingUp,
  Calendar
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

const stats = [
  {
    title: "Projetos Ativos",
    value: "12",
    change: "+2",
    icon: FolderKanban,
    color: "bg-primary",
  },
  {
    title: "Tarefas Concluídas",
    value: "89",
    change: "+15",
    icon: CheckCircle,
    color: "bg-success",
  },
  {
    title: "Membros da Equipe",
    value: "24",
    change: "+3",
    icon: Users,
    color: "bg-accent",
  },
  {
    title: "Prazo Hoje",
    value: "7",
    change: "0",
    icon: Clock,
    color: "bg-warning",
  },
];

const recentProjects = [
  {
    name: "Sistema de E-commerce",
    progress: 75,
    status: "Em progresso",
    dueDate: "2024-12-30",
    members: 6,
  },
  {
    name: "App Mobile Delivery",
    progress: 45,
    status: "Em progresso", 
    dueDate: "2024-12-25",
    members: 4,
  },
  {
    name: "Dashboard Analytics",
    progress: 90,
    status: "Revisão",
    dueDate: "2024-12-20",
    members: 3,
  },
  {
    name: "API Integração",
    progress: 30,
    status: "Planejamento",
    dueDate: "2025-01-15", 
    members: 2,
  },
];

const getStatusColor = (status: string) => {
  switch (status) {
    case "Em progresso":
      return "bg-status-progress text-white";
    case "Revisão":
      return "bg-status-review text-white";
    case "Planejamento":
      return "bg-status-todo text-foreground";
    default:
      return "bg-muted text-muted-foreground";
  }
};

export default function Dashboard() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground">
              Visão geral dos seus projetos e atividades
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Calendar className="mr-2 h-4 w-4" />
              Calendário
            </Button>
            <Button size="sm" className="bg-gradient-primary">
              <Plus className="mr-2 h-4 w-4" />
              Novo Projeto
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat) => (
            <Card key={stat.title} className="shadow-soft hover:shadow-medium transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-3xl font-bold text-foreground">{stat.value}</p>
                      <Badge variant="secondary" className="text-xs">
                        <TrendingUp className="mr-1 h-3 w-3" />
                        {stat.change}
                      </Badge>
                    </div>
                  </div>
                  <div className={`p-3 rounded-xl ${stat.color}`}>
                    <stat.icon className="h-6 w-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Projects Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Projects */}
          <Card className="shadow-soft">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl">Projetos Recentes</CardTitle>
                <Button variant="ghost" size="sm">
                  Ver todos
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {recentProjects.map((project, index) => (
                <div key={index} className="p-4 rounded-lg border bg-gradient-card hover:shadow-soft transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground">{project.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className={getStatusColor(project.status)} variant="secondary">
                          {project.status}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {project.members} membros
                        </span>
                      </div>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {new Date(project.dueDate).toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Progresso</span>
                      <span className="font-medium">{project.progress}%</span>
                    </div>
                    <Progress value={project.progress} className="h-2" />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Quick Actions & Tasks */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle className="text-xl">Ações Rápidas</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3">
                <Button variant="outline" className="h-20 flex-col gap-2">
                  <Plus className="h-6 w-6" />
                  <span>Novo Projeto</span>
                </Button>
                <Button variant="outline" className="h-20 flex-col gap-2">
                  <Users className="h-6 w-6" />
                  <span>Convidar Membro</span>
                </Button>
                <Button variant="outline" className="h-20 flex-col gap-2">
                  <Calendar className="h-6 w-6" />
                  <span>Agendar Reunião</span>
                </Button>
                <Button variant="outline" className="h-20 flex-col gap-2">
                  <AlertCircle className="h-6 w-6" />
                  <span>Relatório</span>
                </Button>
              </CardContent>
            </Card>

            {/* Tasks Due Today */}
            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle className="text-xl flex items-center gap-2">
                  <Clock className="h-5 w-5" />
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
                  <div key={index} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                    <span className="text-sm text-foreground">{task}</span>
                  </div>
                ))}
                <Button variant="ghost" size="sm" className="w-full mt-2">
                  Ver todas as tarefas
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}