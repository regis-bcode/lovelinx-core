import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTAP } from "@/hooks/useTAP";
import { useProjects } from "@/hooks/useProjects";
import { Calendar, DollarSign, FileText, Target, Edit, Save, X } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { TAP } from "@/types/tap";
import { TAPEditSuccessDialog } from "@/components/projects/TAPEditSuccessDialog";
import { GoLiveHistory } from "@/components/ui/go-live-history";
import { DatePicker } from "@/components/ui/date-picker";
import { CurrencyInput } from "@/components/ui/currency-input";

interface TAPDetailsProps {
  projectId: string;
}

export function TAPDetails({ projectId }: TAPDetailsProps) {
  const { tap, loading: tapLoading, createTAP, updateTAP } = useTAP(projectId);
const { getProject, updateProject } = useProjects();
  const project = getProject(projectId);
  const { toast } = useToast();

  // Dados de visualização combinando Projeto (ex.: cliente) e TAP (sobrepõe)
  const tapData = { ...(project || {}), ...(tap || {}) };
  const loading = tapLoading;

  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<any>(tapData || {});
  const [showEditSuccess, setShowEditSuccess] = useState(false);
  const [editedTAP, setEditedTAP] = useState<TAP | null>(null);
  const [changes, setChanges] = useState<{ label: string; old: any; new: any; group?: string }[]>([]);
  const [previousGoLive, setPreviousGoLive] = useState<string>('');

  // Sincroniza os dados de edição quando a TAP/projeto carregar
  useEffect(() => {
    setEditData(tapData || {});
  }, [tapData]);

  // Guarda a data anterior de go-live para o histórico
  useEffect(() => {
    if (tap?.go_live_previsto) {
      setPreviousGoLive(tap.go_live_previsto);
    }
  }, [tap]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const handleSave = async () => {
    try {
      // Preparar payloads
      const tapPayload = {
        data: editData.data,
        nome_projeto: editData.nome_projeto,
        cod_cliente: editData.cod_cliente,
        gpp: editData.gpp,
        produto: editData.produto,
        servico: editData.servico,
        arquiteto: editData.arquiteto,
        criticidade_totvs: editData.criticidade_totvs || editData.criticidade,
        coordenador: editData.coordenador,
        gerente_projeto: editData.gerente_projeto,
        esn: editData.esn,
        criticidade_cliente: editData.criticidade_cliente,
        drive: editData.drive,
        data_inicio: editData.data_inicio,
        go_live_previsto: editData.go_live_previsto,
        duracao_pos_producao: Number(editData.duracao_pos_producao) || 0,
        encerramento: editData.encerramento,
        escopo: editData.escopo,
        objetivo: editData.objetivo,
        observacoes: editData.observacoes || editData.observacao,
        valor_projeto: Number(editData.valor_projeto) || 0,
        margem_venda_percent: Number(editData.margem_venda_percent) || 0,
        margem_venda_valor: Number(editData.margem_venda_valor) || 0,
        mrr: Number(editData.mrr) || 0,
        mrr_total: Number(editData.mrr_total) || 0,
        psa_planejado: Number(editData.psa_planejado) || 0,
        diferenca_psa_projeto: Number(editData.diferenca_psa_projeto) || 0,
        receita_atual: Number(editData.receita_atual) || 0,
        margem_atual_percent: Number(editData.margem_atual_percent) || 0,
        margem_atual_valor: Number(editData.margem_atual_valor) || 0,
        investimento_perdas: Number(editData.investimento_perdas) || 0,
        investimento_comercial: Number(editData.investimento_comercial) || 0,
        investimento_erro_produto: Number(editData.investimento_erro_produto) || 0,
        projeto_em_perda: !!editData.projeto_em_perda,
      } as any;

      const projectPayload = {
        data: editData.data,
        cod_cliente: editData.cod_cliente,
        nome_projeto: editData.nome_projeto,
        cliente: editData.cliente,
        gpp: editData.gpp,
        coordenador: editData.coordenador,
        produto: editData.produto,
        esn: editData.esn,
        arquiteto: editData.arquiteto,
        criticidade: (editData.criticidade_totvs || editData.criticidade) as any,
        status: editData.status,
        drive: editData.drive,
        valor_projeto: Number(editData.valor_projeto) || 0,
        receita_atual: Number(editData.receita_atual) || 0,
        margem_venda_percent: Number(editData.margem_venda_percent) || 0,
        margem_atual_percent: Number(editData.margem_atual_percent) || 0,
        margem_venda_reais: Number(editData.margem_venda_valor) || 0,
        margem_atual_reais: Number(editData.margem_atual_valor) || 0,
        mrr: Number(editData.mrr) || 0,
        investimento_perdas: Number(editData.investimento_perdas) || 0,
        mrr_total: Number(editData.mrr_total) || 0,
        investimento_comercial: Number(editData.investimento_comercial) || 0,
        psa_planejado: Number(editData.psa_planejado) || 0,
        investimento_erro_produto: Number(editData.investimento_erro_produto) || 0,
        diferenca_psa_projeto: Number(editData.diferenca_psa_projeto) || 0,
        projeto_em_perda: !!editData.projeto_em_perda,
        data_inicio: editData.data_inicio,
        go_live_previsto: editData.go_live_previsto,
        duracao_pos_producao: Number(editData.duracao_pos_producao) || 0,
        encerramento: editData.encerramento,
        escopo: editData.escopo,
        objetivo: editData.objetivo,
        observacao: editData.observacoes || editData.observacao,
        gerente_projeto: editData.gerente_projeto,
        criticidade_cliente: editData.criticidade_cliente,
      } as any;

      // Executar updates
      let updatedTap = tap ? await updateTAP(tap.id, tapPayload) : null;
      const updatedProject = await updateProject(projectId, projectPayload);

      // Se não existia TAP ainda, criar
      if (!tap && !updatedTap) {
        const created = await createTAP({ ...tapPayload, project_id: projectId } as any);
        updatedTap = created as TAP;
      }

      // Montar diff
      const newChanges: { label: string; old: any; new: any; group?: string }[] = [];
      const addChange = (label: string, oldVal: any, newVal: any, group?: string) => {
        const o = oldVal ?? '';
        const n = newVal ?? '';
        if (String(o) !== String(n)) newChanges.push({ label, old: o, new: n, group });
      };

      const oldTap: any = tapData || {};
      const newTap: any = updatedTap || tapPayload;
      const oldProj: any = project || {};
      const newProj: any = updatedProject || projectPayload;

      // TAP fields
      addChange('Nome do Projeto', oldTap.nome_projeto, newTap.nome_projeto, 'TAP');
      addChange('Código do Cliente', oldTap.cod_cliente, newTap.cod_cliente, 'TAP');
      addChange('Cliente', oldProj.cliente, newProj.cliente, 'Projeto');
      addChange('GPP', oldTap.gpp, newTap.gpp, 'TAP');
      addChange('Produto', oldTap.produto, newTap.produto, 'TAP');
      addChange('Serviço', oldTap.servico, newTap.servico, 'TAP');
      addChange('Arquiteto', oldTap.arquiteto, newTap.arquiteto, 'TAP');
      addChange('Coordenador', oldTap.coordenador, newTap.coordenador, 'TAP');
      addChange('Gerente Projeto', oldTap.gerente_projeto, newTap.gerente_projeto, 'TAP');
      addChange('ESN', oldTap.esn, newTap.esn, 'TAP');
      addChange('Criticidade', oldProj.criticidade, newProj.criticidade, 'Projeto');
      addChange('Status', oldProj.status, newProj.status, 'Projeto');
      addChange('Data', oldTap.data, newTap.data, 'TAP');
      addChange('Data Início', oldTap.data_inicio, newTap.data_inicio, 'TAP');
      addChange('Go-live Previsto', oldTap.go_live_previsto, newTap.go_live_previsto, 'TAP');
      addChange('Encerramento', oldTap.encerramento, newTap.encerramento, 'TAP');
      addChange('Valor Projeto', oldTap.valor_projeto, newTap.valor_projeto, 'TAP');
      addChange('Receita Atual', oldTap.receita_atual, newTap.receita_atual, 'TAP');
      addChange('MRR', oldTap.mrr, newTap.mrr, 'TAP');
      addChange('MRR Total', oldTap.mrr_total, newTap.mrr_total, 'TAP');
      addChange('PSA Planejado', oldTap.psa_planejado, newTap.psa_planejado, 'TAP');
      addChange('Investimento Comercial', oldTap.investimento_comercial, newTap.investimento_comercial, 'TAP');
      addChange('Investimento Erro Produto', oldTap.investimento_erro_produto, newTap.investimento_erro_produto, 'TAP');
      addChange('Investimento Perdas', oldTap.investimento_perdas, newTap.investimento_perdas, 'TAP');
      addChange('Diferença PSA x Projeto', oldTap.diferenca_psa_projeto, newTap.diferenca_psa_projeto, 'TAP');
      addChange('Escopo', oldTap.escopo, newTap.escopo, 'TAP');
      addChange('Objetivo', oldTap.objetivo, newTap.objetivo, 'TAP');
      addChange('Observações', oldTap.observacoes || oldProj.observacao, newTap.observacoes || newProj.observacao, 'TAP');

      setChanges(newChanges);

      setEditedTAP(updatedTap as TAP);
      setShowEditSuccess(true);
      setIsEditing(false);
      toast({ title: 'Sucesso', description: 'TAP salva com sucesso!' });
    } catch (error) {
      toast({ title: 'Erro', description: 'Erro ao salvar TAP.', variant: 'destructive' });
    }
  };

  const handleCancel = () => {
    setEditData(tapData || {});
    setIsEditing(false);
  };

  const handleFieldChange = (field: string, value: any) => {
    setEditData(prev => ({ ...prev, [field]: value }));
  };

  if (!tapData && !isEditing) {
  return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhuma TAP (Termo de Abertura de Projeto) encontrada.</p>
            <p className="text-sm mt-2">As informações da TAP aparecerão aqui quando disponíveis.</p>
            <Button onClick={() => setIsEditing(true)} className="mt-4">
              <Edit className="h-4 w-4 mr-2" />
              Criar TAP
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (<>
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            TAP do Projeto
          </div>
          <div className="flex gap-2">
            {isEditing ? (
              <>
                <Button onClick={handleSave} size="sm">
                  <Save className="h-4 w-4 mr-2" />
                  Salvar
                </Button>
                <Button onClick={handleCancel} variant="outline" size="sm">
                  <X className="h-4 w-4 mr-2" />
                  Cancelar
                </Button>
              </>
            ) : (
              <Button onClick={() => setIsEditing(true)} size="sm">
                <Edit className="h-4 w-4 mr-2" />
                Editar
              </Button>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-8">
        {/* Identificação */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <FileText className="h-4 w-4" />
            <h3 className="text-lg font-semibold">Identificação</h3>
          </div>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div>
               <label className="text-sm font-medium text-muted-foreground">Data</label>
               {isEditing ? (
                 <DatePicker
                   value={editData.data || ''}
                   onChange={(value) => handleFieldChange('data', value)}
                   placeholder="Selecione a data"
                 />
               ) : (
                 <p>{tapData.data ? new Date(tapData.data).toLocaleDateString('pt-BR') : '-'}</p>
               )}
             </div>
             <div>
               <label className="text-sm font-medium text-muted-foreground">Cod. Cliente</label>
               {isEditing ? (
                 <Input
                   value={editData.cod_cliente || ''}
                   onChange={(e) => handleFieldChange('cod_cliente', e.target.value)}
                   placeholder="Código do cliente"
                 />
               ) : (
                 <p className="font-semibold">{tapData.cod_cliente}</p>
               )}
             </div>
             <div>
               <label className="text-sm font-medium text-muted-foreground">Nome do Projeto</label>
               {isEditing ? (
                 <Input
                   value={editData.nome_projeto || ''}
                   onChange={(e) => handleFieldChange('nome_projeto', e.target.value)}
                   placeholder="Nome do projeto"
                 />
               ) : (
                 <p className="font-semibold">{tapData.nome_projeto}</p>
               )}
             </div>
             <div>
               <label className="text-sm font-medium text-muted-foreground">Cliente</label>
               {isEditing ? (
                 <Input
                   value={editData.cliente || ''}
                   onChange={(e) => handleFieldChange('cliente', e.target.value)}
                   placeholder="Nome do cliente"
                 />
               ) : (
                 <p>{(tapData as any).cliente || '-'}</p>
               )}
             </div>
                 <div>
                   <label className="text-sm font-medium text-muted-foreground">GPP</label>
                   {isEditing ? (
                     <Input
                       value={editData.gpp || ''}
                       onChange={(e) => handleFieldChange('gpp', e.target.value)}
                       placeholder="GPP"
                     />
                   ) : (
                     <p>{tapData.gpp}</p>
                   )}
                 </div>
             <div>
               <label className="text-sm font-medium text-muted-foreground">Coordenador do Projeto (CP)</label>
               {isEditing ? (
                 <Input
                   value={editData.coordenador || ''}
                   onChange={(e) => handleFieldChange('coordenador', e.target.value)}
                   placeholder="Coordenador"
                 />
               ) : (
                 <p>{tapData.coordenador}</p>
               )}
             </div>
             <div>
               <label className="text-sm font-medium text-muted-foreground">Produto</label>
               {isEditing ? (
                 <Input
                   value={editData.produto || ''}
                   onChange={(e) => handleFieldChange('produto', e.target.value)}
                   placeholder="Produto"
                 />
               ) : (
                 <p>{tapData.produto}</p>
               )}
             </div>
             <div>
               <label className="text-sm font-medium text-muted-foreground">ESN</label>
               {isEditing ? (
                 <Input
                   value={editData.esn || ''}
                   onChange={(e) => handleFieldChange('esn', e.target.value)}
                   placeholder="ESN"
                 />
               ) : (
                 <p>{tapData.esn}</p>
               )}
             </div>
             <div>
               <label className="text-sm font-medium text-muted-foreground">Arquiteto</label>
               {isEditing ? (
                 <Input
                   value={editData.arquiteto || ''}
                   onChange={(e) => handleFieldChange('arquiteto', e.target.value)}
                   placeholder="Arquiteto"
                 />
               ) : (
                 <p>{tapData.arquiteto}</p>
               )}
             </div>
             <div>
               <label className="text-sm font-medium text-muted-foreground">Criticidade</label>
               {isEditing ? (
                 <Select
                   value={editData.criticidade_totvs || editData.criticidade || ''}
                   onValueChange={(value) => handleFieldChange('criticidade_totvs', value)}
                 >
                   <SelectTrigger>
                     <SelectValue placeholder="Selecione a criticidade" />
                   </SelectTrigger>
                   <SelectContent>
                     <SelectItem value="Baixa">Baixa</SelectItem>
                     <SelectItem value="Média">Média</SelectItem>
                     <SelectItem value="Alta">Alta</SelectItem>
                     <SelectItem value="Crítica">Crítica</SelectItem>
                   </SelectContent>
                 </Select>
               ) : (
                 <Badge variant="outline">{(tapData as any).criticidade_totvs || (tapData as any).criticidade}</Badge>
               )}
             </div>
             <div>
               <label className="text-sm font-medium text-muted-foreground">Gerente Projeto</label>
               {isEditing ? (
                 <Input
                   value={editData.gerente_projeto || ''}
                   onChange={(e) => handleFieldChange('gerente_projeto', e.target.value)}
                   placeholder="Gerente do projeto"
                 />
               ) : (
                 <p>{(tapData as any).gerente_projeto || '-'}</p>
               )}
             </div>
             <div>
               <label className="text-sm font-medium text-muted-foreground">Gerente Portfolio</label>
               {isEditing ? (
                 <Input
                   value={editData.gerente_portfolio || ''}
                   onChange={(e) => handleFieldChange('gerente_portfolio', e.target.value)}
                   placeholder="Gerente do portfolio"
                 />
               ) : (
                 <p>{(tapData as any).gerente_portfolio || '-'}</p>
               )}
             </div>
             <div>
               <label className="text-sm font-medium text-muted-foreground">Gerente Escritório</label>
               {isEditing ? (
                 <Input
                   value={editData.gerente_escritorio || ''}
                   onChange={(e) => handleFieldChange('gerente_escritorio', e.target.value)}
                   placeholder="Gerente do escritório"
                 />
               ) : (
                 <p>{(tapData as any).gerente_escritorio || '-'}</p>
               )}
             </div>
             <div>
               <label className="text-sm font-medium text-muted-foreground">Criticidade Cliente</label>
               {isEditing ? (
                 <Input
                   value={editData.criticidade_cliente || ''}
                   onChange={(e) => handleFieldChange('criticidade_cliente', e.target.value)}
                   placeholder="Criticidade do cliente"
                 />
               ) : (
                 <p>{(tapData as any).criticidade_cliente || '-'}</p>
               )}
             </div>
             <div className="md:col-span-2">
               <label className="text-sm font-medium text-muted-foreground">Drive</label>
               {isEditing ? (
                 <Input
                   value={editData.drive || ''}
                   onChange={(e) => handleFieldChange('drive', e.target.value)}
                   placeholder="Link do drive"
                 />
               ) : (
                 <p className="mt-1 text-sm break-all">
                   {tapData.drive ? (
                     <a href={tapData.drive} target="_blank" rel="noopener noreferrer" className="underline text-primary">
                       {tapData.drive}
                     </a>
                   ) : (
                     '-'
                   )}
                 </p>
               )}
             </div>
           </div>
        </div>

        {/* Financeiro */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <DollarSign className="h-4 w-4" />
            <h3 className="text-lg font-semibold">Financeiro</h3>
          </div>
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
             <div>
               <label className="text-sm font-medium text-muted-foreground">Valor do Projeto</label>
               {isEditing ? (
                 <CurrencyInput
                   value={editData.valor_projeto || 0}
                   onChange={(v) => handleFieldChange('valor_projeto', parseFloat(v || '0'))}
                   placeholder="R$ 0,00"
                 />
               ) : (
                 <p className="text-lg font-semibold">{formatCurrency(tapData.valor_projeto)}</p>
               )}
             </div>
             <div>
               <label className="text-sm font-medium text-muted-foreground">Receita Atual</label>
               {isEditing ? (
                 <CurrencyInput
                   value={editData.receita_atual || 0}
                   onChange={(v) => handleFieldChange('receita_atual', parseFloat(v || '0'))}
                   placeholder="R$ 0,00"
                 />
               ) : (
                 <p className="text-lg font-semibold">{formatCurrency(tapData.receita_atual)}</p>
               )}
             </div>
             <div>
               <label className="text-sm font-medium text-muted-foreground">Margem da Venda (%)</label>
               {isEditing ? (
                 <Input
                   type="number"
                   step="0.01"
                   value={editData.margem_venda_percent || ''}
                   onChange={(e) => handleFieldChange('margem_venda_percent', parseFloat(e.target.value || '0'))}
                   placeholder="0.00"
                 />
               ) : (
                 <p className="text-lg font-semibold">{tapData.margem_venda_percent?.toFixed(2) ?? '0.00'}%</p>
               )}
             </div>
             <div>
               <label className="text-sm font-medium text-muted-foreground">Margem Atual (%)</label>
               {isEditing ? (
                 <Input
                   type="number"
                   step="0.01"
                   value={editData.margem_atual_percent || ''}
                   onChange={(e) => handleFieldChange('margem_atual_percent', parseFloat(e.target.value || '0'))}
                   placeholder="0.00"
                 />
               ) : (
                 <p className="text-lg font-semibold">{tapData.margem_atual_percent?.toFixed(2) ?? '0.00'}%</p>
               )}
             </div>
             <div>
               <label className="text-sm font-medium text-muted-foreground">Margem da Venda (Valor Monetário)</label>
               {isEditing ? (
                 <CurrencyInput
                   value={editData.margem_venda_valor || 0}
                   onChange={(v) => handleFieldChange('margem_venda_valor', parseFloat(v || '0'))}
                   placeholder="R$ 0,00"
                 />
               ) : (
                 <p className="text-lg font-semibold">{formatCurrency((tapData as any).margem_venda_valor || (tapData as any).margem_venda_reais)}</p>
               )}
             </div>
             <div>
               <label className="text-sm font-medium text-muted-foreground">Margem Atual (Valor Monetário)</label>
               {isEditing ? (
                 <CurrencyInput
                   value={editData.margem_atual_valor || 0}
                   onChange={(v) => handleFieldChange('margem_atual_valor', parseFloat(v || '0'))}
                   placeholder="R$ 0,00"
                 />
               ) : (
                 <p className="text-lg font-semibold">{formatCurrency((tapData as any).margem_atual_valor || (tapData as any).margem_atual_reais)}</p>
               )}
             </div>
             <div>
               <label className="text-sm font-medium text-muted-foreground">MRR - Recorrente Mensal</label>
               {isEditing ? (
                 <CurrencyInput
                   value={editData.mrr || 0}
                   onChange={(v) => handleFieldChange('mrr', parseFloat(v || '0'))}
                   placeholder="R$ 0,00"
                 />
               ) : (
                 <p className="text-lg font-semibold">{formatCurrency(tapData.mrr)}</p>
               )}
             </div>
             <div>
               <label className="text-sm font-medium text-muted-foreground">MRR Total (Contratados R$)</label>
               {isEditing ? (
                 <CurrencyInput
                   value={editData.mrr_total || 0}
                   onChange={(v) => handleFieldChange('mrr_total', parseFloat(v || '0'))}
                   placeholder="R$ 0,00"
                 />
               ) : (
                 <p className="text-lg font-semibold">{formatCurrency(tapData.mrr_total)}</p>
               )}
             </div>
             <div>
               <label className="text-sm font-medium text-muted-foreground">PSA Planejado</label>
               {isEditing ? (
                 <CurrencyInput
                   value={editData.psa_planejado || 0}
                   onChange={(v) => handleFieldChange('psa_planejado', parseFloat(v || '0'))}
                   placeholder="R$ 0,00"
                 />
               ) : (
                 <p className="text-lg font-semibold">{formatCurrency(tapData.psa_planejado)}</p>
               )}
             </div>
             <div>
               <label className="text-sm font-medium text-muted-foreground">Investimento Comercial</label>
               {isEditing ? (
                 <CurrencyInput
                   value={editData.investimento_comercial || 0}
                   onChange={(v) => handleFieldChange('investimento_comercial', parseFloat(v || '0'))}
                   placeholder="R$ 0,00"
                 />
               ) : (
                 <p className="text-lg font-semibold">{formatCurrency(tapData.investimento_comercial)}</p>
               )}
             </div>
             <div>
               <label className="text-sm font-medium text-muted-foreground">Investimento Erro Produto</label>
               {isEditing ? (
                 <CurrencyInput
                   value={editData.investimento_erro_produto || 0}
                   onChange={(v) => handleFieldChange('investimento_erro_produto', parseFloat(v || '0'))}
                   placeholder="R$ 0,00"
                 />
               ) : (
                 <p className="text-lg font-semibold">{formatCurrency(tapData.investimento_erro_produto)}</p>
               )}
             </div>
             <div>
               <label className="text-sm font-medium text-muted-foreground">Investimento Perdas</label>
               {isEditing ? (
                 <CurrencyInput
                   value={editData.investimento_perdas || 0}
                   onChange={(v) => handleFieldChange('investimento_perdas', parseFloat(v || '0'))}
                   placeholder="R$ 0,00"
                 />
               ) : (
                 <p className="text-lg font-semibold">{formatCurrency(tapData.investimento_perdas)}</p>
               )}
             </div>
             <div>
               <label className="text-sm font-medium text-muted-foreground">Diferença PSA x Projeto</label>
               {isEditing ? (
                 <CurrencyInput
                   value={editData.diferenca_psa_projeto || 0}
                   onChange={(v) => handleFieldChange('diferenca_psa_projeto', parseFloat(v || '0'))}
                   placeholder="R$ 0,00"
                 />
               ) : (
                 <p className="text-lg font-semibold">{formatCurrency(tapData.diferenca_psa_projeto)}</p>
               )}
             </div>
             <div>
               <label className="text-sm font-medium text-muted-foreground">Projeto em Perda?</label>
               <div>
                 <Badge variant={tapData.projeto_em_perda ? 'destructive' : 'secondary'}>
                   {tapData.projeto_em_perda ? 'SIM' : 'Não'}
                 </Badge>
               </div>
             </div>
           </div>
        </div>

        {/* Timeline do Projeto */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="h-4 w-4" />
            <h3 className="text-lg font-semibold">Timeline do Projeto</h3>
          </div>
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
             <div>
               <label className="text-sm font-medium text-muted-foreground">Data Início</label>
               {isEditing ? (
                <DatePicker
                  value={editData.data_inicio || ''}
                  onChange={(value) => handleFieldChange('data_inicio', value)}
                  placeholder="Selecione a data"
                />
               ) : (
                 <p>{tapData.data_inicio ? new Date(tapData.data_inicio).toLocaleDateString('pt-BR') : '-'}</p>
               )}
             </div>
             <div>
               <label className="text-sm font-medium text-muted-foreground">Go-live (Previsão)</label>
               {isEditing ? (
                 <div className="space-y-2">
                    <DatePicker
                      value={editData.go_live_previsto || ''}
                      onChange={(value) => handleFieldChange('go_live_previsto', value)}
                      placeholder="Selecione a data"
                    />
                   {previousGoLive && (
                     <GoLiveHistory currentDate={editData.go_live_previsto} previousDate={previousGoLive} />
                   )}
                 </div>
               ) : (
                 <p>{tapData.go_live_previsto ? new Date(tapData.go_live_previsto).toLocaleDateString('pt-BR') : '-'}</p>
               )}
             </div>
             <div>
               <label className="text-sm font-medium text-muted-foreground">Duração Pós-produção (em meses)</label>
               {isEditing ? (
                 <Input
                   type="number"
                   value={editData.duracao_pos_producao || ''}
                   onChange={(e) => handleFieldChange('duracao_pos_producao', parseInt(e.target.value || '0'))}
                   placeholder="0"
                 />
               ) : (
                 <p>{tapData.duracao_pos_producao ? `${tapData.duracao_pos_producao} meses` : '-'}</p>
               )}
             </div>
             <div>
               <label className="text-sm font-medium text-muted-foreground">Encerramento</label>
               {isEditing ? (
                 <DatePicker
                   value={editData.encerramento || ''}
                   onChange={(value) => handleFieldChange('encerramento', value)}
                   placeholder="Selecione a data"
                 />
               ) : (
                 <p>{tapData.encerramento ? new Date(tapData.encerramento).toLocaleDateString('pt-BR') : '-'}</p>
               )}
             </div>
           </div>
        </div>

        {/* Outros dados */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Target className="h-4 w-4" />
            <h3 className="text-lg font-semibold">Outros dados</h3>
          </div>
           <div className="space-y-4">
             <div>
               <label className="text-sm font-medium text-muted-foreground">Escopo</label>
               {isEditing ? (
                 <Textarea
                   value={editData.escopo || ''}
                   onChange={(e) => handleFieldChange('escopo', e.target.value)}
                   placeholder="Descrição do escopo"
                   rows={3}
                 />
               ) : (
                 <p className="mt-1 text-sm">{tapData.escopo || '-'}</p>
               )}
             </div>
             <div>
               <label className="text-sm font-medium text-muted-foreground">Objetivo</label>
               {isEditing ? (
                 <Textarea
                   value={editData.objetivo || ''}
                   onChange={(e) => handleFieldChange('objetivo', e.target.value)}
                   placeholder="Descrição do objetivo"
                   rows={3}
                 />
               ) : (
                 <p className="mt-1 text-sm">{tapData.objetivo || '-'}</p>
               )}
             </div>
             <div>
               <label className="text-sm font-medium text-muted-foreground">Observação</label>
               {isEditing ? (
                 <Textarea
                   value={editData.observacoes || editData.observacao || ''}
                   onChange={(e) => handleFieldChange('observacoes', e.target.value)}
                   placeholder="Observações adicionais"
                   rows={3}
                 />
               ) : (
                 <p className="mt-1 text-sm">{(tapData as any).observacoes || (tapData as any).observacao || '-'}</p>
               )}
             </div>
           </div>
        </div>
      </CardContent>
    </Card>
    <TAPEditSuccessDialog open={showEditSuccess} onOpenChange={setShowEditSuccess} tapData={editedTAP} changes={changes} onContinue={() => setShowEditSuccess(false)} />
  </>
);
}