import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2 } from 'lucide-react';
import { useModulos } from '@/hooks/useModulos';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export default function Modulos() {
  const { modulos, loading, createModulo, refreshModulos } = useModulos();
  const { toast } = useToast();
  const { user } = useAuth();
  const [newModulo, setNewModulo] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    if (!newModulo.trim()) {
      toast({
        title: 'Atenção',
        description: 'Digite o nome do módulo.',
        variant: 'destructive',
      });
      return;
    }

    setIsCreating(true);
    const result = await createModulo(newModulo.trim());
    setIsCreating(false);

    if (result) {
      setNewModulo('');
    }
  };

  const handleDelete = async (id: string, nome: string) => {
    if (!user?.id) return;

    if (!confirm(`Tem certeza que deseja excluir o módulo "${nome}"?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('modulos')
        .update({ ativo: false })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Módulo excluído',
        description: `Módulo "${nome}" foi excluído com sucesso.`,
      });

      refreshModulos();
    } catch (error) {
      console.error('Erro ao excluir módulo:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível excluir o módulo.',
        variant: 'destructive',
      });
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Módulos</h1>
          <p className="text-muted-foreground">Gerencie os módulos do sistema</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Adicionar Novo Módulo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                placeholder="Nome do módulo"
                value={newModulo}
                onChange={(e) => setNewModulo(e.target.value)}
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
            <CardTitle>Módulos Cadastrados</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Carregando...</div>
            ) : modulos.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum módulo cadastrado
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
                    {modulos.map((modulo) => (
                      <TableRow key={modulo.id}>
                        <TableCell>{modulo.nome}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(modulo.id, modulo.nome)}
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
