import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useServices } from '@/hooks/useServices';
import { useProducts } from '@/hooks/useProducts';
import { CreateServiceData } from '@/types/service';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { GlassPanelHeader } from '@/components/common/GlassPanelHeader';

export default function Services() {
  const { services, createService, updateService, deleteService, isCreating, isUpdating, isDeleting } = useServices();
  const { products } = useProducts();
  const { toast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingService, setEditingService] = useState<any>(null);
  const [formData, setFormData] = useState<CreateServiceData>({
    id_servico: '',
    descricao: '',
    id_produto: ''
  });

  const resetForm = () => {
    setFormData({
      id_servico: '',
      descricao: '',
      id_produto: ''
    });
    setEditingService(null);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.id_produto) {
      toast({
        title: "Erro",
        description: "Selecione um produto para o serviço.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      await createService(formData);
      setIsCreateOpen(false);
      resetForm();
    } catch (error) {
      console.error('Erro ao criar serviço:', error);
    }
  };

  const handleEdit = (service: any) => {
    setEditingService(service);
    setFormData({
      id_servico: service.id_servico,
      descricao: service.descricao,
      id_produto: service.id_produto
    });
    setIsEditOpen(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingService || !formData.id_produto) return;
    
    try {
      await updateService({ id: editingService.id, serviceData: formData });
      setIsEditOpen(false);
      resetForm();
    } catch (error) {
      console.error('Erro ao atualizar serviço:', error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteService(id);
    } catch (error) {
      console.error('Erro ao excluir serviço:', error);
    }
  };

  const totalServices = services?.length ?? 0;
  const activeServices = services?.filter((service) => service.ativo)?.length ?? 0;

  return (
    <DashboardLayout>
      <div className="space-y-8 pb-10">
        <GlassPanelHeader
          eyebrow="Central de Serviços"
          title="Gerenciar Serviços"
          description="Cadastre, mantenha e acompanhe os serviços vinculados aos produtos do seu portfólio."
          actions={(
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button size="lg" className="shadow-[0_18px_40px_rgba(14,116,144,0.28)]">
                  <Plus className="mr-2 h-4 w-4" />
                  Novo Serviço
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Adicionar Novo Serviço</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreate} className="space-y-4">
                  <div>
                    <Label htmlFor="id_servico">ID do Serviço *</Label>
                    <Input
                      id="id_servico"
                      value={formData.id_servico}
                      onChange={(e) => setFormData({ ...formData, id_servico: e.target.value })}
                      placeholder="ex: servico_001"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="descricao">Descrição *</Label>
                    <Input
                      id="descricao"
                      value={formData.descricao}
                      onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                      placeholder="ex: Consultoria Especializada"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="id_produto">Produto *</Label>
                    <Select
                      value={formData.id_produto}
                      onValueChange={(value) => setFormData({ ...formData, id_produto: value })}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um produto" />
                      </SelectTrigger>
                      <SelectContent>
                        {products?.map((product) => (
                          <SelectItem key={product.id} value={product.id}>
                            {product.descricao}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => {
                      setIsCreateOpen(false);
                      resetForm();
                    }}>
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={isCreating}>
                      {isCreating ? 'Criando...' : 'Criar'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}
        >
          <div className="inline-flex flex-wrap gap-3">
            <span className="inline-flex items-center rounded-full bg-primary/15 px-4 py-1 text-sm font-medium text-primary">
              {totalServices} serviços cadastrados
            </span>
            <span className="inline-flex items-center rounded-full bg-emerald-500/15 px-4 py-1 text-sm font-medium text-emerald-600">
              {activeServices} ativos
            </span>
          </div>
        </GlassPanelHeader>

        <Card className="border-white/40 bg-white/60 shadow-[0_25px_60px_-30px_rgba(15,23,42,0.6)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/60">
          <CardHeader>
            <CardTitle className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Lista de Serviços</CardTitle>
            <CardDescription>
              Visualize e mantenha os serviços disponíveis e seus respectivos produtos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID do Serviço</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {services?.map((service) => (
                  <TableRow key={service.id}>
                    <TableCell className="font-medium">{service.id_servico}</TableCell>
                    <TableCell>{service.descricao}</TableCell>
                    <TableCell>{service.products?.descricao || 'N/A'}</TableCell>
                    <TableCell>
                      <Badge variant={service.ativo ? "default" : "secondary"}>
                        {service.ativo ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(service)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir Serviço</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja excluir o serviço "{service.descricao}"?
                                Esta ação não pode ser desfeita.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(service.id)}
                                disabled={isDeleting}
                              >
                                {isDeleting ? 'Excluindo...' : 'Excluir'}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {(!services || services.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                      Nenhum serviço encontrado. Clique em "Novo Serviço" para começar.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Editar Serviço</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <Label htmlFor="edit_id_servico">ID do Serviço *</Label>
                <Input
                  id="edit_id_servico"
                  value={formData.id_servico}
                  onChange={(e) => setFormData({ ...formData, id_servico: e.target.value })}
                  placeholder="ex: servico_001"
                  required
                />
              </div>

              <div>
                <Label htmlFor="edit_descricao">Descrição *</Label>
                <Input
                  id="edit_descricao"
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  placeholder="ex: Consultoria Especializada"
                  required
                />
              </div>

              <div>
                <Label htmlFor="edit_id_produto">Produto *</Label>
                <Select
                  value={formData.id_produto}
                  onValueChange={(value) => setFormData({ ...formData, id_produto: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um produto" />
                  </SelectTrigger>
                  <SelectContent>
                    {products?.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.descricao}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => {
                  setIsEditOpen(false);
                  resetForm();
                }}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isUpdating}>
                  {isUpdating ? 'Salvando...' : 'Salvar'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}