import { useState } from "react";
import { ChevronDown, ChevronRight, FolderKanban, Folder, FileText, Plus } from "lucide-react";
import { useWorkspaces } from "@/hooks/useWorkspaces";
import { useFolders } from "@/hooks/useFolders";
import { useProjects } from "@/hooks/useProjects";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { WorkspaceWithProjectDialog } from "@/components/workspaces/WorkspaceWithProjectDialog";

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

  if (loadingWorkspaces || collapsed) return null;

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
}

function WorkspaceItem({
  workspace,
  isExpanded,
  onToggle,
  expandedFolders,
  onToggleFolder,
  currentPath,
  navigate
}: WorkspaceItemProps) {
  const { folders, createFolder, refreshFolders } = useFolders(workspace.id);
  const [folderOpen, setFolderOpen] = useState(false);
  const [folderForm, setFolderForm] = useState<{ nome: string; descricao: string | null; cor: string; workspace_id: string }>({
    nome: "",
    descricao: "",
    cor: workspace.cor,
    workspace_id: workspace.id,
  });

  const isActive = currentPath.includes(`/workspaces/${workspace.id}`);

  return (
    <div className="space-y-1">
      {/* Workspace Item */}
      <div
        className={cn(
          "flex items-center gap-2 px-2 py-1.5 text-sm rounded-md cursor-pointer hover:bg-muted/50 transition-colors",
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
        <Button
          variant="ghost"
          size="sm"
          className="ml-auto h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/workspaces/${workspace.id}/folders`);
          }}
        >
          <Plus className="h-3 w-3" />
        </Button>
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
        />
      ))}
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
}

function FolderItem({
  folder,
  workspaceId,
  isExpanded,
  onToggle,
  currentPath,
  navigate
}: FolderItemProps) {
  const { projects, refreshProjects } = useProjects(folder.id);
  
  // Projetos já filtrados pelo folderId no hook
  const folderProjects = projects;

  const isActive = currentPath.includes(`/folders/${folder.id}`);

  return (
    <div className="ml-4 space-y-1">
      {/* Folder Item */}
      <div
        className={cn(
          "flex items-center gap-2 px-2 py-1.5 text-sm rounded-md cursor-pointer hover:bg-muted/50 transition-colors",
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
        <Button
          variant="ghost"
          size="sm"
          className="ml-auto h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/workspaces/${workspaceId}/folders/${folder.id}/projects`);
          }}
        >
          <Plus className="h-3 w-3" />
        </Button>
      </div>

      {/* Projects */}
      {isExpanded && folderProjects.map((project) => (
        <div
          key={project.id}
          className={cn(
            "ml-4 flex items-center gap-2 px-2 py-1.5 text-sm rounded-md cursor-pointer hover:bg-muted/50 transition-colors",
            currentPath.includes(`/projects-tap/${project.id}`) && "bg-muted text-primary font-medium"
          )}
          onClick={() => navigate(`/projects-tap/${project.id}`)}
        >
          <FileText className="h-4 w-4 text-muted-foreground" />
          <span className="truncate">{project.nome_projeto}</span>
        </div>
      ))}
    </div>
  );
}