import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
  Folder,
  ArrowLeft,
  Settings
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
import { useFolders } from "@/hooks/useFolders";
import { useWorkspaces } from "@/hooks/useWorkspaces";
import { FolderFormData } from "@/types/folder";
import { useToast } from "@/hooks/use-toast";

const colors = [
  '#3B82F6', '#EF4444', '#10B981', '#F59E0B', 
  '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'
];

export default function Folders() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FolderFormData>({
    nome: "",
    descricao: "",
    cor: colors[0],
    workspace_id: workspaceId || "",
  });

  const { folders, loading, createFolder, updateFolder, deleteFolder } = useFolders(workspaceId);
  const { getWorkspace } = useWorkspaces();
  const { toast } = useToast();

  const workspace = workspaceId ? getWorkspace(workspaceId) : null;

  const filteredFolders = folders.filter(folder =>
    folder.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    folder.descricao?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const resetForm = () => {
    setFormData({
      nome: "",
      descricao: "",
      cor: colors[0],
      workspace_id: workspaceId || "",
    });
    setEditingId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingId) {
        await updateFolder(editingId, formData);
        toast({
          title: "Pasta atualizada",
          description: "A pasta foi atualizada com sucesso.",
        });
      } else {
        await createFolder(formData);
        toast({
          title: "Pasta criada",
          description: "A pasta foi criada com sucesso.",
        });
      }
      
      setDialogOpen(false);
      resetForm();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao salvar a pasta.",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (folder: any) => {
    setFormData({
      nome: folder.nome,
      descricao: folder.descricao || "",
      cor: folder.cor,
      workspace_id: folder.workspace_id,
    });
    setEditingId(folder.id);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Tem certeza que deseja excluir esta pasta?")) {
      const success = await deleteFolder(id);
      if (success) {
        toast({
          title: "Pasta excluída",
          description: "A pasta foi excluída com sucesso.",
        });
      } else {
        toast({
          title: "Erro",
          description: "Erro ao excluir a pasta.",
          variant: "destructive",
        });
      }
    }
  };

  const openFolder = (folderId: string) => {
    navigate(`/workspaces/${workspaceId}/folders/${folderId}/projects`);
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
            <div className="flex items-center gap-2 mb-2">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigate("/workspaces")}
                className="p-1"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <span>Workspaces</span>
                <span>/</span>
                <span className="text-foreground">{workspace?.nome}</span>
              </div>
            </div>
            <h1 className="text-3xl font-bold text-foreground">Pastas de Trabalho</h1>
            <p className="text-muted-foreground">
              Organize seus projetos em pastas dentro do workspace
            </p>
          </div>
          
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-primary hover:opacity-90" onClick={() => resetForm()}>
                <Plus className="mr-2 h-4 w-4" />
                Nova Pasta
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>
                  {editingId ? "Editar Pasta" : "Nova Pasta"}
                </DialogTitle>
                <DialogDescription>
                  {editingId ? "Edite as informações da pasta." : "Crie uma nova pasta para organizar seus projetos."}
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
                      placeholder="Nome da pasta"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="descricao">Descrição</Label>
                    <Textarea
                      id="descricao"
                      value={formData.descricao}
                      onChange={(e) => setFormData(prev => ({ ...prev, descricao: e.target.value }))}
                      placeholder="Descrição da pasta (opcional)"
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

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Buscar pastas..."
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

        {/* Folders Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredFolders.map((folder) => (
            <Card 
              key={folder.id} 
              className="shadow-soft hover:shadow-medium transition-all duration-200 cursor-pointer group"
              onClick={() => openFolder(folder.id)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-4 h-4 rounded-full flex-shrink-0"
                      style={{ backgroundColor: folder.cor }}
                    ></div>
                    <CardTitle className="text-lg group-hover:text-primary transition-colors">
                      {folder.nome}
                    </CardTitle>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openFolder(folder.id); }}>
                        <Folder className="mr-2 h-4 w-4" />
                        Abrir
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleEdit(folder); }}>
                        <Settings className="mr-2 h-4 w-4" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className="text-destructive"
                        onClick={(e) => { e.stopPropagation(); handleDelete(folder.id); }}
                      >
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                {folder.descricao && (
                  <p className="text-sm text-muted-foreground line-clamp-2 mt-2">
                    {folder.descricao}
                  </p>
                )}
              </CardHeader>
              
              <CardContent className="pt-0">
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>Criada em</span>
                  <span>{new Date(folder.created_at).toLocaleDateString("pt-BR")}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredFolders.length === 0 && !loading && (
          <div className="text-center py-12">
            <Folder className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">Nenhuma pasta encontrada</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm ? "Tente buscar com outros termos." : "Crie sua primeira pasta para começar."}
            </p>
            {!searchTerm && (
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Criar Pasta
              </Button>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}