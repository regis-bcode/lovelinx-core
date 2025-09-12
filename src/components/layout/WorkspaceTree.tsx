import { useState } from "react";
import { ChevronDown, ChevronRight, FolderKanban, Folder, FileText, Plus, Trash2, Edit2 } from "lucide-react";
import { useWorkspaces } from "@/hooks/useWorkspaces";
import { useFolders } from "@/hooks/useFolders";
import { useProjects } from "@/hooks/useProjects";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { EditNameDialog } from "@/components/common/EditNameDialog";
import { useToast } from "@/hooks/use-toast";

interface WorkspaceTreeProps {
  collapsed?: boolean;
}

export function WorkspaceTree({ collapsed = false }: WorkspaceTreeProps) {
  const [expandedWorkspaces, setExpandedWorkspaces] = useState<Set<string>>(new Set());
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  
  const { workspaces, loading: loadingWorkspaces } = useWorkspaces();
  const navigate = useNavigate();
  const location = useLocation();

  const toggleWorkspace = (workspaceId: string) => {
    const newExpanded = new Set(expandedWorkspaces);
    if (newExpanded.has(workspaceId)) {
      newExpanded.delete(workspaceId);
    } else {
      newExpanded.add(workspaceId);
    }
    setExpandedWorkspaces(newExpanded);
  };

  const toggleFolder = (folderId: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFolders(newExpanded);
  };

  if (loadingWorkspaces) return null;
  
  if (collapsed) {
    return (
      <div className="space-y-1">
        {workspaces.slice(0, 3).map((workspace) => (
          <Tooltip key={workspace.id}>
            <TooltipTrigger asChild>
              <div
                className="flex items-center justify-center p-2 rounded-md hover:bg-muted/50 cursor-pointer"
                onClick={() => navigate(`/workspaces/${workspace.id}`)}
              >
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: workspace.cor }}
                />
              </div>
            </TooltipTrigger>
            <TooltipContent side="right" className="z-50">
              <p>{workspace.nome}</p>
              {workspace.descricao && (
                <p className="text-xs text-muted-foreground mt-1">{workspace.descricao}</p>
              )}
            </TooltipContent>
          </Tooltip>
        ))}
        {workspaces.length > 3 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center justify-center p-2 text-xs text-muted-foreground">
                +{workspaces.length - 3}
              </div>
            </TooltipTrigger>
            <TooltipContent side="right" className="z-50">
              <p>Mais {workspaces.length - 3} workspaces</p>
              <p className="text-xs text-muted-foreground">Expanda para ver todos</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {workspaces.map((workspace) => (
        <WorkspaceItem
          key={workspace.id}
          workspace={workspace}
          isExpanded={expandedWorkspaces.has(workspace.id)}
          onToggle={() => toggleWorkspace(workspace.id)}
          expandedFolders={expandedFolders}
          onToggleFolder={toggleFolder}
          currentPath={location.pathname}
          navigate={navigate}
          collapsed={collapsed}
        />
      ))}
    </div>
  );
}

interface WorkspaceItemProps {
  workspace: any;
  isExpanded: boolean;
  onToggle: () => void;
  expandedFolders: Set<string>;
  onToggleFolder: (folderId: string) => void;
  currentPath: string;
  navigate: (path: string) => void;
  collapsed?: boolean;
}

function WorkspaceItem({
  workspace,
  isExpanded,
  onToggle,
  expandedFolders,
  onToggleFolder,
  currentPath,
  navigate,
  collapsed = false
}: WorkspaceItemProps) {
  const { folders, createFolder, refreshFolders } = useFolders(workspace.id);
  const { deleteWorkspace, updateWorkspace } = useWorkspaces();
  const { toast } = useToast();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const isActive = currentPath.includes(`/workspaces/${workspace.id}`);

  const handleDeleteWorkspace = async () => {
    try {
      const success = await deleteWorkspace(workspace.id);
      if (success) {
        toast({
          title: "Workspace excluído",
          description: "O workspace foi excluído com sucesso.",
        });
      }
    } catch (error: any) {
      toast({
        title: "Erro ao excluir",
        description: error.message || "Erro ao excluir o workspace.",
        variant: "destructive",
      });
    }
  };

  const handleEditWorkspace = async (newName: string) => {
    try {
      const success = await updateWorkspace(workspace.id, { nome: newName });
      if (success) {
        toast({
          title: "Workspace atualizado",
          description: "O nome do workspace foi atualizado com sucesso.",
        });
        return true;
      }
      return false;
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar",
        description: error.message || "Erro ao atualizar o workspace.",
        variant: "destructive",
      });
      return false;
    }
  };

  return (
    <div className="space-y-1">
      {/* Workspace Item */}
      <div
        className={cn(
          "group flex items-center gap-2 px-2 py-1.5 text-sm rounded-md cursor-pointer hover:bg-muted/50 transition-colors",
          isActive && "bg-muted text-primary font-medium"
        )}
        onClick={onToggle}
      >
        {folders.length > 0 && (
          isExpanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )
        )}
        <div
          className="w-3 h-3 rounded-full flex-shrink-0"
          style={{ backgroundColor: workspace.cor }}
        />
        <FolderKanban className="h-4 w-4 text-muted-foreground" />
        <span className="truncate">{workspace.nome}</span>
        <div className="ml-auto flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/workspaces/${workspace.id}/folders`);
            }}
          >
            <Plus className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
            onClick={(e) => {
              e.stopPropagation();
              setEditDialogOpen(true);
            }}
          >
            <Edit2 className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              setDeleteDialogOpen(true);
            }}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Folders */}
      {isExpanded && folders.map((folder) => (
        <FolderItem
          key={folder.id}
          folder={folder}
          workspaceId={workspace.id}
          isExpanded={expandedFolders.has(folder.id)}
          onToggle={() => onToggleFolder(folder.id)}
          currentPath={currentPath}
          navigate={navigate}
          collapsed={collapsed}
        />
      ))}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o workspace "{workspace.nome}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteWorkspace}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Name Dialog */}
      <EditNameDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        title="Editar Nome do Workspace"
        description="Digite o novo nome para o workspace."
        currentName={workspace.nome}
        onSave={handleEditWorkspace}
      />
    </div>
  );
}

interface FolderItemProps {
  folder: any;
  workspaceId: string;
  isExpanded: boolean;
  onToggle: () => void;
  currentPath: string;
  navigate: (path: string) => void;
  collapsed?: boolean;
}

function FolderItem({
  folder,
  workspaceId,
  isExpanded,
  onToggle,
  currentPath,
  navigate,
  collapsed = false
}: FolderItemProps) {
  const { projects, refreshProjects, deleteProject, updateProject } = useProjects(folder.id);
  const { deleteFolder, updateFolder } = useFolders(workspaceId);
  const { toast } = useToast();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  
  // Projetos já filtrados pelo folderId no hook
  const folderProjects = projects;

  const isActive = currentPath.includes(`/folders/${folder.id}`);

  const handleDeleteFolder = async () => {
    try {
      setDeleteError(null);
      const success = await deleteFolder(folder.id);
      if (success) {
        toast({
          title: "Pasta excluída",
          description: "A pasta foi excluída com sucesso.",
        });
        setDeleteDialogOpen(false);
      }
    } catch (error: any) {
      setDeleteError(error.message || "Erro ao excluir a pasta.");
    }
  };

  const handleEditFolder = async (newName: string) => {
    try {
      const success = await updateFolder(folder.id, { nome: newName });
      if (success) {
        toast({
          title: "Pasta atualizada",
          description: "O nome da pasta foi atualizado com sucesso.",
        });
        return true;
      }
      return false;
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar",
        description: error.message || "Erro ao atualizar a pasta.",
        variant: "destructive",
      });
      return false;
    }
  };

  const handleDeleteProject = async (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation();
    if (confirm("Tem certeza que deseja excluir este projeto?")) {
      try {
        const success = await deleteProject(projectId);
        if (success) {
          toast({
            title: "Projeto excluído",
            description: "O projeto foi excluído com sucesso.",
          });
        }
      } catch (error: any) {
        toast({
          title: "Erro ao excluir",
          description: error.message || "Erro ao excluir o projeto.",
          variant: "destructive",
        });
      }
    }
  };

  return (
    <div className="ml-4 space-y-1">
      {/* Folder Item */}
      <div
        className={cn(
          "group flex items-center gap-2 px-2 py-1.5 text-sm rounded-md cursor-pointer hover:bg-muted/50 transition-colors",
          isActive && "bg-muted text-primary font-medium"
        )}
        onClick={onToggle}
      >
        {folderProjects.length > 0 && (
          isExpanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )
        )}
        <div
          className="w-3 h-3 rounded-full flex-shrink-0"
          style={{ backgroundColor: folder.cor }}
        />
        <Folder className="h-4 w-4 text-muted-foreground" />
        <span className="truncate">{folder.nome}</span>
        <div className="ml-auto flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/workspaces/${workspaceId}/folders/${folder.id}/projects`);
            }}
          >
            <Plus className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
            onClick={(e) => {
              e.stopPropagation();
              setEditDialogOpen(true);
            }}
          >
            <Edit2 className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              setDeleteDialogOpen(true);
            }}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Projects */}
      {isExpanded && folderProjects.map((project) => (
        <ProjectItem
          key={project.id}
          project={project}
          currentPath={currentPath}
          navigate={navigate}
          onDelete={handleDeleteProject}
          onUpdate={updateProject}
          collapsed={collapsed}
        />
      ))}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteError ? (
                <span className="text-destructive">{deleteError}</span>
              ) : (
                `Tem certeza que deseja excluir a pasta "${folder.nome}"? Esta ação não pode ser desfeita.`
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteError(null)}>
              Cancelar
            </AlertDialogCancel>
            {!deleteError && (
              <AlertDialogAction
                onClick={handleDeleteFolder}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Excluir
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Name Dialog */}
      <EditNameDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        title="Editar Nome da Pasta"
        description="Digite o novo nome para a pasta."
        currentName={folder.nome}
        onSave={handleEditFolder}
      />
    </div>
  );
}

interface ProjectItemProps {
  project: any;
  currentPath: string;
  navigate: (path: string) => void;
  onDelete: (e: React.MouseEvent, projectId: string) => void;
  onUpdate: (id: string, data: any) => Promise<any>;
  collapsed?: boolean;
}

function ProjectItem({ project, currentPath, navigate, onDelete, onUpdate, collapsed = false }: ProjectItemProps) {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const { toast } = useToast();

  const handleEditProject = async (newName: string) => {
    try {
      const success = await onUpdate(project.id, { nome_projeto: newName });
      if (success) {
        toast({
          title: "Projeto atualizado",
          description: "O nome do projeto foi atualizado com sucesso.",
        });
        return true;
      }
      return false;
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar",
        description: error.message || "Erro ao atualizar o projeto.",
        variant: "destructive",
      });
      return false;
    }
  };

  return (
    <>
      <div
        className={cn(
          "group ml-4 flex items-center gap-2 px-2 py-1.5 text-sm rounded-md cursor-pointer hover:bg-muted/50 transition-colors",
          currentPath.includes(`/projects-tap/${project.id}`) && "bg-muted text-primary font-medium"
        )}
        onClick={() => navigate(`/projects-tap/${project.id}`)}
      >
        <FileText className="h-4 w-4 text-muted-foreground" />
        <span className="truncate">{project.nome_projeto}</span>
        <div className="ml-auto flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
            onClick={(e) => {
              e.stopPropagation();
              setEditDialogOpen(true);
            }}
          >
            <Edit2 className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive"
            onClick={(e) => onDelete(e, project.id)}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Edit Name Dialog */}
      <EditNameDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        title="Editar Nome do Projeto"
        description="Digite o novo nome para o projeto."
        currentName={project.nome_projeto}
        onSave={handleEditProject}
      />
    </>
  );
}