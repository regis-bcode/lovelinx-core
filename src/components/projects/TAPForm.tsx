import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Calendar, DollarSign, FileText, Target, Save } from "lucide-react";
import { useTAP } from "@/hooks/useTAP";
import { TAPFormData } from "@/types/tap";
import { useToast } from "@/hooks/use-toast";
import { TAPSummaryDialog } from "@/components/common/TAPSummaryDialog";

interface TAPFormProps {
  folderId?: string | null;
  onSuccess?: (tapId: string) => void;
}

export function TAPForm({ folderId, onSuccess }: TAPFormProps) {
  const navigate = useNavigate();
  const { createTAP } = useTAP();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [summaryDialogOpen, setSummaryDialogOpen] = useState(false);
  const [createdTAP, setCreatedTAP] = useState<any>(null);

  const [formData, setFormData] = useState<Partial<TAPFormData>>({
    // Identificação
    data: new Date().toISOString().split('T')[0],
    nome_projeto: '',
    cod_cliente: '',
    gpp: '',
    produto: '',
    arquiteto: '',
    criticidade_totvs: 'Média',
    coordenador: '',
    gerente_projeto: '',
    gerente_portfolio: '',
    gerente_escritorio: '',
    esn: '',
    criticidade_cliente: '',
    drive: '',
    
    // Timeline
    data_inicio: '',
    go_live_previsto: '',
    duracao_pos_producao: 0,
    encerramento: '',
    
    // Escopo e Objetivo
    escopo: '',
    objetivo: '',
    observacoes: '',
    
    // Financeiro
    valor_projeto: 0,
    margem_venda_percent: 0,
    margem_venda_valor: 0,
    mrr: 0,
    mrr_total: 0,
    psa_planejado: 0,
    diferenca_psa_projeto: 0,
    receita_atual: 0,
    margem_atual_percent: 0,
    margem_atual_valor: 0,
    investimento_perdas: 0,
    investimento_comercial: 0,
    investimento_erro_produto: 0,
    projeto_em_perda: false,

    // Projeto ID será definido após criação
    project_id: ''
  });

  const updateFormData = (field: keyof TAPFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validação básica
    if (!formData.nome_projeto || !formData.cod_cliente || !formData.gpp) {
      toast({
        title: "Erro",
        description: "Preencha os campos obrigatórios: Nome do Projeto, Código do Cliente e GPP.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Primeiro criar o projeto básico
      const projectData = {
        nome_projeto: formData.nome_projeto,
        cod_cliente: formData.cod_cliente,
        folder_id: folderId || null,
      };

      // Simular criação de projeto (você pode ajustar isso conforme sua estrutura)
      const tempProjectId = crypto.randomUUID();
      
      // Criar TAP com o ID do projeto
      const tapData = {
        ...formData,
        project_id: tempProjectId,
      } as TAPFormData;

      const newTAP = await createTAP(tapData);
      
      if (newTAP) {
        setCreatedTAP(newTAP);
        setSummaryDialogOpen(true);
      }
    } catch (error) {
      console.error('Erro ao criar TAP:', error);
      toast({
        title: "Erro",
        description: "Erro ao criar TAP.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSummaryComplete = () => {
    if (onSuccess && createdTAP) {
      onSuccess(createdTAP.id);
    } else if (createdTAP) {
      navigate(`/projects-tap/${createdTAP.id}`);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Nova TAP do Projeto
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="identificacao" className="w-full">
            <TabsList className="grid w-full grid-cols-2 md:grid-cols-4">
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
                Timeline do Projeto
              </TabsTrigger>
              <TabsTrigger value="outros" className="flex items-center gap-2">
                <Target className="h-4 w-4" />
                Outros dados
              </TabsTrigger>
            </TabsList>

            <TabsContent value="identificacao" className="mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="data">Data *</Label>
                  <Input
                    id="data"
                    type="date"
                    value={formData.data}
                    onChange={(e) => updateFormData('data', e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="cod_cliente">Cod. Cliente *</Label>
                  <Input
                    id="cod_cliente"
                    value={formData.cod_cliente}
                    onChange={(e) => updateFormData('cod_cliente', e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="nome_projeto">Nome do Projeto *</Label>
                  <Input
                    id="nome_projeto"
                    value={formData.nome_projeto}
                    onChange={(e) => updateFormData('nome_projeto', e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="gpp">GPP *</Label>
                  <Input
                    id="gpp"
                    value={formData.gpp}
                    onChange={(e) => updateFormData('gpp', e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="coordenador">Coordenador do Projeto (CP)</Label>
                  <Input
                    id="coordenador"
                    value={formData.coordenador}
                    onChange={(e) => updateFormData('coordenador', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="produto">Produto</Label>
                  <Input
                    id="produto"
                    value={formData.produto}
                    onChange={(e) => updateFormData('produto', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="esn">ESN</Label>
                  <Input
                    id="esn"
                    value={formData.esn}
                    onChange={(e) => updateFormData('esn', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="arquiteto">Arquiteto</Label>
                  <Input
                    id="arquiteto"
                    value={formData.arquiteto}
                    onChange={(e) => updateFormData('arquiteto', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="criticidade_totvs">Criticidade</Label>
                  <Select value={formData.criticidade_totvs} onValueChange={(value) => updateFormData('criticidade_totvs', value)}>
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
                  <Label htmlFor="gerente_projeto">Gerente do Projeto</Label>
                  <Input
                    id="gerente_projeto"
                    value={formData.gerente_projeto}
                    onChange={(e) => updateFormData('gerente_projeto', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="gerente_portfolio">Gerente do Portfólio</Label>
                  <Input
                    id="gerente_portfolio"
                    value={formData.gerente_portfolio}
                    onChange={(e) => updateFormData('gerente_portfolio', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="gerente_escritorio">Gerente do Escritório</Label>
                  <Input
                    id="gerente_escritorio"
                    value={formData.gerente_escritorio}
                    onChange={(e) => updateFormData('gerente_escritorio', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="criticidade_cliente">Criticidade Cliente</Label>
                  <Input
                    id="criticidade_cliente"
                    value={formData.criticidade_cliente}
                    onChange={(e) => updateFormData('criticidade_cliente', e.target.value)}
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="drive">Drive (link)</Label>
                  <Input
                    id="drive"
                    type="url"
                    value={formData.drive}
                    onChange={(e) => updateFormData('drive', e.target.value)}
                    placeholder="https://"
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="financeiro" className="mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="valor_projeto">Valor do Projeto (R$)</Label>
                  <Input
                    id="valor_projeto"
                    type="number"
                    step="0.01"
                    value={formData.valor_projeto}
                    onChange={(e) => updateFormData('valor_projeto', parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <Label htmlFor="receita_atual">Receita Atual (R$)</Label>
                  <Input
                    id="receita_atual"
                    type="number"
                    step="0.01"
                    value={formData.receita_atual}
                    onChange={(e) => updateFormData('receita_atual', parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <Label htmlFor="margem_venda_percent">Margem da Venda (%)</Label>
                  <Input
                    id="margem_venda_percent"
                    type="number"
                    step="0.01"
                    value={formData.margem_venda_percent}
                    onChange={(e) => updateFormData('margem_venda_percent', parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <Label htmlFor="margem_atual_percent">Margem Atual (%)</Label>
                  <Input
                    id="margem_atual_percent"
                    type="number"
                    step="0.01"
                    value={formData.margem_atual_percent}
                    onChange={(e) => updateFormData('margem_atual_percent', parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <Label htmlFor="margem_venda_valor">Margem da Venda (R$)</Label>
                  <Input
                    id="margem_venda_valor"
                    type="number"
                    step="0.01"
                    value={formData.margem_venda_valor}
                    onChange={(e) => updateFormData('margem_venda_valor', parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <Label htmlFor="margem_atual_valor">Margem Atual (R$)</Label>
                  <Input
                    id="margem_atual_valor"
                    type="number"
                    step="0.01"
                    value={formData.margem_atual_valor}
                    onChange={(e) => updateFormData('margem_atual_valor', parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <Label htmlFor="mrr">MRR - Recorrente Mensal (R$)</Label>
                  <Input
                    id="mrr"
                    type="number"
                    step="0.01"
                    value={formData.mrr}
                    onChange={(e) => updateFormData('mrr', parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <Label htmlFor="mrr_total">MRR Total (Contratados R$)</Label>
                  <Input
                    id="mrr_total"
                    type="number"
                    step="0.01"
                    value={formData.mrr_total}
                    onChange={(e) => updateFormData('mrr_total', parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <Label htmlFor="psa_planejado">PSA Planejado (R$)</Label>
                  <Input
                    id="psa_planejado"
                    type="number"
                    step="0.01"
                    value={formData.psa_planejado}
                    onChange={(e) => updateFormData('psa_planejado', parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <Label htmlFor="investimento_comercial">Investimento Comercial (R$)</Label>
                  <Input
                    id="investimento_comercial"
                    type="number"
                    step="0.01"
                    value={formData.investimento_comercial}
                    onChange={(e) => updateFormData('investimento_comercial', parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <Label htmlFor="investimento_erro_produto">Investimento Erro Produto (R$)</Label>
                  <Input
                    id="investimento_erro_produto"
                    type="number"
                    step="0.01"
                    value={formData.investimento_erro_produto}
                    onChange={(e) => updateFormData('investimento_erro_produto', parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <Label htmlFor="investimento_perdas">Investimento Perdas (R$)</Label>
                  <Input
                    id="investimento_perdas"
                    type="number"
                    step="0.01"
                    value={formData.investimento_perdas}
                    onChange={(e) => updateFormData('investimento_perdas', parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <Label htmlFor="diferenca_psa_projeto">Diferença PSA x Projeto (R$)</Label>
                  <Input
                    id="diferenca_psa_projeto"
                    type="number"
                    step="0.01"
                    value={formData.diferenca_psa_projeto}
                    onChange={(e) => updateFormData('diferenca_psa_projeto', parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="projeto_em_perda"
                    checked={formData.projeto_em_perda}
                    onCheckedChange={(checked) => updateFormData('projeto_em_perda', checked)}
                  />
                  <Label htmlFor="projeto_em_perda">Projeto em Perda?</Label>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="timeline" className="mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="data_inicio">Data Início</Label>
                  <Input
                    id="data_inicio"
                    type="date"
                    value={formData.data_inicio}
                    onChange={(e) => updateFormData('data_inicio', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="go_live_previsto">Go-live (Previsão)</Label>
                  <Input
                    id="go_live_previsto"
                    type="date"
                    value={formData.go_live_previsto}
                    onChange={(e) => updateFormData('go_live_previsto', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="duracao_pos_producao">Duração Pós-produção (em meses)</Label>
                  <Input
                    id="duracao_pos_producao"
                    type="number"
                    value={formData.duracao_pos_producao}
                    onChange={(e) => updateFormData('duracao_pos_producao', parseInt(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <Label htmlFor="encerramento">Encerramento</Label>
                  <Input
                    id="encerramento"
                    type="date"
                    value={formData.encerramento}
                    onChange={(e) => updateFormData('encerramento', e.target.value)}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="outros" className="mt-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="escopo">Escopo</Label>
                  <Textarea
                    id="escopo"
                    value={formData.escopo}
                    onChange={(e) => updateFormData('escopo', e.target.value)}
                    rows={4}
                  />
                </div>
                <div>
                  <Label htmlFor="objetivo">Objetivo</Label>
                  <Textarea
                    id="objetivo"
                    value={formData.objetivo}
                    onChange={(e) => updateFormData('objetivo', e.target.value)}
                    rows={4}
                  />
                </div>
                <div>
                  <Label htmlFor="observacoes">Observação</Label>
                  <Textarea
                    id="observacoes"
                    value={formData.observacoes}
                    onChange={(e) => updateFormData('observacoes', e.target.value)}
                    rows={4}
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-2 mt-6 pt-6 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(-1)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              {isSubmitting ? "Salvando..." : "Salvar TAP"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary Dialog */}
      {createdTAP && (
        <TAPSummaryDialog
          open={summaryDialogOpen}
          onOpenChange={setSummaryDialogOpen}
          tapData={createdTAP}
          onComplete={handleSummaryComplete}
        />
      )}
    </form>
  );
}