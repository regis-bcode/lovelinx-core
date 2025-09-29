import React, { useState, useEffect } from 'react';
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
import { ProductSelectWithCreate } from '@/components/products/ProductSelectWithCreate';
import { ServiceSelectWithCreate } from '@/components/services/ServiceSelectWithCreate';
import { DatePicker } from '@/components/ui/date-picker';
import { TAPFormData } from '@/types/tap';
import { useTAP } from '@/hooks/useTAP';
import { useToast } from '@/hooks/use-toast';
import { useTAPDocuments } from '@/hooks/useTAPDocuments';
import { useTAPOptions } from '@/hooks/useTAPOptions';
import { useClients } from '@/hooks/useClients';
import { useUsers } from '@/hooks/useUsers';
import { useStatus } from '@/hooks/useStatus';
import { useProjects } from '@/hooks/useProjects';
import { TAPSuccessDialog } from '@/components/projects/TAPSuccessDialog';
import { TAPEditSuccessDialog } from '@/components/projects/TAPEditSuccessDialog';
import { GoLiveHistory } from '@/components/ui/go-live-history';
import { TAPDocuments } from '@/components/projects/TAPDocuments';
import { ClientSelectWithCreate } from '@/components/users/ClientSelectWithCreate';
import { UserSelectWithCreate } from '@/components/users/UserSelectWithCreate';
import { Upload, FileText, X } from 'lucide-react';
import { format } from 'date-fns';

interface TAPFormProps {
  folderId?: string | null;
  projectId?: string;
  isEditing?: boolean;
  onSuccess?: (tapId: string) => void;
}

export function TAPForm({ folderId, projectId, isEditing = false, onSuccess }: TAPFormProps) {
  const navigate = useNavigate();
  const { tap, createTAP, updateTAP } = useTAP(projectId);
  const { uploadDocument } = useTAPDocuments();
  const { toast } = useToast();
  const { clients } = useClients();
  const { users } = useUsers();
  const { statuses } = useStatus();
  const { getProject } = useProjects();
  
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
    servico: '',
    arquiteto: '',
    criticidade_totvs: 'Baixa',
    coordenador: '',
    gerente_projeto: '',
    status: '',
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
  const [showEditSuccess, setShowEditSuccess] = useState(false);
  const [createdTAP, setCreatedTAP] = useState<any>(null);
  const [editedTAP, setEditedTAP] = useState<any>(null);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [fileNames, setFileNames] = useState<string[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string | undefined>();
  const [selectedGPPId, setSelectedGPPId] = useState<string | undefined>();
  const [selectedArquitetoId, setSelectedArquitetoId] = useState<string | undefined>();
  const [selectedCoordenadorId, setSelectedCoordenadorId] = useState<string | undefined>();
  const [selectedGerenteId, setSelectedGerenteId] = useState<string | undefined>();
  const [selectedVendedorId, setSelectedVendedorId] = useState<string | undefined>();
  const [previousGoLive, setPreviousGoLive] = useState<string>('');

  // Carregar dados existentes quando em modo de edição
  useEffect(() => {
    if (isEditing && projectId && tap) {
      console.log('[TAPForm] Loading existing TAP data', tap);
      
      // Capturar data anterior do Go-Live para histórico
      if (tap.go_live_previsto) {
        setPreviousGoLive(tap.go_live_previsto);
      }
      
      const project = getProject(projectId);
      
      // Pré-popular formulário com dados da TAP e projeto
      setFormData({
        project_id: tap.project_id,
        data: tap.data,
        nome_projeto: tap.nome_projeto,
        cod_cliente: tap.cod_cliente,
        gpp: tap.gpp,
        produto: tap.produto,
        servico: tap.servico || '',
        arquiteto: tap.arquiteto,
        criticidade_totvs: tap.criticidade_totvs,
        coordenador: tap.coordenador,
        gerente_projeto: tap.gerente_projeto,
        esn: tap.esn,
        criticidade_cliente: tap.criticidade_cliente,
        drive: tap.drive || '',
        status: project?.status || '',
        data_inicio: tap.data_inicio || '',
        go_live_previsto: tap.go_live_previsto || '',
        duracao_pos_producao: tap.duracao_pos_producao || 0,
        encerramento: tap.encerramento || '',
        escopo: tap.escopo || '',
        objetivo: tap.objetivo || '',
        observacoes: tap.observacoes || '',
        valor_projeto: tap.valor_projeto || 0,
        margem_venda_percent: tap.margem_venda_percent || 0,
        margem_venda_valor: tap.margem_venda_valor || 0,
        mrr: tap.mrr || 0,
        mrr_total: tap.mrr_total || 0,
        psa_planejado: tap.psa_planejado || 0,
        diferenca_psa_projeto: tap.diferenca_psa_projeto || 0,
        receita_atual: tap.receita_atual || 0,
        margem_atual_percent: tap.margem_atual_percent || 0,
        margem_atual_valor: tap.margem_atual_valor || 0,
        investimento_perdas: tap.investimento_perdas || 0,
        investimento_comercial: tap.investimento_comercial || 0,
        investimento_erro_produto: tap.investimento_erro_produto || 0,
        projeto_em_perda: tap.projeto_em_perda || false,
      });

      // Pré-selecionar valores nos componentes de seleção
      const cliente = clients.find(c => c.cod_int_cli === tap.cod_cliente);
      if (cliente) setSelectedClientId(cliente.id);
      
      const gppUser = users?.find(u => u.nome_completo === tap.gpp);
      if (gppUser) setSelectedGPPId(gppUser.id);
      
      const arquitetoUser = users?.find(u => u.nome_completo === tap.arquiteto);
      if (arquitetoUser) setSelectedArquitetoId(arquitetoUser.id);
      
      const coordenadorUser = users?.find(u => u.nome_completo === tap.coordenador);
      if (coordenadorUser) setSelectedCoordenadorId(coordenadorUser.id);
      
      const gerenteUser = users?.find(u => u.nome_completo === tap.gerente_projeto);
      if (gerenteUser) setSelectedGerenteId(gerenteUser.id);
      
      const vendedorUser = users?.find(u => u.nome_completo === tap.esn);
      if (vendedorUser) setSelectedVendedorId(vendedorUser.id);
    }
  }, [isEditing, projectId, tap, getProject, clients, users]);

  const updateFormData = (field: keyof TAPFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      console.log('[TAPForm] Submitting TAP', { formData, folderId, isEditing, projectId });

      // Validação mínima para campos obrigatórios do Projeto
      const required: Array<keyof TAPFormData> = [
        'data','nome_projeto','cod_cliente','gpp','produto','arquiteto','coordenador','esn'
      ];
      const missing = required.filter((f) => !String((formData as any)[f] || '').trim());
      if (missing.length > 0) {
        toast({
          title: 'Campos obrigatórios faltando',
          description: 'Preencha: ' + missing.join(', '),
          variant: 'destructive',
        });
        setSubmitting(false);
        return;
      }

      if (isEditing && tap) {
        // Modo de edição - atualizar TAP existente
        const updatedTAP = await updateTAP(tap.id, formData);
        if (updatedTAP) {
          setEditedTAP(updatedTAP);
          setShowEditSuccess(true);
        }
      } else {
        // Modo de criação - criar nova TAP
        const newTAP = await createTAP(formData, folderId);
        
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
          } else {
            toast({
              title: "Sucesso",
              description: "TAP criada com sucesso!",
            });
          }
          
          setShowSummary(true);
        } else {
          toast({
            title: "Erro",
            description: "Erro ao criar TAP. Verifique os campos obrigatórios e tente novamente.",
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      console.error('Erro ao processar TAP:', error);
      toast({
        title: "Erro",
        description: isEditing ? "Erro ao atualizar TAP. Tente novamente." : "Erro ao criar TAP. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSummaryComplete = () => {
    setShowSummary(false);
    if (onSuccess && createdTAP) {
      onSuccess(createdTAP.id);
    } else {
      navigate('/projects');
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

  const handleClientSelect = (clientId?: string) => {
    setSelectedClientId(clientId);
    if (clientId) {
      const selectedClient = clients.find(client => client.id === clientId);
      if (selectedClient) {
        updateFormData('cod_cliente', selectedClient.cod_int_cli);
      }
    } else {
      updateFormData('cod_cliente', '');
    }
  };

  const handleUserSelect = (field: keyof TAPFormData, setSelected: (id?: string) => void, userId?: string) => {
    setSelected(userId);
    if (userId) {
      const selectedUser = users?.find(user => user.id === userId);
      if (selectedUser) {
        updateFormData(field, selectedUser.nome_completo);
      }
    } else {
      updateFormData(field, '');
    }
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
                  <Label htmlFor="data">Data</Label>
                  <DatePicker
                    value={formData.data}
                    onChange={(value) => updateFormData('data', value)}
                    placeholder="Selecione a data"
                  />
                </div>
                <div>
                  <Label htmlFor="nome_projeto">Nome do Projeto</Label>
                  <Input
                    id="nome_projeto"
                    value={formData.nome_projeto}
                    onChange={(e) => updateFormData('nome_projeto', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="cliente">Cliente</Label>
                  <ClientSelectWithCreate
                    value={selectedClientId}
                    onChange={handleClientSelect}
                  />
                </div>
                <div>
                  <Label htmlFor="cod_cliente">Código do Cliente</Label>
                  <Input
                    id="cod_cliente"
                    value={formData.cod_cliente}
                    onChange={(e) => updateFormData('cod_cliente', e.target.value)}
                    placeholder="Preenchido automaticamente ao selecionar cliente"
                  />
                </div>
                <div>
                  <Label htmlFor="gpp">GPP (Gerente de Portfólio de Projetos)</Label>
                  <UserSelectWithCreate
                    value={selectedGPPId}
                    onChange={(userId) => handleUserSelect('gpp', setSelectedGPPId, userId)}
                    placeholder="Selecione um Gerente de Portfólio"
                    userType="gerente_portfolio"
                    label="Gerente de Portfólio"
                  />
                </div>
                 <div>
                   <Label htmlFor="produto">Produto</Label>
                   <ProductSelectWithCreate
                     value={formData.produto}
                     onChange={(value) => updateFormData('produto', value || '')}
                     placeholder="Selecione ou adicione um produto"
                     label="Produto"
                   />
                 </div>
                 <div>
                   <Label htmlFor="servico">Serviço</Label>
                   <ServiceSelectWithCreate
                     value={formData.servico || ''}
                     onChange={(value) => updateFormData('servico', value || '')}
                     placeholder="Selecione um serviço"
                     label="Serviço"
                   />
                 </div>
                 <div>
                   <Label htmlFor="arquiteto">Arquiteto</Label>
                  <UserSelectWithCreate
                    value={selectedArquitetoId}
                    onChange={(userId) => handleUserSelect('arquiteto', setSelectedArquitetoId, userId)}
                    placeholder="Selecione um Arquiteto"
                    userType="arquiteto"
                    label="Arquiteto"
                  />
                </div>
                <div>
                  <Label htmlFor="criticidade_totvs">Criticidade TOTVS</Label>
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
                  <Label htmlFor="coordenador">Coordenador do Projeto (CP)</Label>
                  <UserSelectWithCreate
                    value={selectedCoordenadorId}
                    onChange={(userId) => handleUserSelect('coordenador', setSelectedCoordenadorId, userId)}
                    placeholder="Selecione um Coordenador"
                    userType="coordenador_consultoria"
                    label="Coordenador"
                  />
                </div>
                <div>
                  <Label htmlFor="gerente_projeto">Gerente do Projeto/Consultoria</Label>
                  <UserSelectWithCreate
                    value={selectedGerenteId}
                    onChange={(userId) => handleUserSelect('gerente_projeto', setSelectedGerenteId, userId)}
                    placeholder="Selecione um Gerente"
                    userType="gerente_projetos"
                    label="Gerente de Projetos"
                  />
                </div>
                <div>
                  <Label htmlFor="esn">Vendedor</Label>
                  <UserSelectWithCreate
                    value={selectedVendedorId}
                    onChange={(userId) => handleUserSelect('esn', setSelectedVendedorId, userId)}
                    placeholder="Selecione um Vendedor"
                    userType="vendedor"
                    label="Vendedor"
                  />
                </div>
                <div>
                  <Label htmlFor="criticidade_cliente">Criticidade Cliente</Label>
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
                  <Label htmlFor="status">Status do Projeto</Label>
                  <Select value={formData.status || ''} onValueChange={(value) => updateFormData('status', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o status" />
                    </SelectTrigger>
                    <SelectContent>
                      {statuses
                        .filter(status => status.ativo && status.tipo_aplicacao.includes('projeto'))
                        .map((status, index) => (
                          <SelectItem key={`${status.id}-${status.nome}-${index}`} value={status.nome}>
                            {status.nome}
                          </SelectItem>
                        ))}
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
                    onChange={(value) => updateFormData('valor_projeto', value === '' ? '' : Number(value))}
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
                    onChange={(value) => updateFormData('margem_venda_valor', value === '' ? '' : Number(value))}
                  />
                </div>
                <div>
                  <Label htmlFor="mrr">MRR</Label>
                  <CurrencyInput
                    id="mrr"
                    value={formData.mrr}
                    onChange={(value) => updateFormData('mrr', value === '' ? '' : Number(value))}
                  />
                </div>
                <div>
                  <Label htmlFor="mrr_total">MRR Total</Label>
                  <CurrencyInput
                    id="mrr_total"
                    value={formData.mrr_total}
                    onChange={(value) => updateFormData('mrr_total', value === '' ? '' : Number(value))}
                  />
                </div>
                <div>
                  <Label htmlFor="psa_planejado">PSA Planejado</Label>
                  <CurrencyInput
                    id="psa_planejado"
                    value={formData.psa_planejado}
                    onChange={(value) => updateFormData('psa_planejado', value === '' ? '' : Number(value))}
                  />
                </div>
                <div>
                  <Label htmlFor="diferenca_psa_projeto">Diferença PSA/Projeto</Label>
                  <CurrencyInput
                    id="diferenca_psa_projeto"
                    value={formData.diferenca_psa_projeto}
                    onChange={(value) => updateFormData('diferenca_psa_projeto', value === '' ? '' : Number(value))}
                  />
                </div>
                <div>
                  <Label htmlFor="receita_atual">Receita Atual</Label>
                  <CurrencyInput
                    id="receita_atual"
                    value={formData.receita_atual}
                    onChange={(value) => updateFormData('receita_atual', value === '' ? '' : Number(value))}
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
                    onChange={(value) => updateFormData('margem_atual_valor', value === '' ? '' : Number(value))}
                  />
                </div>
                <div>
                  <Label htmlFor="investimento_perdas">Investimento Perdas</Label>
                  <CurrencyInput
                    id="investimento_perdas"
                    value={formData.investimento_perdas}
                    onChange={(value) => updateFormData('investimento_perdas', value === '' ? '' : Number(value))}
                  />
                </div>
                <div>
                  <Label htmlFor="investimento_comercial">Investimento Comercial</Label>
                  <CurrencyInput
                    id="investimento_comercial"
                    value={formData.investimento_comercial}
                    onChange={(value) => updateFormData('investimento_comercial', value === '' ? '' : Number(value))}
                  />
                </div>
                <div>
                  <Label htmlFor="investimento_erro_produto">Investimento Erro Produto</Label>
                  <CurrencyInput
                    id="investimento_erro_produto"
                    value={formData.investimento_erro_produto}
                    onChange={(value) => updateFormData('investimento_erro_produto', value === '' ? '' : Number(value))}
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
                  <div className="space-y-2">
                    <DatePicker
                      value={formData.go_live_previsto || ''}
                      onChange={(value) => updateFormData('go_live_previsto', value)}
                      placeholder="Selecione a data do Go Live"
                    />
                    {isEditing && previousGoLive && (
                      <GoLiveHistory 
                        currentDate={formData.go_live_previsto} 
                        previousDate={previousGoLive}
                      />
                    )}
                  </div>
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
                            key={`${file.name}-${file.size}-${index}`}
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
              {submitting ? 'Salvando...' : (isEditing ? 'Atualizar TAP' : 'Salvar TAP')}
            </Button>
            <Button type="button" variant="outline" onClick={() => navigate(-1)}>
              Cancelar
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {showSummary && createdTAP && (
        <TAPSuccessDialog
          isOpen={showSummary}
          onClose={() => setShowSummary(false)}
          tapData={createdTAP}
          onComplete={handleSummaryComplete}
        />
      )}
      
      {showEditSuccess && editedTAP && (
        <TAPEditSuccessDialog
          open={showEditSuccess}
          onOpenChange={setShowEditSuccess}
          tapData={editedTAP}
          onContinue={() => {
            setShowEditSuccess(false);
            navigate('/projects');
          }}
        />
      )}
    </form>
  );
}