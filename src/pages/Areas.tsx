import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2 } from 'lucide-react';
import { useAreas } from '@/hooks/useAreas';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export default function Areas() {
  const { areas, loading, createArea, refreshAreas } = useAreas();
  const { toast } = useToast();
  const { user } = useAuth();
  const [newArea, setNewArea] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    if (!newArea.trim()) {
      toast({
        title: 'Atenção',
        description: 'Digite o nome da área.',
        variant: 'destructive',
      });
      return;
    }

    setIsCreating(true);
    const result = await createArea(newArea.trim());
    setIsCreating(false);

    if (result) {
      setNewArea('');
    }
  };

  const handleDelete = async (id: string, nome: string) => {
    if (!user?.id) return;

    if (!confirm(`Tem certeza que deseja excluir a área "${nome}"?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('areas')
        .update({ ativo: false })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Área excluída',
        description: `Área "${nome}" foi excluída com sucesso.`,
      });

      refreshAreas();
    } catch (error) {
      console.error('Erro ao excluir área:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível excluir a área.',
        variant: 'destructive',
      });
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Áreas</h1>
          <p className="text-muted-foreground">Gerencie as áreas do sistema</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Adicionar Nova Área</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                placeholder="Nome da área"
                value={newArea}
                onChange={(e) => setNewArea(e.target.value)}
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
            <CardTitle>Áreas Cadastradas</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Carregando...</div>
            ) : areas.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma área cadastrada
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead className="w-[100px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {areas.map((area) => (
                    <TableRow key={area.id}>
                      <TableCell>{area.nome}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(area.id, area.nome)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
