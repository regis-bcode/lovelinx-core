import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ProjectTabs } from "@/components/projects/ProjectTabs";
import { useProjects } from "@/hooks/useProjects";
import { Project, ProjectFormData } from "@/types/project";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

export default function ProjectsNew() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { projects, createProject, updateProject, getProject } = useProjects();
  
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

  const handleSave = async (data: Partial<ProjectFormData>) => {
    if (!user) {
      toast({
        title: "Erro",
        description: "Usuário não autenticado.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      if (isEditing && id) {
        const updatedProject = await updateProject(id, data);
        if (updatedProject) {
          setProject(updatedProject);
        }
      } else {
        // Para novos projetos, precisamos de dados mínimos obrigatórios
        const requiredFields: (keyof ProjectFormData)[] = [
          'data', 'cod_cliente', 'nome_projeto', 'cliente', 'gpp', 
          'coordenador', 'produto', 'esn', 'arquiteto', 'criticidade'
        ];

        const missingFields = requiredFields.filter(field => !data[field]);
        
        if (missingFields.length > 0) {
          toast({
            title: "Campos obrigatórios",
            description: `Preencha todos os campos obrigatórios da aba Identificação antes de salvar.`,
            variant: "destructive",
          });
          return;
        }

        const newProject = await createProject(data as ProjectFormData);
        if (newProject) {
          setProject(newProject);
          navigate(`/projects-tap/${newProject.id}`, { replace: true });
          toast({
            title: "TAP criado",
            description: "Termo de Abertura do Projeto criado com sucesso!",
          });
        }
      }
    } catch (error) {
      console.error('Erro ao salvar projeto:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate("/projects")}
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
          onSave={handleSave}
          isLoading={isLoading}
        />
      </div>
    </DashboardLayout>
  );
}