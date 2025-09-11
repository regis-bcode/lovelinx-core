import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Edit, Trash2, Upload } from "lucide-react";
import { useCommunicationPlan } from "@/hooks/useCommunicationPlan";
import { CommunicationPlanFormData } from "@/types/communication-plan";
import { useToast } from "@/hooks/use-toast";

interface CommunicationPlanListProps {
  projectId: string;
}

export function CommunicationPlanList({ projectId }: CommunicationPlanListProps) {
  const { communicationPlans, loading, createCommunicationPlan, updateCommunicationPlan, deleteCommunicationPlan } = useCommunicationPlan(projectId);
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<CommunicationPlanFormData>({
    project_id: projectId,
    codigo: '',
    comunicacao: '',
    objetivo: '',
    frequencia: '',
    responsavel: '',
    envolvidos: '',
    aprovadores: '',
    formato_arquivo: '',
    midia: '',
    canal_envio: '',
    idioma: '',
    conteudo: '',
    link_documento: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingId) {
        const result = await updateCommunicationPlan(editingId, formData);
        if (result) {
          toast({ title: "Plano de comunicação atualizado com sucesso!" });
        } else {
          throw new Error("Falha ao atualizar");
        }
      } else {
        const result = await createCommunicationPlan(formData);
        if (result) {
          toast({ title: "Plano de comunicação criado com sucesso!" });
        } else {
          throw new Error("Falha ao criar");
        }
      }
      
      resetForm();
      setIsDialogOpen(false);
    } catch (error) {
      toast({
        title: "Erro ao salvar plano de comunicação",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      project_id: projectId,
      codigo: '',
      comunicacao: '',
      objetivo: '',
      frequencia: '',
      responsavel: '',
      envolvidos: '',
      aprovadores: '',
      formato_arquivo: '',
      midia: '',
      canal_envio: '',
      idioma: '',
      conteudo: '',
      link_documento: '',
    });
    setEditingId(null);
  };

  const handleEdit = (plan: any) => {
    setFormData(plan);
    setEditingId(plan.id);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este plano de comunicação?')) {
      const result = await deleteCommunicationPlan(id);
      if (result) {
        toast({ title: "Plano de comunicação excluído com sucesso!" });
      } else {
        toast({ 
          title: "Erro ao excluir plano de comunicação", 
          variant: "destructive" 
        });
      }
    }
  };

  if (loading) {
    return <div>Carregando...</div>;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Plano de Comunicação</CardTitle>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Plano
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingId ? 'Editar Plano de Comunicação' : 'Novo Plano de Comunicação'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="codigo">Código</Label>
                  <Input
                    id="codigo"
                    value={formData.codigo}
                    onChange={(e) => setFormData({...formData, codigo: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="responsavel">Responsável</Label>
                  <Input
                    id="responsavel"
                    value={formData.responsavel || ''}
                    onChange={(e) => setFormData({...formData, responsavel: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="frequencia">Frequência</Label>
                  <Input
                    id="frequencia"
                    value={formData.frequencia || ''}
                    onChange={(e) => setFormData({...formData, frequencia: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="midia">Mídia</Label>
                  <Input
                    id="midia"
                    value={formData.midia || ''}
                    onChange={(e) => setFormData({...formData, midia: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="canal_envio">Canal de Envio</Label>
                  <Input
                    id="canal_envio"
                    value={formData.canal_envio || ''}
                    onChange={(e) => setFormData({...formData, canal_envio: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="idioma">Idioma</Label>
                  <Input
                    id="idioma"
                    value={formData.idioma || ''}
                    onChange={(e) => setFormData({...formData, idioma: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="formato_arquivo">Formato de Arquivo</Label>
                  <Input
                    id="formato_arquivo"
                    value={formData.formato_arquivo || ''}
                    onChange={(e) => setFormData({...formData, formato_arquivo: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="link_documento">Link do Documento</Label>
                  <Input
                    id="link_documento"
                    type="url"
                    value={formData.link_documento || ''}
                    onChange={(e) => setFormData({...formData, link_documento: e.target.value})}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="objetivo">Objetivo</Label>
                <Textarea
                  id="objetivo"
                  value={formData.objetivo || ''}
                  onChange={(e) => setFormData({...formData, objetivo: e.target.value})}
                  rows={2}
                />
              </div>
              <div>
                <Label htmlFor="envolvidos">Envolvidos</Label>
                <Textarea
                  id="envolvidos"
                  value={formData.envolvidos || ''}
                  onChange={(e) => setFormData({...formData, envolvidos: e.target.value})}
                  rows={2}
                />
              </div>
              <div>
                <Label htmlFor="aprovadores">Aprovadores</Label>
                <Textarea
                  id="aprovadores"
                  value={formData.aprovadores || ''}
                  onChange={(e) => setFormData({...formData, aprovadores: e.target.value})}
                  rows={2}
                />
              </div>
              <div>
                <Label htmlFor="conteudo">Conteúdo</Label>
                <Textarea
                  id="conteudo"
                  value={formData.conteudo || ''}
                  onChange={(e) => setFormData({...formData, conteudo: e.target.value})}
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="comunicacao">Comunicação/Anexos</Label>
                <div className="flex items-center space-x-2">
                  <Input
                    id="comunicacao"
                    value={formData.comunicacao || ''}
                    onChange={(e) => setFormData({...formData, comunicacao: e.target.value})}
                    placeholder="Nome do arquivo ou descrição"
                  />
                  <Button type="button" variant="outline" size="sm">
                    <Upload className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingId ? 'Atualizar' : 'Criar'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Objetivo</TableHead>
              <TableHead>Responsável</TableHead>
              <TableHead>Frequência</TableHead>
              <TableHead>Mídia</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {communicationPlans.map((plan) => (
              <TableRow key={plan.id}>
                <TableCell className="font-medium">{plan.codigo}</TableCell>
                <TableCell>{plan.objetivo || '-'}</TableCell>
                <TableCell>{plan.responsavel || '-'}</TableCell>
                <TableCell>{plan.frequencia || '-'}</TableCell>
                <TableCell>{plan.midia || '-'}</TableCell>
                <TableCell>
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(plan)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDelete(plan.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {communicationPlans.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            Nenhum plano de comunicação cadastrado
          </div>
        )}
      </CardContent>
    </Card>
  );
}