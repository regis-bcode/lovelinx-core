import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Project, ProjectFormData } from "@/types/project";
import { useToast } from "@/hooks/use-toast";
import { 
  FileText, 
  DollarSign, 
  Calendar, 
  FileEdit,
  Save
} from "lucide-react";

interface ProjectTabsProps {
  project?: Project;
  onSave: (data: Partial<ProjectFormData>) => Promise<void>;
  isLoading?: boolean;
}

export function ProjectTabs({ project, onSave, isLoading = false }: ProjectTabsProps) {
  const [formData, setFormData] = useState<Partial<ProjectFormData>>({
    // Identificação
    data: project?.data || '',
    cod_cliente: project?.cod_cliente || '',
    nome_projeto: project?.nome_projeto || '',
    cliente: project?.cliente || '',
    gpp: project?.gpp || '',
    coordenador: project?.coordenador || '',
    produto: project?.produto || '',
    esn: project?.esn || '',
    arquiteto: project?.arquiteto || '',
    criticidade: project?.criticidade || 'Média',
    drive: project?.drive || '',
    
    // Financeiro
    valor_projeto: project?.valor_projeto || 0,
    receita_atual: project?.receita_atual || 0,
    margem_venda_percent: project?.margem_venda_percent || 0,
    margem_atual_percent: project?.margem_atual_percent || 0,
    margem_venda_reais: project?.margem_venda_reais || 0,
    margem_atual_reais: project?.margem_atual_reais || 0,
    mrr: project?.mrr || 0,
    investimento_perdas: project?.investimento_perdas || 0,
    mrr_total: project?.mrr_total || 0,
    investimento_comercial: project?.investimento_comercial || 0,
    psa_planejado: project?.psa_planejado || 0,
    investimento_erro_produto: project?.investimento_erro_produto || 0,
    diferenca_psa_projeto: project?.diferenca_psa_projeto || 0,
    projeto_em_perda: project?.projeto_em_perda || false,
    
    // Timeline
    data_inicio: project?.data_inicio || '',
    go_live_previsto: project?.go_live_previsto || '',
    duracao_pos_producao: project?.duracao_pos_producao || 0,
    encerramento: project?.encerramento || '',
    
    // Outros
    escopo: project?.escopo || '',
    objetivo: project?.objetivo || '',
    observacao: project?.observacao || '',
  });

  const { toast } = useToast();

  const handleSave = async (tab: string) => {
    try {
      await onSave(formData);
      toast({
        title: "Sucesso",
        description: `Aba ${tab} salva com sucesso!`,
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: `Erro ao salvar a aba ${tab}.`,
        variant: "destructive",
      });
    }
  };

  const updateField = (field: keyof ProjectFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Tabs defaultValue="identificacao" className="w-full">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="identificacao" className="flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Identificação
        </TabsTrigger>
        <TabsTrigger value="financeiro" className="flex items-center gap-2">
          <DollarSign className="h-4 w-4" />
          Financeiro
        </TabsTrigger>
        <TabsTrigger value="timeline" className="flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          Timeline
        </TabsTrigger>
        <TabsTrigger value="outros" className="flex items-center gap-2">
          <FileEdit className="h-4 w-4" />
          Outros
        </TabsTrigger>
      </TabsList>

      {/* Aba Identificação */}
      <TabsContent value="identificacao" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Identificação do Projeto (TAP)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="data">Data *</Label>
                <Input
                  id="data"
                  type="date"
                  value={formData.data}
                  onChange={(e) => updateField('data', e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="cod_cliente">Código Cliente *</Label>
                <Input
                  id="cod_cliente"
                  value={formData.cod_cliente}
                  onChange={(e) => updateField('cod_cliente', e.target.value)}
                  placeholder="Ex: CLI001"
                  required
                />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="nome_projeto">Nome do Projeto *</Label>
                <Input
                  id="nome_projeto"
                  value={formData.nome_projeto}
                  onChange={(e) => updateField('nome_projeto', e.target.value)}
                  placeholder="Nome completo do projeto"
                  required
                />
              </div>
              <div>
                <Label htmlFor="cliente">Cliente *</Label>
                <Input
                  id="cliente"
                  value={formData.cliente}
                  onChange={(e) => updateField('cliente', e.target.value)}
                  placeholder="Nome do cliente"
                  required
                />
              </div>
              <div>
                <Label htmlFor="gpp">GPP *</Label>
                <Input
                  id="gpp"
                  value={formData.gpp}
                  onChange={(e) => updateField('gpp', e.target.value)}
                  placeholder="Gerente de Projetos Principal"
                  required
                />
              </div>
              <div>
                <Label htmlFor="coordenador">Coordenador *</Label>
                <Input
                  id="coordenador"
                  value={formData.coordenador}
                  onChange={(e) => updateField('coordenador', e.target.value)}
                  placeholder="Coordenador do projeto"
                  required
                />
              </div>
              <div>
                <Label htmlFor="produto">Produto *</Label>
                <Input
                  id="produto"
                  value={formData.produto}
                  onChange={(e) => updateField('produto', e.target.value)}
                  placeholder="Produto/Solução"
                  required
                />
              </div>
              <div>
                <Label htmlFor="esn">ESN *</Label>
                <Input
                  id="esn"
                  value={formData.esn}
                  onChange={(e) => updateField('esn', e.target.value)}
                  placeholder="Enterprise Solution Number"
                  required
                />
              </div>
              <div>
                <Label htmlFor="arquiteto">Arquiteto *</Label>
                <Input
                  id="arquiteto"
                  value={formData.arquiteto}
                  onChange={(e) => updateField('arquiteto', e.target.value)}
                  placeholder="Arquiteto da solução"
                  required
                />
              </div>
              <div>
                <Label htmlFor="criticidade">Criticidade *</Label>
                <Select
                  value={formData.criticidade}
                  onValueChange={(value) => updateField('criticidade', value as 'Baixa' | 'Média' | 'Alta' | 'Crítica')}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Baixa">Baixa</SelectItem>
                    <SelectItem value="Média">Média</SelectItem>
                    <SelectItem value="Alta">Alta</SelectItem>
                    <SelectItem value="Crítica">Crítica</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="drive">Drive (Link)</Label>
                <Input
                  id="drive"
                  value={formData.drive}
                  onChange={(e) => updateField('drive', e.target.value)}
                  placeholder="Link do Google Drive"
                />
              </div>
            </div>
            <Button onClick={() => handleSave('Identificação')} disabled={isLoading}>
              <Save className="mr-2 h-4 w-4" />
              Salvar Identificação
            </Button>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Aba Financeiro */}
      <TabsContent value="financeiro" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Informações Financeiras
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="valor_projeto">Valor do Projeto (R$)</Label>
                <Input
                  id="valor_projeto"
                  type="number"
                  step="0.01"
                  value={formData.valor_projeto}
                  onChange={(e) => updateField('valor_projeto', parseFloat(e.target.value) || 0)}
                />
              </div>
              <div>
                <Label htmlFor="receita_atual">Receita Atual (R$)</Label>
                <Input
                  id="receita_atual"
                  type="number"
                  step="0.01"
                  value={formData.receita_atual}
                  onChange={(e) => updateField('receita_atual', parseFloat(e.target.value) || 0)}
                />
              </div>
              <div>
                <Label htmlFor="margem_venda_percent">Margem Venda (%)</Label>
                <Input
                  id="margem_venda_percent"
                  type="number"
                  step="0.01"
                  value={formData.margem_venda_percent}
                  onChange={(e) => updateField('margem_venda_percent', parseFloat(e.target.value) || 0)}
                />
              </div>
              <div>
                <Label htmlFor="margem_atual_percent">Margem Atual (%)</Label>
                <Input
                  id="margem_atual_percent"
                  type="number"
                  step="0.01"
                  value={formData.margem_atual_percent}
                  onChange={(e) => updateField('margem_atual_percent', parseFloat(e.target.value) || 0)}
                />
              </div>
              <div>
                <Label htmlFor="margem_venda_reais">Margem Venda (R$)</Label>
                <Input
                  id="margem_venda_reais"
                  type="number"
                  step="0.01"
                  value={formData.margem_venda_reais}
                  onChange={(e) => updateField('margem_venda_reais', parseFloat(e.target.value) || 0)}
                />
              </div>
              <div>
                <Label htmlFor="margem_atual_reais">Margem Atual (R$)</Label>
                <Input
                  id="margem_atual_reais"
                  type="number"
                  step="0.01"
                  value={formData.margem_atual_reais}
                  onChange={(e) => updateField('margem_atual_reais', parseFloat(e.target.value) || 0)}
                />
              </div>
              <div>
                <Label htmlFor="mrr">MRR (R$)</Label>
                <Input
                  id="mrr"
                  type="number"
                  step="0.01"
                  value={formData.mrr}
                  onChange={(e) => updateField('mrr', parseFloat(e.target.value) || 0)}
                />
              </div>
              <div>
                <Label htmlFor="investimento_perdas">Investimento Perdas (R$)</Label>
                <Input
                  id="investimento_perdas"
                  type="number"
                  step="0.01"
                  value={formData.investimento_perdas}
                  onChange={(e) => updateField('investimento_perdas', parseFloat(e.target.value) || 0)}
                />
              </div>
              <div>
                <Label htmlFor="mrr_total">MRR Total (R$)</Label>
                <Input
                  id="mrr_total"
                  type="number"
                  step="0.01"
                  value={formData.mrr_total}
                  onChange={(e) => updateField('mrr_total', parseFloat(e.target.value) || 0)}
                />
              </div>
              <div>
                <Label htmlFor="investimento_comercial">Investimento Comercial (R$)</Label>
                <Input
                  id="investimento_comercial"
                  type="number"
                  step="0.01"
                  value={formData.investimento_comercial}
                  onChange={(e) => updateField('investimento_comercial', parseFloat(e.target.value) || 0)}
                />
              </div>
              <div>
                <Label htmlFor="psa_planejado">PSA Planejado (R$)</Label>
                <Input
                  id="psa_planejado"
                  type="number"
                  step="0.01"
                  value={formData.psa_planejado}
                  onChange={(e) => updateField('psa_planejado', parseFloat(e.target.value) || 0)}
                />
              </div>
              <div>
                <Label htmlFor="investimento_erro_produto">Investimento Erro Produto (R$)</Label>
                <Input
                  id="investimento_erro_produto"
                  type="number"
                  step="0.01"
                  value={formData.investimento_erro_produto}
                  onChange={(e) => updateField('investimento_erro_produto', parseFloat(e.target.value) || 0)}
                />
              </div>
              <div>
                <Label htmlFor="diferenca_psa_projeto">Diferença PSA/Projeto (R$)</Label>
                <Input
                  id="diferenca_psa_projeto"
                  type="number"
                  step="0.01"
                  value={formData.diferenca_psa_projeto}
                  onChange={(e) => updateField('diferenca_psa_projeto', parseFloat(e.target.value) || 0)}
                />
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="projeto_em_perda"
                  checked={formData.projeto_em_perda}
                  onCheckedChange={(checked) => updateField('projeto_em_perda', checked)}
                />
                <Label htmlFor="projeto_em_perda">Projeto em Perda</Label>
              </div>
            </div>
            <Button onClick={() => handleSave('Financeiro')} disabled={isLoading}>
              <Save className="mr-2 h-4 w-4" />
              Salvar Financeiro
            </Button>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Aba Timeline */}
      <TabsContent value="timeline" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Timeline do Projeto
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="data_inicio">Data de Início</Label>
                <Input
                  id="data_inicio"
                  type="date"
                  value={formData.data_inicio}
                  onChange={(e) => updateField('data_inicio', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="go_live_previsto">Go Live Previsto</Label>
                <Input
                  id="go_live_previsto"
                  type="date"
                  value={formData.go_live_previsto}
                  onChange={(e) => updateField('go_live_previsto', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="duracao_pos_producao">Duração Pós-Produção (dias)</Label>
                <Input
                  id="duracao_pos_producao"
                  type="number"
                  value={formData.duracao_pos_producao}
                  onChange={(e) => updateField('duracao_pos_producao', parseInt(e.target.value) || 0)}
                />
              </div>
              <div>
                <Label htmlFor="encerramento">Data de Encerramento</Label>
                <Input
                  id="encerramento"
                  type="date"
                  value={formData.encerramento}
                  onChange={(e) => updateField('encerramento', e.target.value)}
                />
              </div>
            </div>
            <Button onClick={() => handleSave('Timeline')} disabled={isLoading}>
              <Save className="mr-2 h-4 w-4" />
              Salvar Timeline
            </Button>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Aba Outros */}
      <TabsContent value="outros" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileEdit className="h-5 w-5" />
              Informações Adicionais
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="escopo">Escopo</Label>
              <Textarea
                id="escopo"
                value={formData.escopo}
                onChange={(e) => updateField('escopo', e.target.value)}
                placeholder="Descreva o escopo do projeto"
                rows={4}
              />
            </div>
            <div>
              <Label htmlFor="objetivo">Objetivo</Label>
              <Textarea
                id="objetivo"
                value={formData.objetivo}
                onChange={(e) => updateField('objetivo', e.target.value)}
                placeholder="Descreva o objetivo do projeto"
                rows={4}
              />
            </div>
            <div>
              <Label htmlFor="observacao">Observações</Label>
              <Textarea
                id="observacao"
                value={formData.observacao}
                onChange={(e) => updateField('observacao', e.target.value)}
                placeholder="Observações gerais sobre o projeto"
                rows={4}
              />
            </div>
            <Button onClick={() => handleSave('Outros')} disabled={isLoading}>
              <Save className="mr-2 h-4 w-4" />
              Salvar Outros
            </Button>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}