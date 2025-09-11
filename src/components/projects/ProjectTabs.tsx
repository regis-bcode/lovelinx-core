import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Project } from "@/types/project";
import { TAP, TAPFormData } from "@/types/tap";
import { useTAP } from "@/hooks/useTAP";
import { useToast } from "@/hooks/use-toast";
import { 
  FileText, 
  DollarSign, 
  Calendar, 
  FileEdit,
  Save,
  Target,
  MessageSquare
} from "lucide-react";

interface ProjectTabsProps {
  project?: Project;
  isLoading?: boolean;
}

export function ProjectTabs({ project, isLoading = false }: ProjectTabsProps) {
  const { tap, createTAP, updateTAP } = useTAP(project?.id);
  const [formData, setFormData] = useState<Partial<TAPFormData>>({
    project_id: project?.id || '',
    
    // Identificação
    data: '',
    nome_projeto: project?.nome_projeto || '',
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
    
    // Observações
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
  });

  const { toast } = useToast();

  // Atualiza o formData quando o TAP é carregado
  useEffect(() => {
    if (tap) {
      setFormData({
        project_id: tap.project_id,
        data: tap.data,
        nome_projeto: tap.nome_projeto,
        cod_cliente: tap.cod_cliente,
        gpp: tap.gpp,
        produto: tap.produto,
        arquiteto: tap.arquiteto,
        criticidade_totvs: tap.criticidade_totvs,
        coordenador: tap.coordenador,
        gerente_projeto: tap.gerente_projeto,
        gerente_portfolio: tap.gerente_portfolio,
        gerente_escritorio: tap.gerente_escritorio,
        esn: tap.esn,
        criticidade_cliente: tap.criticidade_cliente,
        drive: tap.drive,
        data_inicio: tap.data_inicio,
        go_live_previsto: tap.go_live_previsto,
        duracao_pos_producao: tap.duracao_pos_producao,
        encerramento: tap.encerramento,
        escopo: tap.escopo,
        objetivo: tap.objetivo,
        observacoes: tap.observacoes,
        valor_projeto: tap.valor_projeto,
        margem_venda_percent: tap.margem_venda_percent,
        margem_venda_valor: tap.margem_venda_valor,
        mrr: tap.mrr,
        mrr_total: tap.mrr_total,
        psa_planejado: tap.psa_planejado,
        diferenca_psa_projeto: tap.diferenca_psa_projeto,
        receita_atual: tap.receita_atual,
        margem_atual_percent: tap.margem_atual_percent,
        margem_atual_valor: tap.margem_atual_valor,
        investimento_perdas: tap.investimento_perdas,
        investimento_comercial: tap.investimento_comercial,
        investimento_erro_produto: tap.investimento_erro_produto,
        projeto_em_perda: tap.projeto_em_perda,
      });
    } else if (project) {
      // Se não há TAP mas há projeto, preenche o nome do projeto
      setFormData(prev => ({
        ...prev,
        nome_projeto: project.nome_projeto,
        project_id: project.id,
      }));
    }
  }, [tap, project]);

  const handleSave = async (tab: string) => {
    if (!project?.id) {
      toast({
        title: "Erro",
        description: "Projeto não encontrado.",
        variant: "destructive",
      });
      return;
    }

    // Validação dos campos obrigatórios
    const requiredFields: (keyof TAPFormData)[] = [
      'data', 'nome_projeto', 'cod_cliente', 'gpp', 'produto', 
      'arquiteto', 'criticidade_totvs', 'coordenador', 'gerente_projeto',
      'gerente_portfolio', 'gerente_escritorio', 'esn', 'criticidade_cliente'
    ];

    const missingFields = requiredFields.filter(field => !formData[field]);
    
    if (missingFields.length > 0 && tab === 'Identificação') {
      toast({
        title: "Campos obrigatórios",
        description: `Preencha todos os campos obrigatórios da aba Identificação.`,
        variant: "destructive",
      });
      return;
    }

    try {
      if (tap) {
        await updateTAP(tap.id, formData);
      } else {
        if (missingFields.length > 0) {
          toast({
            title: "Campos obrigatórios",
            description: `Preencha todos os campos obrigatórios da aba Identificação antes de criar o TAP.`,
            variant: "destructive",
          });
          return;
        }
        await createTAP(formData as TAPFormData);
      }
      
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

  const updateField = (field: keyof TAPFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Tabs defaultValue="identificacao" className="w-full">
      <TabsList className="grid w-full grid-cols-5">
        <TabsTrigger value="identificacao" className="flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Identificação
        </TabsTrigger>
        <TabsTrigger value="timeline" className="flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          Timeline
        </TabsTrigger>
        <TabsTrigger value="escopo" className="flex items-center gap-2">
          <Target className="h-4 w-4" />
          Escopo e Objetivo
        </TabsTrigger>
        <TabsTrigger value="observacoes" className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          Observações
        </TabsTrigger>
        <TabsTrigger value="financeiro" className="flex items-center gap-2">
          <DollarSign className="h-4 w-4" />
          Financeiro
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
              <div>
                <Label htmlFor="gpp">GPP (Gerente de Projetos Principal) *</Label>
                <Select
                  value={formData.gpp}
                  onValueChange={(value) => updateField('gpp', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o GPP" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="João Silva">João Silva</SelectItem>
                    <SelectItem value="Maria Santos">Maria Santos</SelectItem>
                    <SelectItem value="Pedro Oliveira">Pedro Oliveira</SelectItem>
                    <SelectItem value="Ana Costa">Ana Costa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="produto">Produto (Tags) *</Label>
                <Input
                  id="produto"
                  value={formData.produto}
                  onChange={(e) => updateField('produto', e.target.value)}
                  placeholder="Ex: ERP, CRM, BI"
                  required
                />
              </div>
              <div>
                <Label htmlFor="arquiteto">Arquiteto *</Label>
                <Select
                  value={formData.arquiteto}
                  onValueChange={(value) => updateField('arquiteto', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o arquiteto" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Carlos Mendes">Carlos Mendes</SelectItem>
                    <SelectItem value="Fernanda Lima">Fernanda Lima</SelectItem>
                    <SelectItem value="Ricardo Souza">Ricardo Souza</SelectItem>
                    <SelectItem value="Juliana Rocha">Juliana Rocha</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="criticidade_totvs">Criticidade TOTVS *</Label>
                <Select
                  value={formData.criticidade_totvs}
                  onValueChange={(value) => updateField('criticidade_totvs', value as 'Baixa' | 'Média' | 'Alta' | 'Crítica')}
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
                <Label htmlFor="coordenador">Coordenador do Projeto (CP) *</Label>
                <Select
                  value={formData.coordenador}
                  onValueChange={(value) => updateField('coordenador', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o coordenador" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Lucas Pereira">Lucas Pereira</SelectItem>
                    <SelectItem value="Patrícia Alves">Patrícia Alves</SelectItem>
                    <SelectItem value="Roberto Silva">Roberto Silva</SelectItem>
                    <SelectItem value="Camila Torres">Camila Torres</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="gerente_projeto">Gerente do Projeto (GP) *</Label>
                <Select
                  value={formData.gerente_projeto}
                  onValueChange={(value) => updateField('gerente_projeto', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o gerente do projeto" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Amanda Ferreira">Amanda Ferreira</SelectItem>
                    <SelectItem value="Gustavo Ribeiro">Gustavo Ribeiro</SelectItem>
                    <SelectItem value="Mariana Dias">Mariana Dias</SelectItem>
                    <SelectItem value="Thiago Moreira">Thiago Moreira</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="gerente_portfolio">Gerente de Portfólio (GPP) *</Label>
                <Select
                  value={formData.gerente_portfolio}
                  onValueChange={(value) => updateField('gerente_portfolio', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o gerente de portfólio" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Bruno Carvalho">Bruno Carvalho</SelectItem>
                    <SelectItem value="Larissa Gonçalves">Larissa Gonçalves</SelectItem>
                    <SelectItem value="Diego Santos">Diego Santos</SelectItem>
                    <SelectItem value="Vanessa Martins">Vanessa Martins</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="gerente_escritorio">Gerente Escritório de Projetos *</Label>
                <Select
                  value={formData.gerente_escritorio}
                  onValueChange={(value) => updateField('gerente_escritorio', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o gerente do escritório" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Renato Barbosa">Renato Barbosa</SelectItem>
                    <SelectItem value="Beatriz Nunes">Beatriz Nunes</SelectItem>
                    <SelectItem value="Felipe Araújo">Felipe Araújo</SelectItem>
                    <SelectItem value="Gabriela Castro">Gabriela Castro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="esn">ESN *</Label>
                <Select
                  value={formData.esn}
                  onValueChange={(value) => updateField('esn', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o ESN" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ESN001">ESN001</SelectItem>
                    <SelectItem value="ESN002">ESN002</SelectItem>
                    <SelectItem value="ESN003">ESN003</SelectItem>
                    <SelectItem value="ESN004">ESN004</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="criticidade_cliente">Criticidade Cliente *</Label>
                <Select
                  value={formData.criticidade_cliente}
                  onValueChange={(value) => updateField('criticidade_cliente', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a criticidade do cliente" />
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
                <Label htmlFor="drive">Drive - Link</Label>
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
              {tap ? 'Atualizar' : 'Criar'} TAP
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
                <Label htmlFor="data_inicio">Data Início</Label>
                <Input
                  id="data_inicio"
                  type="date"
                  value={formData.data_inicio}
                  onChange={(e) => updateField('data_inicio', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="go_live_previsto">Go-live (Previsão)</Label>
                <Input
                  id="go_live_previsto"
                  type="date"
                  value={formData.go_live_previsto}
                  onChange={(e) => updateField('go_live_previsto', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="duracao_pos_producao">Duração Pós-produção (em meses)</Label>
                <Input
                  id="duracao_pos_producao"
                  type="number"
                  value={formData.duracao_pos_producao}
                  onChange={(e) => updateField('duracao_pos_producao', parseInt(e.target.value) || 0)}
                />
              </div>
              <div>
                <Label htmlFor="encerramento">Encerramento</Label>
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

      {/* Aba Escopo e Objetivo */}
      <TabsContent value="escopo" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Escopo e Objetivo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="escopo">Escopo</Label>
              <Textarea
                id="escopo"
                value={formData.escopo}
                onChange={(e) => updateField('escopo', e.target.value)}
                placeholder="Descreva o escopo detalhado do projeto"
                rows={6}
              />
            </div>
            <div>
              <Label htmlFor="objetivo">Objetivo</Label>
              <Textarea
                id="objetivo"
                value={formData.objetivo}
                onChange={(e) => updateField('objetivo', e.target.value)}
                placeholder="Descreva os objetivos do projeto"
                rows={6}
              />
            </div>
            <Button onClick={() => handleSave('Escopo e Objetivo')} disabled={isLoading}>
              <Save className="mr-2 h-4 w-4" />
              Salvar Escopo e Objetivo
            </Button>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Aba Observações */}
      <TabsContent value="observacoes" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Observações
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="observacoes">Observações</Label>
              <Textarea
                id="observacoes"
                value={formData.observacoes}
                onChange={(e) => updateField('observacoes', e.target.value)}
                placeholder="Observações gerais, notas importantes, riscos identificados, etc."
                rows={8}
              />
            </div>
            <Button onClick={() => handleSave('Observações')} disabled={isLoading}>
              <Save className="mr-2 h-4 w-4" />
              Salvar Observações
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
                <Label htmlFor="margem_venda_percent">Margem da Venda (%)</Label>
                <Input
                  id="margem_venda_percent"
                  type="number"
                  step="0.01"
                  value={formData.margem_venda_percent}
                  onChange={(e) => updateField('margem_venda_percent', parseFloat(e.target.value) || 0)}
                />
              </div>
              <div>
                <Label htmlFor="margem_venda_valor">Margem da Venda (valor) (R$)</Label>
                <Input
                  id="margem_venda_valor"
                  type="number"
                  step="0.01"
                  value={formData.margem_venda_valor}
                  onChange={(e) => updateField('margem_venda_valor', parseFloat(e.target.value) || 0)}
                />
              </div>
              <div>
                <Label htmlFor="mrr">MRR - Recorrente Mensal (R$)</Label>
                <Input
                  id="mrr"
                  type="number"
                  step="0.01"
                  value={formData.mrr}
                  onChange={(e) => updateField('mrr', parseFloat(e.target.value) || 0)}
                />
              </div>
              <div>
                <Label htmlFor="mrr_total">MRR Total (Contratados) (R$)</Label>
                <Input
                  id="mrr_total"
                  type="number"
                  step="0.01"
                  value={formData.mrr_total}
                  onChange={(e) => updateField('mrr_total', parseFloat(e.target.value) || 0)}
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
                <Label htmlFor="diferenca_psa_projeto">Diferença PSA x Projeto (R$)</Label>
                <Input
                  id="diferenca_psa_projeto"
                  type="number"
                  step="0.01"
                  value={formData.diferenca_psa_projeto}
                  onChange={(e) => updateField('diferenca_psa_projeto', parseFloat(e.target.value) || 0)}
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
                <Label htmlFor="margem_atual_valor">Margem Atual (valor) (R$)</Label>
                <Input
                  id="margem_atual_valor"
                  type="number"
                  step="0.01"
                  value={formData.margem_atual_valor}
                  onChange={(e) => updateField('margem_atual_valor', parseFloat(e.target.value) || 0)}
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
                <Label htmlFor="investimento_erro_produto">Investimento Erro Produto (R$)</Label>
                <Input
                  id="investimento_erro_produto"
                  type="number"
                  step="0.01"
                  value={formData.investimento_erro_produto}
                  onChange={(e) => updateField('investimento_erro_produto', parseFloat(e.target.value) || 0)}
                />
              </div>
              <div className="flex items-center space-x-2 md:col-span-2 lg:col-span-3">
                <Checkbox
                  id="projeto_em_perda"
                  checked={formData.projeto_em_perda}
                  onCheckedChange={(checked) => updateField('projeto_em_perda', checked)}
                />
                <Label htmlFor="projeto_em_perda">Projeto em Perda? (SIM/Não)</Label>
              </div>
            </div>
            <Button onClick={() => handleSave('Financeiro')} disabled={isLoading}>
              <Save className="mr-2 h-4 w-4" />
              Salvar Financeiro
            </Button>
          </CardContent>
        </Card>
      </TabsContent>

    </Tabs>
  );
}