import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { DateInput } from "@/components/ui/date-input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Edit, Trash2, AlertTriangle } from "lucide-react";
import { useRisks } from "@/hooks/useRisks";
import { RiskFormData } from "@/types/risk";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

interface RisksListProps {
  projectId: string;
}

export function RisksList({ projectId }: RisksListProps) {
  const { risks, loading, createRisk, updateRisk, deleteRisk } = useRisks(projectId);
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<RiskFormData>({
    projectId,
    data: new Date().toISOString().split('T')[0],
    area: '',
    responsavel: '',
    situacao: '',
    probabilidade: 'Média',
    impacto: 'Médio',
    exposicao: 0,
    estrategiaResposta: 'Mitigar',
    planoAcao: '',
    dataLimite: '',
    condicaoPlanoAcao: '',
    tipoImpacto: 'Cronograma',
    custoRisco: 0,
    comentarios: '',
    statusPlanoAcao: 'Não Iniciado',
    statusRisco: 'Ativo',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingId) {
        updateRisk(editingId, formData);
        toast({ title: "Risco atualizado com sucesso!" });
      } else {
        createRisk(formData);
        toast({ title: "Risco criado com sucesso!" });
      }
      
      resetForm();
      setIsDialogOpen(false);
    } catch (error) {
      toast({
        title: "Erro ao salvar risco",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      projectId,
      data: new Date().toISOString().split('T')[0],
      area: '',
      responsavel: '',
      situacao: '',
      probabilidade: 'Média',
      impacto: 'Médio',
      exposicao: 0,
      estrategiaResposta: 'Mitigar',
      planoAcao: '',
      dataLimite: '',
      condicaoPlanoAcao: '',
      tipoImpacto: 'Cronograma',
      custoRisco: 0,
      comentarios: '',
      statusPlanoAcao: 'Não Iniciado',
      statusRisco: 'Ativo',
    });
    setEditingId(null);
  };

  const handleEdit = (risk: any) => {
    setFormData(risk);
    setEditingId(risk.id);
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este risco?')) {
      deleteRisk(id);
      toast({ title: "Risco excluído com sucesso!" });
    }
  };

  const getRiskBadgeVariant = (status: string) => {
    switch (status) {
      case 'Ativo': return 'destructive';
      case 'Mitigado': return 'secondary';
      case 'Fechado': return 'default';
      default: return 'outline';
    }
  };

  const getProbabilityColor = (prob: string) => {
    switch (prob) {
      case 'Alta': return 'text-destructive';
      case 'Média': return 'text-yellow-600';
      case 'Baixa': return 'text-green-600';
      default: return '';
    }
  };

  if (loading) {
    return <div>Carregando...</div>;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          Gestão de Riscos
        </CardTitle>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Risco
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingId ? 'Editar Risco' : 'Novo Risco'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="data">Data</Label>
                  <DateInput
                    id="data"
                    value={formData.data}
                    onChange={(value) => setFormData({...formData, data: value})}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="area">Área</Label>
                  <Input
                    id="area"
                    value={formData.area}
                    onChange={(e) => setFormData({...formData, area: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="responsavel">Responsável</Label>
                  <Input
                    id="responsavel"
                    value={formData.responsavel}
                    onChange={(e) => setFormData({...formData, responsavel: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="probabilidade">Probabilidade</Label>
                  <Select value={formData.probabilidade} onValueChange={(value: any) => setFormData({...formData, probabilidade: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Baixa">Baixa</SelectItem>
                      <SelectItem value="Média">Média</SelectItem>
                      <SelectItem value="Alta">Alta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="impacto">Impacto</Label>
                  <Select value={formData.impacto} onValueChange={(value: any) => setFormData({...formData, impacto: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Baixo">Baixo</SelectItem>
                      <SelectItem value="Médio">Médio</SelectItem>
                      <SelectItem value="Alto">Alto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="estrategiaResposta">Estratégia de Resposta</Label>
                  <Select value={formData.estrategiaResposta} onValueChange={(value: any) => setFormData({...formData, estrategiaResposta: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Aceitar">Aceitar</SelectItem>
                      <SelectItem value="Mitigar">Mitigar</SelectItem>
                      <SelectItem value="Transferir">Transferir</SelectItem>
                      <SelectItem value="Evitar">Evitar</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="tipoImpacto">Tipo de Impacto</Label>
                  <Select value={formData.tipoImpacto} onValueChange={(value: any) => setFormData({...formData, tipoImpacto: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Financeiro">Financeiro</SelectItem>
                      <SelectItem value="Cronograma">Cronograma</SelectItem>
                      <SelectItem value="Qualidade">Qualidade</SelectItem>
                      <SelectItem value="Escopo">Escopo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="custoRisco">Custo do Risco (R$)</Label>
                  <CurrencyInput
                    id="custoRisco"
                    value={formData.custoRisco}
                    onChange={(value) => setFormData({...formData, custoRisco: value ? Number(value) : 0})}
                    className="h-10"
                  />
                </div>
                <div>
                  <Label htmlFor="dataLimite">Data Limite</Label>
                  <DateInput
                    id="dataLimite"
                    value={formData.dataLimite}
                    onChange={(value) => setFormData({...formData, dataLimite: value})}
                  />
                </div>
                <div>
                  <Label htmlFor="statusRisco">Status do Risco</Label>
                  <Select value={formData.statusRisco} onValueChange={(value: any) => setFormData({...formData, statusRisco: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Ativo">Ativo</SelectItem>
                      <SelectItem value="Mitigado">Mitigado</SelectItem>
                      <SelectItem value="Fechado">Fechado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="situacao">Situação</Label>
                <Textarea
                  id="situacao"
                  value={formData.situacao}
                  onChange={(e) => setFormData({...formData, situacao: e.target.value})}
                  rows={2}
                />
              </div>
              <div>
                <Label htmlFor="planoAcao">Plano de Ação</Label>
                <Textarea
                  id="planoAcao"
                  value={formData.planoAcao}
                  onChange={(e) => setFormData({...formData, planoAcao: e.target.value})}
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="comentarios">Comentários</Label>
                <Textarea
                  id="comentarios"
                  value={formData.comentarios}
                  onChange={(e) => setFormData({...formData, comentarios: e.target.value})}
                  rows={2}
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
              <TableHead>Área</TableHead>
              <TableHead>Responsável</TableHead>
              <TableHead>Probabilidade</TableHead>
              <TableHead>Impacto</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Custo</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {risks.map((risk) => (
              <TableRow key={risk.id}>
                <TableCell>{risk.area}</TableCell>
                <TableCell>{risk.responsavel}</TableCell>
                <TableCell>
                  <span className={getProbabilityColor(risk.probabilidade)}>
                    {risk.probabilidade}
                  </span>
                </TableCell>
                <TableCell>{risk.impacto}</TableCell>
                <TableCell>
                  <Badge variant={getRiskBadgeVariant(risk.statusRisco)}>
                    {risk.statusRisco}
                  </Badge>
                </TableCell>
                <TableCell>
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
                    .format(Number(risk.custoRisco ?? 0))}
                </TableCell>
                <TableCell>
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(risk)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDelete(risk.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {risks.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            Nenhum risco cadastrado
          </div>
        )}
      </CardContent>
    </Card>
  );
}