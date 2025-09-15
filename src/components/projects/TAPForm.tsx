import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { CurrencyInput } from '@/components/ui/currency-input';
import { PercentageInput } from '@/components/ui/percentage-input';
import { CreatableSelect } from '@/components/ui/creatable-select';
import { DatePicker } from '@/components/ui/date-picker';
import { TAPFormData } from '@/types/tap';
import { useTAP } from '@/hooks/useTAP';
import { useToast } from '@/hooks/use-toast';
import { useTAPDocuments } from '@/hooks/useTAPDocuments';
import { useTAPOptions } from '@/hooks/useTAPOptions';
import { TAPSummaryDialog } from '@/components/common/TAPSummaryDialog';
import { TAPDocuments } from '@/components/projects/TAPDocuments';
import { Upload, FileText, X } from 'lucide-react';
import { format } from 'date-fns';

interface TAPFormProps {
  folderId?: string | null;
  onSuccess?: (tapId: string) => void;
}

export function TAPForm({ folderId, onSuccess }: TAPFormProps) {
  const navigate = useNavigate();
  const { createTAP } = useTAP();
  const { uploadDocument } = useTAPDocuments();
  const { toast } = useToast();
  
  // Hook para gerenciar as opções das listas suspensas
  const {
    gppOptions,
    produtoOptions,
    arquitetoOptions,
    coordenadorOptions,
    gerenteProjetoOptions,
    esnOptions,
    loading: optionsLoading,
    addOption,
  } = useTAPOptions();
  
  // Estados para as listas editáveis - agora removidos, usando o hook useTAPOptions
  // const [coordenadorOptions, setCoordenadorOptions] = useState<string[]>(['Coordenador 1', 'Coordenador 2']);
  // const [produtoOptions, setProdutoOptions] = useState<string[]>(['Produto A', 'Produto B']);
  // const [esnOptions, setEsnOptions] = useState<string[]>(['ESN 1', 'ESN 2']);
  // const [arquitetoOptions, setArquitetoOptions] = useState<string[]>(['Arquiteto 1', 'Arquiteto 2']);
  // const [gerenteProjetoOptions, setGerenteProjetoOptions] = useState<string[]>(['Gerente A', 'Gerente B']);
  // const [gppOptions, setGppOptions] = useState<string[]>(['GPP 1', 'GPP 2']);

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
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [fileNames, setFileNames] = useState<string[]>([]);

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
        
        // Upload arquivos pendentes se houver
        if (pendingFiles.length > 0) {
          try {
            for (let i = 0; i < pendingFiles.length; i++) {
              const file = pendingFiles[i];
              const fileName = fileNames[i] || file.name.split('.')[0];
              
              await uploadDocument({
                tap_id: newTAP.id,
                project_id: newTAP.project_id,
                file: file,
                document_name: fileName,
                original_name: file.name,
                file_size: file.size,
                mime_type: file.type
              });
            }
            
            toast({
              title: "Sucesso",
              description: `TAP criada com sucesso! ${pendingFiles.length} arquivo(s) anexado(s).`,
            });
            
            // Limpar arquivos pendentes
            setPendingFiles([]);
            setFileNames([]);
          } catch (error) {
            toast({
              title: "Atenção",
              description: "TAP criada, mas houve erro ao anexar alguns arquivos.",
              variant: "destructive",
            });
          }
        }
        
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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setPendingFiles(prev => [...prev, ...files]);
      const names = files.map(file => file.name.split('.')[0]);
      setFileNames(prev => [...prev, ...names]);
    }
  };

  const removeFile = (index: number) => {
    setPendingFiles(prev => prev.filter((_, i) => i !== index));
    setFileNames(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>TAP</CardTitle>
        </CardHeader>
        <CardContent className="space-y-8">
          {/* Seção: TAP */}
          <div className="space-y-4">
            <div className="border-l-4 border-blue-500 pl-4 py-2 bg-blue-50 dark:bg-blue-950/30 rounded-r-lg">
              <h3 className="text-lg font-semibold text-blue-700 dark:text-blue-300">TAP</h3>
              <p className="text-sm text-blue-600 dark:text-blue-400">Informações de identificação do projeto</p>
            </div>
            
            <div className="space-y-4">
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
                  <Label htmlFor="gpp">GPP (Gerente de Portólio de Projetos) *</Label>
                  <CreatableSelect
                    value={formData.gpp}
                    onValueChange={(value) => updateFormData('gpp', value)}
                    options={gppOptions}
                    placeholder="Selecione ou digite um GPP"
                    emptyMessage="Nenhum GPP encontrado"
                    onCreate={async (value) => {
                      const success = await addOption('gpp', value);
                      if (success) {
                        updateFormData('gpp', value);
                      }
                    }}
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
                    onCreate={async (value) => {
                      const success = await addOption('produto', value);
                      if (success) {
                        updateFormData('produto', value);
                      }
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
                    onCreate={async (value) => {
                      const success = await addOption('arquiteto', value);
                      if (success) {
                        updateFormData('arquiteto', value);
                      }
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
                    onCreate={async (value) => {
                      const success = await addOption('coordenador', value);
                      if (success) {
                        updateFormData('coordenador', value);
                      }
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
                    onCreate={async (value) => {
                      const success = await addOption('gerente_projeto', value);
                      if (success) {
                        updateFormData('gerente_projeto', value);
                      }
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
                    onCreate={async (value) => {
                      const success = await addOption('esn', value);
                      if (success) {
                        updateFormData('esn', value);
                      }
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
            </div>
          </div>

          {/* Seção: Financeiro */}
          <div className="space-y-4">
            <div className="border-l-4 border-green-500 pl-4 py-2 bg-green-50 dark:bg-green-950/30 rounded-r-lg">
              <h3 className="text-lg font-semibold text-green-700 dark:text-green-300">Financeiro</h3>
              <p className="text-sm text-green-600 dark:text-green-400">Valores, margens, MRR e investimentos</p>
            </div>
            
            <div className="space-y-4">
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
            </div>
          </div>

          {/* Seção: Timeline */}
          <div className="space-y-4">
            <div className="border-l-4 border-purple-500 pl-4 py-2 bg-purple-50 dark:bg-purple-950/30 rounded-r-lg">
              <h3 className="text-lg font-semibold text-purple-700 dark:text-purple-300">Timeline</h3>
              <p className="text-sm text-purple-600 dark:text-purple-400">Datas: início, go live e encerramento</p>
            </div>
            
            <div className="space-y-4">
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
                    min="0"
                    value={formData.duracao_pos_producao}
                    onChange={(e) => updateFormData('duracao_pos_producao', Number(e.target.value) || 0)}
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
            </div>
          </div>

          {/* Seção: Outros */}
          <div className="space-y-4">
            <div className="border-l-4 border-orange-500 pl-4 py-2 bg-orange-50 dark:bg-orange-950/30 rounded-r-lg">
              <h3 className="text-lg font-semibold text-orange-700 dark:text-orange-300">Outros</h3>
              <p className="text-sm text-orange-600 dark:text-orange-400">Campos adicionais e observações</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="escopo">Escopo</Label>
                <Textarea
                  id="escopo"
                  value={formData.escopo || ''}
                  onChange={(e) => updateFormData('escopo', e.target.value)}
                  placeholder="Descreva o escopo do projeto"
                  rows={4}
                />
              </div>
              <div>
                <Label htmlFor="objetivo">Objetivo</Label>
                <Textarea
                  id="objetivo"
                  value={formData.objetivo || ''}
                  onChange={(e) => updateFormData('objetivo', e.target.value)}
                  placeholder="Descreva o objetivo do projeto"
                  rows={4}
                />
              </div>
              <div>
                <Label htmlFor="observacoes">Observações</Label>
                <Textarea
                  id="observacoes"
                  value={formData.observacoes || ''}
                  onChange={(e) => updateFormData('observacoes', e.target.value)}
                  placeholder="Adicione observações importantes"
                  rows={4}
                />
              </div>
            </div>
          </div>

          {/* Seção: Anexos */}
          <div className="space-y-4">
            <div className="border-l-4 border-red-500 pl-4 py-2 bg-red-50 dark:bg-red-950/30 rounded-r-lg">
              <h3 className="text-lg font-semibold text-red-700 dark:text-red-300">Anexos</h3>
              <p className="text-sm text-red-600 dark:text-red-400">Envie documentos relacionados ao projeto</p>
            </div>
            
            <div>
              {!createdTAP ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Input
                      type="file"
                      multiple
                      onChange={handleFileSelect}
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.jpg,.jpeg,.png"
                      className="hidden"
                      id="file-upload-input"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => document.getElementById('file-upload-input')?.click()}
                      className="w-full"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Selecionar Arquivos para Anexar
                    </Button>
                  </div>
                  
                  {pendingFiles.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm">Arquivos Selecionados ({pendingFiles.length})</h4>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {pendingFiles.map((file, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-2 border rounded-lg bg-muted/30"
                          >
                            <div className="flex items-center gap-2 flex-1">
                              <FileText className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <div className="text-sm font-medium">{file.name}</div>
                                <div className="text-xs text-muted-foreground">
                                  {(file.size / 1024 / 1024).toFixed(2)} MB
                                </div>
                              </div>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeFile(index)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                      <div className="text-xs text-muted-foreground p-2 bg-blue-50 dark:bg-blue-950/30 rounded border-l-2 border-blue-500">
                        💡 Os arquivos serão anexados automaticamente após salvar a TAP
                      </div>
                    </div>
                  )}
                  
                  {pendingFiles.length === 0 && (
                    <div className="text-center p-6 bg-muted/50 rounded-lg border-2 border-dashed">
                      <FileText className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                      <p className="text-muted-foreground text-sm">
                        Selecione arquivos para anexar à TAP
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Formatos aceitos: PDF, DOC, DOCX, XLS, XLSX, TXT, JPG, JPEG, PNG
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <TAPDocuments 
                  tapId={createdTAP.id} 
                  projectId={createdTAP.project_id} 
                />
              )}
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Salvando...' : 'Salvar TAP'}
            </Button>
            <Button type="button" variant="outline" onClick={() => navigate(-1)}>
              Cancelar
            </Button>
          </div>
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