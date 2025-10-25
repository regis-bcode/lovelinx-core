import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { TaskManagementSystem } from "@/components/projects/TaskManagementSystem";
import { useProjects } from "@/hooks/useProjects";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, FolderOpen, ClipboardList, ArrowRight } from "lucide-react";

export default function TaskManagementPage() {
  const { projects, loading } = useProjects();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>(
    searchParams.get("projectId") ?? undefined
  );

  useEffect(() => {
    if (loading) {
      return;
    }

    if (!projects.length) {
      if (selectedProjectId) {
        setSelectedProjectId(undefined);
      }

      if (searchParams.get("projectId")) {
        const nextParams = new URLSearchParams(searchParams);
        nextParams.delete("projectId");
        setSearchParams(nextParams, { replace: true });
      }
      return;
    }

    if (selectedProjectId) {
      const exists = projects.some(project => project.id === selectedProjectId);
      if (!exists) {
        const fallbackProjectId = projects[0].id;
        setSelectedProjectId(fallbackProjectId);
        if (searchParams.get("projectId") !== fallbackProjectId) {
          const nextParams = new URLSearchParams(searchParams);
          nextParams.set("projectId", fallbackProjectId);
          setSearchParams(nextParams, { replace: true });
        }
      } else if (searchParams.get("projectId") !== selectedProjectId) {
        const nextParams = new URLSearchParams(searchParams);
        nextParams.set("projectId", selectedProjectId);
        setSearchParams(nextParams, { replace: true });
      }
    } else {
      const fallbackFromParams = searchParams.get("projectId");
      const fallbackProject = fallbackFromParams
        ? projects.find(project => project.id === fallbackFromParams)
        : undefined;
      const fallbackProjectId = fallbackProject?.id ?? projects[0].id;
      setSelectedProjectId(fallbackProjectId);
      if (searchParams.get("projectId") !== fallbackProjectId) {
        const nextParams = new URLSearchParams(searchParams);
        nextParams.set("projectId", fallbackProjectId);
        setSearchParams(nextParams, { replace: true });
      }
    }
  }, [loading, projects, searchParams, selectedProjectId, setSearchParams]);

  const selectedProject = useMemo(
    () => projects.find(project => project.id === selectedProjectId) ?? null,
    [projects, selectedProjectId]
  );

  const hasProjects = projects.length > 0;

  const handleProjectChange = (value: string) => {
    setSelectedProjectId(value);
    if (searchParams.get("projectId") !== value) {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.set("projectId", value);
      setSearchParams(nextParams, { replace: true });
    }
  };

  return (
    <DashboardLayout>
      <div className="flex min-h-[calc(100vh-220px)] flex-col gap-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold">Gestão de Tarefas</h1>
            <p className="text-muted-foreground">
              Centralize timers, responsáveis, tipos e descrições em uma única visão independente do projeto.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              disabled={!selectedProjectId}
              onClick={() => {
                if (selectedProjectId) {
                  navigate(`/projects-tap/${selectedProjectId}`);
                }
              }}
            >
              Ver projeto
            </Button>
            <Button asChild>
              <Link to="/projects-tap/new">
                <ClipboardList className="mr-2 h-4 w-4" />
                Novo TAP
              </Link>
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-4 rounded-3xl border border-border/40 bg-background/80 p-4 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="grid w-full max-w-xl gap-2">
              <Label htmlFor="task-management-project">Projeto selecionado</Label>
              <Select
                value={selectedProjectId}
                onValueChange={handleProjectChange}
                disabled={!hasProjects}
              >
                <SelectTrigger id="task-management-project" className="h-11 border-border/60 bg-muted/20">
                  <SelectValue placeholder={loading ? "Carregando projetos..." : "Selecione um projeto"} />
                </SelectTrigger>
                <SelectContent className="max-h-72 bg-popover">
                  {projects.map(project => (
                    <SelectItem key={project.id} value={project.id}>
                      <div className="flex flex-col">
                        <span className="font-medium">{project.nome_projeto}</span>
                        <span className="text-xs text-muted-foreground">
                          {project.cliente ? `${project.cliente} • ${project.cod_cliente ?? "sem código"}` : "Cliente não informado"}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {loading && (
              <div className="flex items-center gap-2 rounded-full border border-border/50 bg-muted/40 px-3 py-1.5 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Atualizando lista de projetos
              </div>
            )}
            {!loading && hasProjects && selectedProject && (
              <div className="flex items-center gap-3 rounded-2xl border border-border/40 bg-muted/30 px-4 py-3 text-sm">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <FolderOpen className="h-5 w-5" />
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Cliente</p>
                  <p className="font-medium leading-tight">
                    {selectedProject.cliente ?? "Cliente não informado"}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-1 flex-col overflow-hidden rounded-3xl border border-border/40 bg-background/80 shadow-sm">
          {hasProjects && selectedProjectId ? (
            <div className="flex h-full min-h-0 flex-col">
              <div className="flex items-center justify-between border-b border-border/60 bg-muted/30 px-6 py-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <ClipboardList className="h-4 w-4" />
                  {selectedProject?.nome_projeto ?? "Projeto"}
                </div>
                <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
                  <span>Gestão integrada</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                  <span>{selectedProject?.cliente ?? "Cliente não informado"}</span>
                </div>
              </div>
              <div className="flex-1 min-h-0 p-4 sm:p-6">
                <TaskManagementSystem
                  key={selectedProjectId}
                  projectId={selectedProjectId}
                  projectClient={selectedProject?.cliente ?? undefined}
                />
              </div>
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-4 p-10 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/40 text-muted-foreground">
                <ClipboardList className="h-7 w-7" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-semibold">Nenhum projeto disponível</h2>
                <p className="max-w-md text-sm text-muted-foreground">
                  Crie um novo projeto para começar a organizar suas tarefas com cronômetro, descrição, tipos e responsáveis em um só lugar.
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <Button asChild>
                  <Link to="/projects-tap/new">Criar novo TAP</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link to="/projects">Ver meus projetos</Link>
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
