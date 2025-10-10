import { useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Edit, Trash2, Download, Upload } from "lucide-react";
import { useStakeholders } from "@/hooks/useStakeholders";
import { Stakeholder, StakeholderFormData } from "@/types/stakeholder";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";

const NIVEL_OPTIONS: StakeholderFormData['nivel'][] = ['Executivo', 'Gerencial', 'Operacional'];
const TIPO_INFLUENCIA_OPTIONS: StakeholderFormData['tipo_influencia'][] = ['Alto', 'Médio', 'Baixo'];

interface StakeholdersListProps {
  projectId: string;
}

export function StakeholdersList({ projectId }: StakeholdersListProps) {
  const { stakeholders, loading, createStakeholder, updateStakeholder, deleteStakeholder } = useStakeholders(projectId);
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isImportResultOpen, setIsImportResultOpen] = useState(false);
  const [importedStakeholders, setImportedStakeholders] = useState<Stakeholder[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [formData, setFormData] = useState<StakeholderFormData>({
    project_id: projectId,
    nome: '',
    cargo: '',
    departamento: '',
    nivel: 'Operacional',
    email: '',
    telefone: '',
    tipo_influencia: 'Médio',
    interesses: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingId) {
        const result = await updateStakeholder(editingId, formData);
        if (result) {
          toast({ title: "Stakeholder atualizado com sucesso!" });
        } else {
          throw new Error("Falha ao atualizar");
        }
      } else {
        const result = await createStakeholder(formData);
        if (result) {
          toast({ title: "Stakeholder criado com sucesso!" });
        } else {
          throw new Error("Falha ao criar");
        }
      }
      
      resetForm();
      setIsDialogOpen(false);
    } catch (error) {
      toast({
        title: "Erro ao salvar stakeholder",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      project_id: projectId,
      nome: '',
      cargo: '',
      departamento: '',
      nivel: 'Operacional',
      email: '',
      telefone: '',
      tipo_influencia: 'Médio',
      interesses: '',
    });
    setEditingId(null);
  };

  const handleEdit = (stakeholder: Stakeholder) => {
    setFormData({
      project_id: stakeholder.project_id,
      nome: stakeholder.nome,
      cargo: stakeholder.cargo,
      departamento: stakeholder.departamento,
      nivel: stakeholder.nivel as StakeholderFormData['nivel'],
      email: stakeholder.email,
      telefone: stakeholder.telefone,
      tipo_influencia: stakeholder.tipo_influencia as StakeholderFormData['tipo_influencia'],
      interesses: stakeholder.interesses,
    });
    setEditingId(stakeholder.id);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este stakeholder?')) {
      const result = await deleteStakeholder(id);
      if (result) {
        toast({ title: "Stakeholder excluído com sucesso!" });
      } else {
        toast({
          title: "Erro ao excluir stakeholder",
          variant: "destructive"
        });
      }
    }
  };

  const handleExportTemplate = () => {
    const worksheet = XLSX.utils.json_to_sheet([
      {
        Nome: '',
        Cargo: '',
        Departamento: '',
        Nível: '',
        Email: '',
        Telefone: '',
        "Tipo de Influência": '',
        Interesses: '',
      }
    ]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Stakeholders');
    XLSX.writeFile(workbook, 'modelo-stakeholders.xlsx');
  };

  const handleImportData = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.target;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    try {
      setIsImporting(true);
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];

      if (!worksheet) {
        throw new Error('Planilha inválida');
      }

      const rows = XLSX.utils.sheet_to_json(worksheet, { defval: '' }) as Record<string, any>[];

      const formattedRows: StakeholderFormData[] = rows.map((row) => {
        const nome = String(row['Nome'] ?? '').trim();
        const cargo = String(row['Cargo'] ?? '').trim();
        const departamento = String(row['Departamento'] ?? '').trim();
        const email = String(row['Email'] ?? '').trim();
        const telefone = String(row['Telefone'] ?? '').trim();
        const interesses = String(row['Interesses'] ?? '').trim();

        const nivelValue = String(row['Nível'] ?? '').trim();
        const tipoInfluenciaValue = String(row['Tipo de Influência'] ?? '').trim();

        const nivel: StakeholderFormData['nivel'] = NIVEL_OPTIONS.includes(nivelValue as StakeholderFormData['nivel'])
          ? (nivelValue as StakeholderFormData['nivel'])
          : 'Operacional';

        const tipo_influencia: StakeholderFormData['tipo_influencia'] = TIPO_INFLUENCIA_OPTIONS.includes(
          tipoInfluenciaValue as StakeholderFormData['tipo_influencia']
        )
          ? (tipoInfluenciaValue as StakeholderFormData['tipo_influencia'])
          : 'Médio';

        return {
          project_id: projectId,
          nome,
          cargo,
          departamento,
          nivel,
          email,
          telefone,
          tipo_influencia,
          interesses,
        };
      }).filter((row) => row.nome && row.cargo && row.departamento && row.email);

      if (formattedRows.length === 0) {
        toast({
          title: 'Nenhum dado válido encontrado na planilha',
          variant: 'destructive',
        });
        return;
      }

      const created: Stakeholder[] = [];

      for (const row of formattedRows) {
        try {
          const result = await createStakeholder(row);
          if (result) {
            created.push(result);
          }
        } catch (error) {
          console.error('Erro ao importar stakeholder', error);
        }
      }

      if (created.length > 0) {
        setImportedStakeholders(created);
        setIsImportResultOpen(true);
        toast({
          title: 'Importação concluída',
          description: `${created.length} stakeholder(s) importado(s) com sucesso!`,
        });
      } else {
        toast({
          title: 'Não foi possível importar os dados',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error(error);
      toast({
        title: 'Erro ao importar planilha',
        variant: 'destructive',
      });
    } finally {
      input.value = '';
      setIsImporting(false);
    }
  };

  if (loading) {
    return <div>Carregando...</div>;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Mapa de Stakeholders</CardTitle>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <div className="flex items-center gap-2">
            <input
              type="file"
              accept=".xls,.xlsx"
              className="hidden"
              ref={fileInputRef}
              onChange={handleFileChange}
            />
            <Button variant="outline" onClick={handleExportTemplate}>
              <Download className="h-4 w-4 mr-2" />
              Exportar Modelo
            </Button>
            <Button variant="outline" onClick={handleImportData} disabled={isImporting}>
              <Upload className="h-4 w-4 mr-2" />
              {isImporting ? 'Importando...' : 'Importar Dados'}
            </Button>
            <DialogTrigger asChild>
              <Button onClick={() => resetForm()}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Stakeholder
              </Button>
            </DialogTrigger>
          </div>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingId ? 'Editar Stakeholder' : 'Novo Stakeholder'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="nome">Nome</Label>
                  <Input
                    id="nome"
                    value={formData.nome}
                    onChange={(e) => setFormData({...formData, nome: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="cargo">Cargo</Label>
                  <Input
                    id="cargo"
                    value={formData.cargo}
                    onChange={(e) => setFormData({...formData, cargo: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="departamento">Departamento</Label>
                  <Input
                    id="departamento"
                    value={formData.departamento}
                    onChange={(e) => setFormData({...formData, departamento: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="nivel">Nível</Label>
                  <Select
                    value={formData.nivel}
                    onValueChange={(value) =>
                      setFormData({ ...formData, nivel: value as StakeholderFormData['nivel'] })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Executivo">Executivo</SelectItem>
                      <SelectItem value="Gerencial">Gerencial</SelectItem>
                      <SelectItem value="Operacional">Operacional</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="telefone">Telefone</Label>
                  <Input
                    id="telefone"
                    value={formData.telefone}
                    onChange={(e) => setFormData({...formData, telefone: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="tipoInfluencia">Tipo de Influência</Label>
                  <Select
                    value={formData.tipo_influencia}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        tipo_influencia: value as StakeholderFormData['tipo_influencia'],
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Alto">Alto</SelectItem>
                      <SelectItem value="Médio">Médio</SelectItem>
                      <SelectItem value="Baixo">Baixo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="interesses">Interesses</Label>
                <Textarea
                  id="interesses"
                  value={formData.interesses}
                  onChange={(e) => setFormData({...formData, interesses: e.target.value})}
                  rows={3}
                />
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
              <TableHead>Nome</TableHead>
              <TableHead>Cargo</TableHead>
              <TableHead>Departamento</TableHead>
              <TableHead>Nível</TableHead>
              <TableHead>Influência</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {stakeholders.map((stakeholder) => (
              <TableRow key={stakeholder.id}>
                <TableCell>{stakeholder.nome}</TableCell>
                <TableCell>{stakeholder.cargo}</TableCell>
                <TableCell>{stakeholder.departamento}</TableCell>
                <TableCell>{stakeholder.nivel}</TableCell>
                <TableCell>{stakeholder.tipo_influencia}</TableCell>
                <TableCell>
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(stakeholder)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDelete(stakeholder.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {stakeholders.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            Nenhum stakeholder cadastrado
          </div>
        )}
      </CardContent>
      <Dialog open={isImportResultOpen} onOpenChange={setIsImportResultOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Importação concluída</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Os seguintes stakeholders foram importados para o projeto:
          </p>
          <div className="mt-4 max-h-64 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead>Departamento</TableHead>
                  <TableHead>Nível</TableHead>
                  <TableHead>Influência</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {importedStakeholders.map((stakeholder) => (
                  <TableRow key={stakeholder.id}>
                    <TableCell>{stakeholder.nome}</TableCell>
                    <TableCell>{stakeholder.cargo}</TableCell>
                    <TableCell>{stakeholder.departamento}</TableCell>
                    <TableCell>{stakeholder.nivel}</TableCell>
                    <TableCell>{stakeholder.tipo_influencia}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="flex justify-end">
            <Button onClick={() => setIsImportResultOpen(false)}>Fechar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}