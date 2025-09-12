import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { CurrencyInput } from '@/components/ui/currency-input';
import { PercentageInput } from '@/components/ui/percentage-input';
import { CreatableSelect } from '@/components/ui/creatable-select';
import { DatePicker } from '@/components/ui/date-picker';
import { TAPFormData } from '@/types/tap';
import { useTAP } from '@/hooks/useTAP';
import { useToast } from '@/hooks/use-toast';
import { TAPSummaryDialog } from '@/components/common/TAPSummaryDialog';
import { TAPDocuments } from '@/components/projects/TAPDocuments';
import { format } from 'date-fns';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { HelpCircle } from 'lucide-react';

interface TAPFormProps {
  folderId?: string | null;
  onSuccess?: (tapId: string) => void;
}

export function TAPForm({ folderId, onSuccess }: TAPFormProps) {
  const navigate = useNavigate();
  const { createTAP } = useTAP();
  const { toast } = useToast();
  
  // Estados para as listas editáveis
  const [coordenadorOptions, setCoordenadorOptions] = useState<string[]>(['Coordenador 1', 'Coordenador 2']);
  const [produtoOptions, setProdutoOptions] = useState<string[]>(['Produto A', 'Produto B']);
  const [esnOptions, setEsnOptions] = useState<string[]>(['ESN 1', 'ESN 2']);
  const [arquitetoOptions, setArquitetoOptions] = useState<string[]>(['Arquiteto 1', 'Arquiteto 2']);
  const [gerenteProjetoOptions, setGerenteProjetoOptions] = useState<string[]>(['Gerente A', 'Gerente B']);

  const [formData, setFormData] = useState<TAPFormData>({
    project_id: '',
    data: format(new Date(), "yyyy-MM-dd"), // Data padrão: hoje
    nome_projeto: '',
    cod_cliente: '',
    gpp: '',
    produto: '',
    arquiteto: '',
    criticidade_totvs: 'Baixa',
    coordenador: '',
    gerente_projeto: '',
    esn: '',
    criticidade_cliente: 'Baixo',
    drive: '',
    data_inicio: '',
    go_live_previsto: '',
    duracao_pos_producao: 0,
    encerramento: '',
    escopo: '',
    objetivo: '',
    observacoes: '',
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

  const [submitting, setSubmitting] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [createdTAP, setCreatedTAP] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<string>('identificacao');

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

    setSubmitting(true);
    
    try {
      // Primeiro criar o projeto básico
      const tempProjectId = crypto.randomUUID();
      
      // Criar TAP com o ID do projeto
      const tapData = {
        ...formData,
        project_id: tempProjectId,
      };

      const newTAP = await createTAP(tapData);
      
      if (newTAP) {
        setCreatedTAP(newTAP);
        setShowSummary(true);
      }
    } catch (error) {
      console.error('Erro ao criar TAP:', error);
      toast({
        title: "Erro",
        description: "Erro ao criar TAP.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
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
      <Card>
        <CardHeader>
          <CardTitle>TAP</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TooltipProvider>
              <TabsList className="flex w-full gap-2 h-auto items-start overflow-x-auto flex-nowrap">
                <TabsTrigger value="identificacao" className="shrink-0">
                  <span className="flex items-center gap-1">
                    TAP
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="inline-flex"><HelpCircle className="h-3.5 w-3.5 text-muted-foreground" /></span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Informações de identificação do projeto</p>
                      </TooltipContent>
                    </Tooltip>
                  </span>
                </TabsTrigger>
                <TabsTrigger value="financeiro" className="shrink-0">
                  <span className="flex items-center gap-1">
                    Financeiro
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="inline-flex"><HelpCircle className="h-3.5 w-3.5 text-muted-foreground" /></span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Valores, margens, MRR e investimentos</p>
                      </TooltipContent>
                    </Tooltip>
                  </span>
                </TabsTrigger>
                <TabsTrigger value="timeline" className="shrink-0">
                  <span className="flex items-center gap-1">
                    Timeline
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="inline-flex"><HelpCircle className="h-3.5 w-3.5 text-muted-foreground" /></span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Datas: início, go live e encerramento</p>
                      </TooltipContent>
                    </Tooltip>
                  </span>
                </TabsTrigger>
                <TabsTrigger value="outros" className="shrink-0">
                  <span className="flex items-center gap-1">
                    Outros
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="inline-flex"><HelpCircle className="h-3.5 w-3.5 text-muted-foreground" /></span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Campos adicionais e observações</p>
                      </TooltipContent>
                    </Tooltip>
                  </span>
                </TabsTrigger>
                <TabsTrigger value="anexos" className="shrink-0">
                  <span className="flex items-center gap-1">
                    Anexos
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="inline-flex"><HelpCircle className="h-3.5 w-3.5 text-muted-foreground" /></span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Envie documentos relacionados ao projeto</p>
                      </TooltipContent>
                    </Tooltip>
                  </span>
                </TabsTrigger>
              </TabsList>
            </TooltipProvider>

            <TabsContent value="identificacao" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="data">Data *</Label>
                  <DatePicker
                    value={formData.data}
                    onChange={(value) => updateFormData('data', value)}
                    placeholder="Selecione a data"
                  />
                </div>
                <div>
                  <Label htmlFor="nome_projeto">Nome do Projeto *</Label>
                  <Input
                    id="nome_projeto"
                    value={formData.nome_projeto}
                    onChange={(e) => updateFormData('nome_projeto', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="cod_cliente">Código do Cliente *</Label>
                  <Input
                    id="cod_cliente"
                    value={formData.cod_cliente}
                    onChange={(e) => updateFormData('cod_cliente', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="gpp">GPP *</Label>
                  <Input
                    id="gpp"
                    value={formData.gpp}
                    onChange={(e) => updateFormData('gpp', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="produto">Produto *</Label>
                  <CreatableSelect
                    value={formData.produto}
                    onValueChange={(value) => updateFormData('produto', value)}
                    options={produtoOptions}
                    placeholder="Selecione ou digite um produto"
                    emptyMessage="Nenhum produto encontrado"
                    onCreate={(value) => {
                      setProdutoOptions(prev => [...prev, value]);
                      updateFormData('produto', value);
                    }}
                  />
                </div>
                <div>
                  <Label htmlFor="arquiteto">Arquiteto *</Label>
                  <CreatableSelect
                    value={formData.arquiteto}
                    onValueChange={(value) => updateFormData('arquiteto', value)}
                    options={arquitetoOptions}
                    placeholder="Selecione ou digite um arquiteto"
                    emptyMessage="Nenhum arquiteto encontrado"
                    onCreate={(value) => {
                      setArquitetoOptions(prev => [...prev, value]);
                      updateFormData('arquiteto', value);
                    }}
                  />
                </div>
                <div>
                  <Label htmlFor="criticidade_totvs">Criticidade TOTVS *</Label>
                  <Select value={formData.criticidade_totvs} onValueChange={(value) => updateFormData('criticidade_totvs', value as any)}>
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
                  <CreatableSelect
                    value={formData.coordenador}
                    onValueChange={(value) => updateFormData('coordenador', value)}
                    options={coordenadorOptions}
                    placeholder="Selecione ou digite um coordenador"
                    emptyMessage="Nenhum coordenador encontrado"
                    onCreate={(value) => {
                      setCoordenadorOptions(prev => [...prev, value]);
                      updateFormData('coordenador', value);
                    }}
                  />
                </div>
                <div>
                  <Label htmlFor="gerente_projeto">Gerente do Projeto/Consultoria *</Label>
                  <CreatableSelect
                    value={formData.gerente_projeto}
                    onValueChange={(value) => updateFormData('gerente_projeto', value)}
                    options={gerenteProjetoOptions}
                    placeholder="Selecione ou digite um gerente"
                    emptyMessage="Nenhum gerente encontrado"
                    onCreate={(value) => {
                      setGerenteProjetoOptions(prev => [...prev, value]);
                      updateFormData('gerente_projeto', value);
                    }}
                  />
                </div>
                <div>
                  <Label htmlFor="esn">ESN *</Label>
                  <CreatableSelect
                    value={formData.esn}
                    onValueChange={(value) => updateFormData('esn', value)}
                    options={esnOptions}
                    placeholder="Selecione ou digite um ESN"
                    emptyMessage="Nenhum ESN encontrado"
                    onCreate={(value) => {
                      setEsnOptions(prev => [...prev, value]);
                      updateFormData('esn', value);
                    }}
                  />
                </div>
                <div>
                  <Label htmlFor="criticidade_cliente">Criticidade Cliente *</Label>
                  <Select value={formData.criticidade_cliente} onValueChange={(value) => updateFormData('criticidade_cliente', value as any)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Baixo">Baixo</SelectItem>
                      <SelectItem value="Médio">Médio</SelectItem>
                      <SelectItem value="Alto">Alto</SelectItem>
                      <SelectItem value="Crítico">Crítico</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="drive">Drive</Label>
                  <Input
                    id="drive"
                    value={formData.drive || ''}
                    onChange={(e) => updateFormData('drive', e.target.value)}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="financeiro" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="valor_projeto">Valor do Projeto</Label>
                  <CurrencyInput
                    id="valor_projeto"
                    value={formData.valor_projeto}
                    onChange={(value) => updateFormData('valor_projeto', Number(value))}
                  />
                </div>
                <div>
                  <Label htmlFor="margem_venda_percent">Margem Venda (%)</Label>
                  <PercentageInput
                    id="margem_venda_percent"
                    value={formData.margem_venda_percent}
                    onChange={(value) => updateFormData('margem_venda_percent', Number(value))}
                  />
                </div>
                <div>
                  <Label htmlFor="margem_venda_valor">Margem Venda (Valor)</Label>
                  <CurrencyInput
                    id="margem_venda_valor"
                    value={formData.margem_venda_valor}
                    onChange={(value) => updateFormData('margem_venda_valor', Number(value))}
                  />
                </div>
                <div>
                  <Label htmlFor="mrr">MRR</Label>
                  <CurrencyInput
                    id="mrr"
                    value={formData.mrr}
                    onChange={(value) => updateFormData('mrr', Number(value))}
                  />
                </div>
                <div>
                  <Label htmlFor="mrr_total">MRR Total</Label>
                  <CurrencyInput
                    id="mrr_total"
                    value={formData.mrr_total}
                    onChange={(value) => updateFormData('mrr_total', Number(value))}
                  />
                </div>
                <div>
                  <Label htmlFor="psa_planejado">PSA Planejado</Label>
                  <CurrencyInput
                    id="psa_planejado"
                    value={formData.psa_planejado}
                    onChange={(value) => updateFormData('psa_planejado', Number(value))}
                  />
                </div>
                <div>
                  <Label htmlFor="diferenca_psa_projeto">Diferença PSA/Projeto</Label>
                  <CurrencyInput
                    id="diferenca_psa_projeto"
                    value={formData.diferenca_psa_projeto}
                    onChange={(value) => updateFormData('diferenca_psa_projeto', Number(value))}
                  />
                </div>
                <div>
                  <Label htmlFor="receita_atual">Receita Atual</Label>
                  <CurrencyInput
                    id="receita_atual"
                    value={formData.receita_atual}
                    onChange={(value) => updateFormData('receita_atual', Number(value))}
                  />
                </div>
                <div>
                  <Label htmlFor="margem_atual_percent">Margem Atual (%)</Label>
                  <PercentageInput
                    id="margem_atual_percent"
                    value={formData.margem_atual_percent}
                    onChange={(value) => updateFormData('margem_atual_percent', Number(value))}
                  />
                </div>
                <div>
                  <Label htmlFor="margem_atual_valor">Margem Atual (Valor)</Label>
                  <CurrencyInput
                    id="margem_atual_valor"
                    value={formData.margem_atual_valor}
                    onChange={(value) => updateFormData('margem_atual_valor', Number(value))}
                  />
                </div>
                <div>
                  <Label htmlFor="investimento_perdas">Investimento Perdas</Label>
                  <CurrencyInput
                    id="investimento_perdas"
                    value={formData.investimento_perdas}
                    onChange={(value) => updateFormData('investimento_perdas', Number(value))}
                  />
                </div>
                <div>
                  <Label htmlFor="investimento_comercial">Investimento Comercial</Label>
                  <CurrencyInput
                    id="investimento_comercial"
                    value={formData.investimento_comercial}
                    onChange={(value) => updateFormData('investimento_comercial', Number(value))}
                  />
                </div>
                <div>
                  <Label htmlFor="investimento_erro_produto">Investimento Erro Produto</Label>
                  <CurrencyInput
                    id="investimento_erro_produto"
                    value={formData.investimento_erro_produto}
                    onChange={(value) => updateFormData('investimento_erro_produto', Number(value))}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="projeto_em_perda"
                    checked={formData.projeto_em_perda}
                    onCheckedChange={(checked) => updateFormData('projeto_em_perda', checked)}
                  />
                  <Label htmlFor="projeto_em_perda">Projeto em Perda</Label>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="timeline" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="data_inicio">Data Início</Label>
                  <DatePicker
                    value={formData.data_inicio || ''}
                    onChange={(value) => updateFormData('data_inicio', value)}
                    placeholder="Selecione a data de início"
                  />
                </div>
                <div>
                  <Label htmlFor="go_live_previsto">Go Live Previsto</Label>
                  <DatePicker
                    value={formData.go_live_previsto || ''}
                    onChange={(value) => updateFormData('go_live_previsto', value)}
                    placeholder="Selecione a data do Go Live"
                  />
                </div>
                <div>
                  <Label htmlFor="duracao_pos_producao">Duração Pós Produção (meses)</Label>
                  <Input
                    id="duracao_pos_producao"
                    type="number"
                    value={formData.duracao_pos_producao}
                    onChange={(e) => updateFormData('duracao_pos_producao', Number(e.target.value))}
                  />
                </div>
                <div>
                  <Label htmlFor="encerramento">Encerramento</Label>
                  <DatePicker
                    value={formData.encerramento || ''}
                    onChange={(value) => updateFormData('encerramento', value)}
                    placeholder="Selecione a data de encerramento"
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="outros" className="space-y-4">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="escopo">Escopo</Label>
                  <Textarea
                    id="escopo"
                    value={formData.escopo || ''}
                    onChange={(e) => updateFormData('escopo', e.target.value)}
                    rows={4}
                  />
                </div>
                <div>
                  <Label htmlFor="objetivo">Objetivo</Label>
                  <Textarea
                    id="objetivo"
                    value={formData.objetivo || ''}
                    onChange={(e) => updateFormData('objetivo', e.target.value)}
                    rows={4}
                  />
                </div>
                <div>
                  <Label htmlFor="observacoes">Observações</Label>
                  <Textarea
                    id="observacoes"
                    value={formData.observacoes || ''}
                    onChange={(e) => updateFormData('observacoes', e.target.value)}
                    rows={4}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="anexos" className="space-y-4">
              <TAPDocuments 
                tapId={createdTAP?.id} 
                projectId={folderId || ''} 
              />
            </TabsContent>

            <div className="flex gap-2 pt-4">
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Salvando...' : 'Salvar TAP'}
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate(-1)}>
                Cancelar
              </Button>
            </div>
          </Tabs>
        </CardContent>
      </Card>
      
      {showSummary && createdTAP && (
        <TAPSummaryDialog
          isOpen={showSummary}
          onClose={() => setShowSummary(false)}
          tapData={createdTAP}
          onComplete={handleSummaryComplete}
        />
      )}
    </form>
  );
}