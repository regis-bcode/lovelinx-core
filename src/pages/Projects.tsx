import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { useProjects } from "@/hooks/useProjects";
import { 
  Plus, 
  Search, 
  Filter, 
  MoreVertical,
  Calendar,
  Users,
  FolderKanban
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const projects = [
  {
    id: 1,
    name: "Sistema de E-commerce",
    description: "Plataforma completa de vendas online com painel administrativo",
    progress: 75,
    status: "Em progresso",
    priority: "Alta",
    dueDate: "2024-12-30",
    members: 6,
    tasks: { completed: 15, total: 20 },
    color: "bg-blue-500",
  },
  {
    id: 2,
    name: "App Mobile Delivery",
    description: "Aplicativo mobile para delivery de comida com geolocalização", 
    progress: 45,
    status: "Em progresso",
    priority: "Média",
    dueDate: "2024-12-25",
    members: 4,
    tasks: { completed: 9, total: 20 },
    color: "bg-green-500",
  },
  {
    id: 3,
    name: "Dashboard Analytics",
    description: "Dashboard para análise de dados e relatórios gerenciais",
    progress: 90,
    status: "Revisão",
    priority: "Alta",
    dueDate: "2024-12-20",
    members: 3,
    tasks: { completed: 18, total: 20 },
    color: "bg-purple-500",
  },
  {
    id: 4,
    name: "API de Integração",
    description: "API REST para integração com sistemas externos",
    progress: 30,
    status: "Planejamento",
    priority: "Baixa",
    dueDate: "2025-01-15",
    members: 2,
    tasks: { completed: 6, total: 20 },
    color: "bg-orange-500",
  },
  {
    id: 5,
    name: "Sistema de CRM",
    description: "Customer Relationship Management para vendas",
    progress: 60,
    status: "Em progresso",
    priority: "Média",
    dueDate: "2025-01-10",
    members: 5,
    tasks: { completed: 12, total: 20 },
    color: "bg-red-500",
  },
  {
    id: 6,
    name: "Portal do Cliente",
    description: "Portal web para clientes acessarem suas informações",
    progress: 20,
    status: "Iniciado",
    priority: "Baixa",
    dueDate: "2025-02-01", 
    members: 3,
    tasks: { completed: 4, total: 20 },
    color: "bg-cyan-500",
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
    case "Iniciado":
      return "bg-accent text-accent-foreground";
    default:
      return "bg-muted text-muted-foreground";
  }
};

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case "Alta":
      return "bg-destructive text-destructive-foreground";
    case "Média":
      return "bg-warning text-warning-foreground";
    case "Baixa":
      return "bg-success text-success-foreground";
    default:
      return "bg-muted text-muted-foreground";
  }
};

export default function Projects() {
  const [searchTerm, setSearchTerm] = useState("");
  const { projects: realProjects } = useProjects();
  const navigate = useNavigate();
  
  // Usar projetos reais se existirem, caso contrário usar dados mock
  const projectsToShow = realProjects.length > 0 ? realProjects.map(p => ({
    id: parseInt(p.id),
    name: p.nomeProjeto,
    description: p.objetivo || p.escopo,
    progress: 0, // Calcular baseado em dados reais
    status: "Planejamento",
    priority: p.criticidade === "Alta" ? "Alta" : p.criticidade === "Crítica" ? "Alta" : "Média",
    dueDate: p.goLivePrevisto,
    members: 1,
    tasks: { completed: 0, total: 10 },
    color: "bg-blue-500",
  })) : projects;
  
  const filteredProjects = projectsToShow.filter(project =>
    project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    project.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateProject = () => {
    navigate("/projects-tap");
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Projetos</h1>
            <p className="text-muted-foreground">
              Gerencie todos os seus projetos em um só lugar
            </p>
          </div>
          <Button className="bg-gradient-primary hover:opacity-90" onClick={handleCreateProject}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Projeto (TAP)
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
              Status
            </Button>
            <Button variant="outline" size="sm">
              Prioridade
            </Button>
          </div>
        </div>

        {/* Projects Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="shadow-soft">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total</p>
                  <p className="text-2xl font-bold">{projectsToShow.length}</p>
                </div>
                <FolderKanban className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-soft">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Em Progresso</p>
                  <p className="text-2xl font-bold">
                    {projectsToShow.filter(p => p.status === "Em progresso").length}
                  </p>
                </div>
                <div className="h-8 w-8 bg-status-progress rounded-full"></div>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-soft">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Em Revisão</p>
                  <p className="text-2xl font-bold">
                    {projectsToShow.filter(p => p.status === "Revisão").length}
                  </p>
                </div>
                <div className="h-8 w-8 bg-status-review rounded-full"></div>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-soft">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Concluídos</p>
                  <p className="text-2xl font-bold">8</p>
                </div>
                <div className="h-8 w-8 bg-status-done rounded-full"></div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Projects Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredProjects.map((project) => (
            <Card key={project.id} className="shadow-soft hover:shadow-medium transition-all duration-200 cursor-pointer">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${project.color}`}></div>
                    <CardTitle className="text-lg">{project.name}</CardTitle>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => navigate(`/projects-tap/${project.id}`)}>
                        Ver detalhes
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate(`/projects-tap/${project.id}/edit`)}>
                        Editar TAP
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive">
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {project.description}
                </p>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  <Badge className={getStatusColor(project.status)} variant="secondary">
                    {project.status}
                  </Badge>
                  <Badge className={getPriorityColor(project.priority)} variant="secondary">
                    {project.priority}
                  </Badge>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Progresso</span>
                    <span className="font-medium">{project.progress}%</span>
                  </div>
                  <Progress value={project.progress} className="h-2" />
                </div>

                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span>{project.members} membros</span>
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>{new Date(project.dueDate).toLocaleDateString("pt-BR")}</span>
                  </div>
                </div>

                <div className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">
                    {project.tasks.completed}/{project.tasks.total}
                  </span> tarefas concluídas
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}