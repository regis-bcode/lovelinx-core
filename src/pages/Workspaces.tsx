import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Plus, 
  Search, 
  Filter, 
  MoreVertical,
  FolderOpen,
  Settings,
  Palette
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useWorkspaces } from "@/hooks/useWorkspaces";
import { WorkspaceFormData } from "@/types/workspace";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const colors = [
  '#3B82F6', '#EF4444', '#10B981', '#F59E0B', 
  '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'
];

export default function Workspaces() {
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<WorkspaceFormData>({
    nome: "",
    descricao: "",
    cor: colors[0],
    ativo: true,
  });

  const { workspaces, loading, createWorkspace, updateWorkspace, deleteWorkspace } = useWorkspaces();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const filteredWorkspaces = workspaces.filter(workspace =>
    workspace.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    workspace.descricao?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const resetForm = () => {
    setFormData({
      nome: "",
      descricao: "",
      cor: colors[0],
      ativo: true,
    });
    setEditingId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingId) {
        await updateWorkspace(editingId, formData);
        toast({
          title: "Workspace atualizado",
          description: "O workspace foi atualizado com sucesso.",
        });
      } else {
        await createWorkspace(formData);
        toast({
          title: "Workspace criado",
          description: "O workspace foi criado com sucesso.",
        });
      }
      
      setDialogOpen(false);
      resetForm();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao salvar o workspace.",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (workspace: any) => {
    setFormData({
      nome: workspace.nome,
      descricao: workspace.descricao || "",
      cor: workspace.cor,
      ativo: workspace.ativo,
    });
    setEditingId(workspace.id);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Tem certeza que deseja excluir este workspace?")) {
      const success = await deleteWorkspace(id);
      if (success) {
        toast({
          title: "Workspace excluído",
          description: "O workspace foi excluído com sucesso.",
        });
      } else {
        toast({
          title: "Erro",
          description: "Erro ao excluir o workspace.",
          variant: "destructive",
        });
      }
    }
  };

  const openWorkspace = (workspaceId: string) => {
    navigate(`/workspaces/${workspaceId}/folders`);
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Espaços de Trabalho</h1>
            <p className="text-muted-foreground">
              Organize seus projetos em espaços de trabalho
            </p>
          </div>
          
          <div className="flex gap-2">
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  className="bg-gradient-primary hover:opacity-90" 
                  onClick={() => {
                    if (!isAuthenticated) {
                      toast({ title: "Faça login", description: "Você precisa estar logado para criar workspaces.", variant: "destructive" });
                      return;
                    }
                    resetForm();
                  }}
                  disabled={!isAuthenticated}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Novo Workspace
                </Button>
              </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>
                  {editingId ? "Editar Workspace" : "Novo Workspace"}
                </DialogTitle>
                <DialogDescription>
                  {editingId ? "Edite as informações do workspace." : "Crie um novo workspace para organizar seus projetos."}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit}>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="nome">Nome</Label>
                    <Input
                      id="nome"
                      value={formData.nome}
                      onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                      placeholder="Nome do workspace"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="descricao">Descrição</Label>
                    <Textarea
                      id="descricao"
                      value={formData.descricao}
                      onChange={(e) => setFormData(prev => ({ ...prev, descricao: e.target.value }))}
                      placeholder="Descrição do workspace (opcional)"
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Cor</Label>
                    <div className="flex gap-2">
                      {colors.map((color) => (
                        <button
                          key={color}
                          type="button"
                          className={`w-8 h-8 rounded-full border-2 ${
                            formData.cor === color ? 'border-foreground' : 'border-muted'
                          }`}
                          style={{ backgroundColor: color }}
                          onClick={() => setFormData(prev => ({ ...prev, cor: color }))}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={!formData.nome.trim()}>
                    {editingId ? "Atualizar" : "Criar"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Buscar workspaces..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button variant="outline" size="sm">
            <Filter className="mr-2 h-4 w-4" />
            Filtros
          </Button>
        </div>

        {/* Workspaces Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredWorkspaces.map((workspace) => (
            <Card 
              key={workspace.id} 
              className="shadow-soft hover:shadow-medium transition-all duration-200 cursor-pointer group"
              onClick={() => openWorkspace(workspace.id)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-4 h-4 rounded-full flex-shrink-0"
                      style={{ backgroundColor: workspace.cor }}
                    ></div>
                    <CardTitle className="text-lg group-hover:text-primary transition-colors">
                      {workspace.nome}
                    </CardTitle>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openWorkspace(workspace.id); }}>
                        <FolderOpen className="mr-2 h-4 w-4" />
                        Abrir
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleEdit(workspace); }}>
                        <Settings className="mr-2 h-4 w-4" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className="text-destructive"
                        onClick={(e) => { e.stopPropagation(); handleDelete(workspace.id); }}
                      >
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                {workspace.descricao && (
                  <p className="text-sm text-muted-foreground line-clamp-2 mt-2">
                    {workspace.descricao}
                  </p>
                )}
              </CardHeader>
              
              <CardContent className="pt-0">
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>Criado em</span>
                  <span>{new Date(workspace.created_at).toLocaleDateString("pt-BR")}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredWorkspaces.length === 0 && !loading && (
          <div className="text-center py-12">
            <FolderOpen className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">Nenhum workspace encontrado</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm ? "Tente buscar com outros termos." : "Crie seu primeiro workspace para começar."}
            </p>
            {!searchTerm && (
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Criar Workspace
              </Button>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}