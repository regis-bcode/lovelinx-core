import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Plus, FolderKanban, FileText } from "lucide-react";
import { useWorkspaces } from "@/hooks/useWorkspaces";
import { useFolders } from "@/hooks/useFolders";
import { useProjects } from "@/hooks/useProjects";
import { WorkspaceFormData } from "@/types/workspace";
import { FolderFormData } from "@/types/folder";
import { ProjectFormData } from "@/types/project";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

const colors = [
  '#3B82F6', '#EF4444', '#10B981', '#F59E0B', 
  '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'
];

interface WorkspaceWithProjectDialogProps {
  children: React.ReactNode;
  folderId?: string;
  onProjectCreated?: () => void;
}

export function WorkspaceWithProjectDialog({ children, folderId, onProjectCreated }: WorkspaceWithProjectDialogProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState("workspace");
  const [workspaceData, setWorkspaceData] = useState<WorkspaceFormData>({
    nome: "",
    descricao: "",
    cor: colors[0],
    ativo: true,
  });
  const [folderData, setFolderData] = useState<FolderFormData>({
    nome: "",
    descricao: "",
    cor: colors[0],
    workspace_id: "",
  });
  const [projectData, setProjectData] = useState<Partial<ProjectFormData>>({
    data: new Date().toISOString().split('T')[0],
    cod_cliente: "",
    nome_projeto: "",
    cliente: "",
    gpp: "",
    coordenador: "",
    produto: "",
    esn: "",
    arquiteto: "",
    criticidade: "Baixa",
    folder_id: folderId || null,
  });

  const { createWorkspace } = useWorkspaces();
  const { createFolder } = useFolders();
  const { createProject } = useProjects();
  const { toast } = useToast();
  const navigate = useNavigate();

  const resetForm = () => {
    setWorkspaceData({
      nome: "",
      descricao: "",
      cor: colors[0],
      ativo: true,
    });
    setFolderData({
      nome: "",
      descricao: "",
      cor: colors[0],
      workspace_id: "",
    });
    setProjectData({
      data: new Date().toISOString().split('T')[0],
      cod_cliente: "",
      nome_projeto: "",
      cliente: "",
      gpp: "",
      coordenador: "",
      produto: "",
      esn: "",
      arquiteto: "",
      criticidade: "Baixa",
      folder_id: folderId || null,
    });
    setCurrentStep("workspace");
  };

  const handleSubmit = async () => {
    try {
      let targetFolderId = folderId;
      
      // Se não foi passado folderId como prop, cria workspace e pasta
      if (!folderId) {
        // 1. Create workspace
        const newWorkspace = await createWorkspace(workspaceData);
        if (!newWorkspace) {
          throw new Error("Falha ao criar workspace");
        }

        // 2. Create folder
        const folderWithWorkspaceId = {
          ...folderData,
          workspace_id: newWorkspace.id,
        };
        const newFolder = await createFolder(folderWithWorkspaceId);
        if (!newFolder) {
          throw new Error("Falha ao criar pasta");
        }
        
        targetFolderId = newFolder.id;
      }

      // 3. Create project
      const projectWithFolderId = {
        ...projectData,
        folder_id: targetFolderId,
      } as ProjectFormData;
      
      const newProject = await createProject(projectWithFolderId);
      if (!newProject) {
        throw new Error("Falha ao criar projeto");
      }

      toast({
        title: "Sucesso!",
        description: folderId 
          ? "Projeto TAP criado com sucesso!" 
          : "Workspace, pasta e projeto TAP criados com sucesso!",
      });

      setDialogOpen(false);
      resetForm();
      
      // Always call onProjectCreated if available, and navigate if not
      if (onProjectCreated) {
        onProjectCreated();
      }
      
      // Navigate to the new project
      navigate(`/projects-tap/${newProject.id}`);
    } catch (error) {
      console.error("Erro ao criar:", error);
      toast({
        title: "Erro",
        description: "Erro ao criar o projeto. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const isWorkspaceValid = workspaceData.nome.trim() !== "";
  const isFolderValid = folderData.nome.trim() !== "";
  const isProjectValid = 
    projectData.cod_cliente?.trim() !== "" &&
    projectData.nome_projeto?.trim() !== "" &&
    projectData.cliente?.trim() !== "" &&
    projectData.gpp?.trim() !== "" &&
    projectData.coordenador?.trim() !== "" &&
    projectData.produto?.trim() !== "" &&
    projectData.esn?.trim() !== "" &&
    projectData.arquiteto?.trim() !== "";

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild onClick={() => resetForm()}>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {folderId ? "Novo Projeto TAP" : "Novo Workspace + TAP"}
          </DialogTitle>
          <DialogDescription>
            {folderId 
              ? "Crie um novo projeto TAP nesta pasta"
              : "Crie um workspace completo com pasta e projeto TAP inicial"
            }
          </DialogDescription>
        </DialogHeader>

        {folderId ? (
          // Se já tem folderId, só mostra o formulário do projeto
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="project-data">Data</Label>
                <Input
                  id="project-data"
                  type="date"
                  value={projectData.data}
                  onChange={(e) => setProjectData(prev => ({ ...prev, data: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="project-cod-cliente">Código Cliente</Label>
                <Input
                  id="project-cod-cliente"
                  value={projectData.cod_cliente}
                  onChange={(e) => setProjectData(prev => ({ ...prev, cod_cliente: e.target.value }))}
                  placeholder="Código do cliente"
                  required
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="project-nome">Nome do Projeto</Label>
              <Input
                id="project-nome"
                value={projectData.nome_projeto}
                onChange={(e) => setProjectData(prev => ({ ...prev, nome_projeto: e.target.value }))}
                placeholder="Nome do projeto"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="project-cliente">Cliente</Label>
                <Input
                  id="project-cliente"
                  value={projectData.cliente}
                  onChange={(e) => setProjectData(prev => ({ ...prev, cliente: e.target.value }))}
                  placeholder="Nome do cliente"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="project-gpp">GPP</Label>
                <Input
                  id="project-gpp"
                  value={projectData.gpp}
                  onChange={(e) => setProjectData(prev => ({ ...prev, gpp: e.target.value }))}
                  placeholder="GPP"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="project-coordenador">Coordenador</Label>
                <Input
                  id="project-coordenador"
                  value={projectData.coordenador}
                  onChange={(e) => setProjectData(prev => ({ ...prev, coordenador: e.target.value }))}
                  placeholder="Coordenador"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="project-arquiteto">Arquiteto</Label>
                <Input
                  id="project-arquiteto"
                  value={projectData.arquiteto}
                  onChange={(e) => setProjectData(prev => ({ ...prev, arquiteto: e.target.value }))}
                  placeholder="Arquiteto"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="project-produto">Produto</Label>
                <Input
                  id="project-produto"
                  value={projectData.produto}
                  onChange={(e) => setProjectData(prev => ({ ...prev, produto: e.target.value }))}
                  placeholder="Produto"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="project-esn">ESN</Label>
                <Input
                  id="project-esn"
                  value={projectData.esn}
                  onChange={(e) => setProjectData(prev => ({ ...prev, esn: e.target.value }))}
                  placeholder="ESN"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="project-criticidade">Criticidade</Label>
              <Select 
                value={projectData.criticidade} 
                onValueChange={(value: "Baixa" | "Média" | "Alta" | "Crítica") => 
                  setProjectData(prev => ({ ...prev, criticidade: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a criticidade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Baixa">Baixa</SelectItem>
                  <SelectItem value="Média">Média</SelectItem>
                  <SelectItem value="Alta">Alta</SelectItem>
                  <SelectItem value="Crítica">Crítica</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        ) : (
          // Se não tem folderId, mostra o fluxo completo com tabs
          <Tabs value={currentStep} onValueChange={setCurrentStep} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="workspace" className="text-xs">
                <FolderKanban className="h-3 w-3 mr-1" />
                Workspace
              </TabsTrigger>
              <TabsTrigger value="folder" className="text-xs" disabled={!isWorkspaceValid}>
                Pasta
              </TabsTrigger>
              <TabsTrigger value="project" className="text-xs" disabled={!isFolderValid}>
                <FileText className="h-3 w-3 mr-1" />
                TAP
              </TabsTrigger>
            </TabsList>

            <TabsContent value="workspace" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="workspace-nome">Nome do Workspace</Label>
                <Input
                  id="workspace-nome"
                  value={workspaceData.nome}
                  onChange={(e) => setWorkspaceData(prev => ({ ...prev, nome: e.target.value }))}
                  placeholder="Nome do workspace"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="workspace-descricao">Descrição</Label>
                <Textarea
                  id="workspace-descricao"
                  value={workspaceData.descricao}
                  onChange={(e) => setWorkspaceData(prev => ({ ...prev, descricao: e.target.value }))}
                  placeholder="Descrição do workspace (opcional)"
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label>Cor do Workspace</Label>
                <div className="flex gap-2">
                  {colors.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className={`w-8 h-8 rounded-full border-2 ${
                        workspaceData.cor === color ? 'border-foreground' : 'border-muted'
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() => setWorkspaceData(prev => ({ ...prev, cor: color }))}
                    />
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="folder" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="folder-nome">Nome da Pasta</Label>
                <Input
                  id="folder-nome"
                  value={folderData.nome}
                  onChange={(e) => setFolderData(prev => ({ ...prev, nome: e.target.value }))}
                  placeholder="Nome da pasta"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="folder-descricao">Descrição</Label>
                <Textarea
                  id="folder-descricao"
                  value={folderData.descricao}
                  onChange={(e) => setFolderData(prev => ({ ...prev, descricao: e.target.value }))}
                  placeholder="Descrição da pasta (opcional)"
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label>Cor da Pasta</Label>
                <div className="flex gap-2">
                  {colors.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className={`w-8 h-8 rounded-full border-2 ${
                        folderData.cor === color ? 'border-foreground' : 'border-muted'
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() => setFolderData(prev => ({ ...prev, cor: color }))}
                    />
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="project" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="project-data">Data</Label>
                  <Input
                    id="project-data"
                    type="date"
                    value={projectData.data}
                    onChange={(e) => setProjectData(prev => ({ ...prev, data: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="project-cod-cliente">Código Cliente</Label>
                  <Input
                    id="project-cod-cliente"
                    value={projectData.cod_cliente}
                    onChange={(e) => setProjectData(prev => ({ ...prev, cod_cliente: e.target.value }))}
                    placeholder="Código do cliente"
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="project-nome">Nome do Projeto</Label>
                <Input
                  id="project-nome"
                  value={projectData.nome_projeto}
                  onChange={(e) => setProjectData(prev => ({ ...prev, nome_projeto: e.target.value }))}
                  placeholder="Nome do projeto"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="project-cliente">Cliente</Label>
                  <Input
                    id="project-cliente"
                    value={projectData.cliente}
                    onChange={(e) => setProjectData(prev => ({ ...prev, cliente: e.target.value }))}
                    placeholder="Nome do cliente"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="project-gpp">GPP</Label>
                  <Input
                    id="project-gpp"
                    value={projectData.gpp}
                    onChange={(e) => setProjectData(prev => ({ ...prev, gpp: e.target.value }))}
                    placeholder="GPP"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="project-coordenador">Coordenador</Label>
                  <Input
                    id="project-coordenador"
                    value={projectData.coordenador}
                    onChange={(e) => setProjectData(prev => ({ ...prev, coordenador: e.target.value }))}
                    placeholder="Coordenador"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="project-arquiteto">Arquiteto</Label>
                  <Input
                    id="project-arquiteto"
                    value={projectData.arquiteto}
                    onChange={(e) => setProjectData(prev => ({ ...prev, arquiteto: e.target.value }))}
                    placeholder="Arquiteto"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="project-produto">Produto</Label>
                  <Input
                    id="project-produto"
                    value={projectData.produto}
                    onChange={(e) => setProjectData(prev => ({ ...prev, produto: e.target.value }))}
                    placeholder="Produto"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="project-esn">ESN</Label>
                  <Input
                    id="project-esn"
                    value={projectData.esn}
                    onChange={(e) => setProjectData(prev => ({ ...prev, esn: e.target.value }))}
                    placeholder="ESN"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="project-criticidade">Criticidade</Label>
                <Select 
                  value={projectData.criticidade} 
                  onValueChange={(value: "Baixa" | "Média" | "Alta" | "Crítica") => 
                    setProjectData(prev => ({ ...prev, criticidade: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a criticidade" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Baixa">Baixa</SelectItem>
                    <SelectItem value="Média">Média</SelectItem>
                    <SelectItem value="Alta">Alta</SelectItem>
                    <SelectItem value="Crítica">Crítica</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>
          </Tabs>
        )}

        <DialogFooter className="flex gap-2 pt-4">
          {folderId ? (
            <Button 
              onClick={handleSubmit}
              disabled={!isProjectValid}
              className="w-full bg-gradient-primary hover:opacity-90"
            >
              <Plus className="mr-2 h-4 w-4" />
              Criar Projeto TAP
            </Button>
          ) : (
            <>
              {currentStep !== "workspace" && (
                <Button 
                  variant="outline" 
                  onClick={() => {
                    if (currentStep === "project") setCurrentStep("folder");
                    else if (currentStep === "folder") setCurrentStep("workspace");
                  }}
                >
                  Voltar
                </Button>
              )}
              
              {currentStep !== "project" ? (
                <Button 
                  onClick={() => {
                    if (currentStep === "workspace" && isWorkspaceValid) setCurrentStep("folder");
                    else if (currentStep === "folder" && isFolderValid) setCurrentStep("project");
                  }}
                  disabled={
                    (currentStep === "workspace" && !isWorkspaceValid) ||
                    (currentStep === "folder" && !isFolderValid)
                  }
                >
                  Próximo
                </Button>
              ) : (
                <Button 
                  onClick={handleSubmit}
                  disabled={!isProjectValid}
                  className="bg-gradient-primary hover:opacity-90"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Criar Workspace + TAP
                </Button>
              )}
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}