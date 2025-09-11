import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ProjectTabs } from "@/components/projects/ProjectTabs";
import { useProjects } from "@/hooks/useProjects";
import { Project } from "@/types/project";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

export default function ProjectsNew() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const { projects, createProject, updateProject, getProject } = useProjects();
  
  // Extrair folderId da query string
  const searchParams = new URLSearchParams(location.search);
  const folderId = searchParams.get('folderId');
  
  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const isEditing = Boolean(id);

  useEffect(() => {
    if (isEditing && id) {
      const existingProject = getProject(id);
      if (existingProject) {
        setProject(existingProject);
      } else {
        toast({
          title: "Erro",
          description: "Projeto não encontrado.",
          variant: "destructive",
        });
        navigate("/projects");
      }
    }
  }, [id, isEditing, getProject]);


  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => {
              if (folderId) {
                // Se está criando TAP dentro de uma pasta, volta para a pasta
                const workspaceId = location.pathname.split('/')[2]; // Extrai workspaceId da URL atual se disponível
                if (workspaceId && workspaceId !== 'projects-tap') {
                  navigate(`/workspaces/${workspaceId}/folders/${folderId}/projects`);
                } else {
                  navigate("/projects");
                }
              } else {
                navigate("/projects");
              }
            }}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              {isEditing ? "Editar TAP" : "Novo TAP (Termo de Abertura do Projeto)"}
            </h1>
            <p className="text-muted-foreground">
              {isEditing 
                ? `Editando: ${project?.nome_projeto || "Projeto"}` 
                : "Preencha as informações do Termo de Abertura do Projeto"
              }
            </p>
          </div>
        </div>

        {/* Project Form Tabs */}
        <ProjectTabs 
          project={project || undefined}
          isLoading={isLoading}
          folderId={folderId}
        />
      </div>
    </DashboardLayout>
  );
}