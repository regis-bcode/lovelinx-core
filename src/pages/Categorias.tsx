import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2 } from 'lucide-react';
import { useCategorias } from '@/hooks/useCategorias';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export default function Categorias() {
  const { categorias, loading, createCategoria, refreshCategorias } = useCategorias();
  const { toast } = useToast();
  const { user } = useAuth();
  const [newCategoria, setNewCategoria] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    if (!newCategoria.trim()) {
      toast({
        title: 'Atenção',
        description: 'Digite o nome da categoria.',
        variant: 'destructive',
      });
      return;
    }

    setIsCreating(true);
    const result = await createCategoria(newCategoria.trim());
    setIsCreating(false);

    if (result) {
      setNewCategoria('');
    }
  };

  const handleDelete = async (id: string, nome: string) => {
    if (!user?.id) return;

    if (!confirm(`Tem certeza que deseja excluir a categoria "${nome}"?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('categorias')
        .update({ ativo: false })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Categoria excluída',
        description: `Categoria "${nome}" foi excluída com sucesso.`,
      });

      refreshCategorias();
    } catch (error) {
      console.error('Erro ao excluir categoria:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível excluir a categoria.',
        variant: 'destructive',
      });
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Categorias</h1>
          <p className="text-muted-foreground">Gerencie as categorias do sistema</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Adicionar Nova Categoria</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                placeholder="Nome da categoria"
                value={newCategoria}
                onChange={(e) => setNewCategoria(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              />
              <Button onClick={handleCreate} disabled={isCreating}>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Categorias Cadastradas</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Carregando...</div>
            ) : categorias.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma categoria cadastrada
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table className="min-w-[480px] w-full">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead className="w-[100px]">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {categorias.map((categoria) => (
                      <TableRow key={categoria.id}>
                        <TableCell>{categoria.nome}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(categoria.id, categoria.nome)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
