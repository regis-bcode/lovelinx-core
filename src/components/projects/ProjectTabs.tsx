import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { CreatableSelect } from "@/components/ui/creatable-select";
import { Project } from "@/types/project";
import { TAP, TAPFormData } from "@/types/tap";
import { useTAP } from "@/hooks/useTAP";
import { useProjects } from "@/hooks/useProjects";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { 
  FileText, 
  DollarSign, 
  Calendar, 
  FileEdit,
  Save,
  Target,
  MessageSquare,
  CheckSquare
} from "lucide-react";
import { TaskList } from "./TaskList";
import { CustomFieldListManager } from "./CustomFieldListManager";
import { useTasks } from "@/hooks/useTasks";

// Opções padrão para os campos criativos
const DEFAULT_GPP_OPTIONS = [
  "João Silva",
  "Maria Santos", 
  "Pedro Oliveira",
  "Ana Costa"
];

const DEFAULT_ARQUITETO_OPTIONS = [
  "Carlos Mendes",
  "Fernanda Lima",
  "Ricardo Souza", 
  "Juliana Rocha"
];

const DEFAULT_VENDEDOR_OPTIONS = [
  "VEND001",
  "VEND002",
  "VEND003",
  "VEND004"
];

const DEFAULT_COORDENADOR_OPTIONS = [
  "Lucas Pereira",
  "Patrícia Alves",
  "Roberto Silva",
  "Camila Torres"
];

const DEFAULT_GERENTE_PROJETO_OPTIONS = [
  "Amanda Ferreira",
  "Gustavo Ribeiro",
  "Mariana Dias",
  "Thiago Moreira"
];

const DEFAULT_GERENTE_PORTFOLIO_OPTIONS = [
  "Bruno Carvalho",
  "Larissa Gonçalves",
  "Diego Santos",
  "Vanessa Martins"
];

const DEFAULT_GERENTE_ESCRITORIO_OPTIONS = [
  "Renato Barbosa",
  "Beatriz Nunes",
  "Felipe Araújo",
  "Gabriela Castro"
];

const DEFAULT_CRITICIDADE_OPTIONS = [
  "Baixa",
  "Média", 
  "Alta",
  "Crítica"
];

interface ProjectTabsProps {
  project?: Project;
  isLoading?: boolean;
  folderId?: string | null;
}

export function ProjectTabs({ project, isLoading = false, folderId }: ProjectTabsProps) {
  const { tap, createTAP, updateTAP } = useTAP(project?.id);
  const { createProject } = useProjects();
  const { 
    tasks, 
    customFields, 
    createTask, 
    updateTask, 
    deleteTask, 
    createCustomField, 
    deleteCustomField 
  } = useTasks(project?.id);
  const { user } = useAuth();
  const navigate = useNavigate();
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
    if (!user) {
      toast({
        title: "Erro",
        description: "Usuário não autenticado.",
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
        // Se já existe TAP, apenas atualiza
        await updateTAP(tap.id, formData);
      } else {
        // Se não existe TAP, precisa criar projeto primeiro (se não existir) e depois TAP
        if (missingFields.length > 0) {
          toast({
            title: "Campos obrigatórios",
            description: `Preencha todos os campos obrigatórios da aba Identificação antes de criar o TAP.`,
            variant: "destructive",
          });
          return;
        }

        let targetProjectId = project?.id;

        // Se não há projeto, cria um projeto base
        if (!project) {
          const projectFormData = {
            data: formData.data!,
            cod_cliente: formData.cod_cliente!,
            nome_projeto: formData.nome_projeto!,
            cliente: formData.cod_cliente!, // Usar código como cliente por agora
            gpp: formData.gpp!,
            coordenador: formData.coordenador!,
            produto: formData.produto!,
            esn: formData.esn!,
            arquiteto: formData.arquiteto!,
            criticidade: formData.criticidade_totvs!,
            folder_id: folderId || undefined,
            valor_projeto: 0,
            receita_atual: 0,
            margem_venda_percent: 0,
            margem_atual_percent: 0,
            margem_venda_reais: 0,
            margem_atual_reais: 0,
            mrr: 0,
            investimento_perdas: 0,
            mrr_total: 0,
            investimento_comercial: 0,
            psa_planejado: 0,
            investimento_erro_produto: 0,
            diferenca_psa_projeto: 0,
            projeto_em_perda: false,
            duracao_pos_producao: 0,
          };

          const newProject = await createProject(projectFormData);
          if (!newProject) {
            throw new Error("Falha ao criar projeto base");
          }
          targetProjectId = newProject.id;
        }

        // Agora cria a TAP com o project_id
        const tapFormData = {
          ...formData,
          project_id: targetProjectId!,
        } as TAPFormData;

        await createTAP(tapFormData);
        
        // Se foi criado via pasta, navega de volta para a pasta
        if (folderId && tab === 'Identificação') {
          toast({
            title: "TAP criado com sucesso!",
            description: "Você será redirecionado para a pasta.",
          });
          // Aguarda um pouco para mostrar o toast antes de navegar
          setTimeout(() => {
            const currentUrl = window.location.pathname;
            const workspaceMatch = currentUrl.match(/\/workspaces\/([^\/]+)/);
            if (workspaceMatch) {
              navigate(`/workspaces/${workspaceMatch[1]}/folders/${folderId}/projects`);
            } else {
              navigate('/projects');
            }
          }, 1500);
        }
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
      <TabsList className="grid w-full grid-cols-6">
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
        <TabsTrigger value="tarefas" className="flex items-center gap-2">
          <CheckSquare className="h-4 w-4" />
          Tarefas
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
                <CreatableSelect
                  value={formData.gpp}
                  onValueChange={(value) => updateField('gpp', value)}
                  options={DEFAULT_GPP_OPTIONS}
                  placeholder="Selecione ou crie um GPP"
                />
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
                <CreatableSelect
                  value={formData.arquiteto}
                  onValueChange={(value) => updateField('arquiteto', value)}
                  options={DEFAULT_ARQUITETO_OPTIONS}
                  placeholder="Selecione ou crie um arquiteto"
                />
              </div>
              <div>
                <Label htmlFor="criticidade_totvs">Criticidade *</Label>
                <CreatableSelect
                  value={formData.criticidade_totvs}
                  onValueChange={(value) => updateField('criticidade_totvs', value as 'Baixa' | 'Média' | 'Alta' | 'Crítica')}
                  options={DEFAULT_CRITICIDADE_OPTIONS}
                  placeholder="Selecione ou crie uma criticidade"
                />
              </div>
              <div>
                <Label htmlFor="coordenador">Coordenador do Projeto (CP) *</Label>
                <CreatableSelect
                  value={formData.coordenador}
                  onValueChange={(value) => updateField('coordenador', value)}
                  options={DEFAULT_COORDENADOR_OPTIONS}
                  placeholder="Selecione ou crie um coordenador"
                />
              </div>
              <div>
                <Label htmlFor="gerente_projeto">Gerente do Projeto (GP) *</Label>
                <CreatableSelect
                  value={formData.gerente_projeto}
                  onValueChange={(value) => updateField('gerente_projeto', value)}
                  options={DEFAULT_GERENTE_PROJETO_OPTIONS}
                  placeholder="Selecione ou crie um gerente do projeto"
                />
              </div>
              <div>
                <Label htmlFor="gerente_portfolio">Gerente de Portfólio (GPP) *</Label>
                <CreatableSelect
                  value={formData.gerente_portfolio}
                  onValueChange={(value) => updateField('gerente_portfolio', value)}
                  options={DEFAULT_GERENTE_PORTFOLIO_OPTIONS}
                  placeholder="Selecione ou crie um gerente de portfólio"
                />
              </div>
              <div>
                <Label htmlFor="gerente_escritorio">Gerente Escritório de Projetos *</Label>
                <CreatableSelect
                  value={formData.gerente_escritorio}
                  onValueChange={(value) => updateField('gerente_escritorio', value)}
                  options={DEFAULT_GERENTE_ESCRITORIO_OPTIONS}
                  placeholder="Selecione ou crie um gerente do escritório"
                />
              </div>
              <div>
                <Label htmlFor="esn">Vendedor *</Label>
                <CreatableSelect
                  value={formData.esn}
                  onValueChange={(value) => updateField('esn', value)}
                  options={DEFAULT_VENDEDOR_OPTIONS}
                  placeholder="Selecione ou crie um vendedor"
                />
              </div>
              <div>
                <Label htmlFor="criticidade_cliente">Criticidade Cliente *</Label>
                <CreatableSelect
                  value={formData.criticidade_cliente}
                  onValueChange={(value) => updateField('criticidade_cliente', value)}
                  options={DEFAULT_CRITICIDADE_OPTIONS}
                  placeholder="Selecione ou crie uma criticidade do cliente"
                />
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
                <Label htmlFor="valor_projeto">Valor do Projeto</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">R$</span>
                  <Input
                    id="valor_projeto"
                    type="number"
                    step="0.01"
                    value={formData.valor_projeto}
                    onChange={(e) => updateField('valor_projeto', parseFloat(e.target.value) || 0)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="margem_venda_percent">Margem da Venda</Label>
                <div className="relative">
                  <Input
                    id="margem_venda_percent"
                    type="number"
                    step="0.01"
                    value={formData.margem_venda_percent}
                    onChange={(e) => updateField('margem_venda_percent', parseFloat(e.target.value) || 0)}
                    className="pr-8"
                  />
                  <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">%</span>
                </div>
              </div>
              <div>
                <Label htmlFor="margem_venda_valor">Margem da Venda (valor)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">R$</span>
                  <Input
                    id="margem_venda_valor"
                    type="number"
                    step="0.01"
                    value={formData.margem_venda_valor}
                    onChange={(e) => updateField('margem_venda_valor', parseFloat(e.target.value) || 0)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="mrr">MRR - Recorrente Mensal</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">R$</span>
                  <Input
                    id="mrr"
                    type="number"
                    step="0.01"
                    value={formData.mrr}
                    onChange={(e) => updateField('mrr', parseFloat(e.target.value) || 0)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="mrr_total">MRR Total (Contratados)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">R$</span>
                  <Input
                    id="mrr_total"
                    type="number"
                    step="0.01"
                    value={formData.mrr_total}
                    onChange={(e) => updateField('mrr_total', parseFloat(e.target.value) || 0)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="psa_planejado">PSA Planejado</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">R$</span>
                  <Input
                    id="psa_planejado"
                    type="number"
                    step="0.01"
                    value={formData.psa_planejado}
                    onChange={(e) => updateField('psa_planejado', parseFloat(e.target.value) || 0)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="diferenca_psa_projeto">Diferença PSA x Projeto</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">R$</span>
                  <Input
                    id="diferenca_psa_projeto"
                    type="number"
                    step="0.01"
                    value={formData.diferenca_psa_projeto}
                    onChange={(e) => updateField('diferenca_psa_projeto', parseFloat(e.target.value) || 0)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="receita_atual">Receita Atual</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">R$</span>
                  <Input
                    id="receita_atual"
                    type="number"
                    step="0.01"
                    value={formData.receita_atual}
                    onChange={(e) => updateField('receita_atual', parseFloat(e.target.value) || 0)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="margem_atual_percent">Margem Atual</Label>
                <div className="relative">
                  <Input
                    id="margem_atual_percent"
                    type="number"
                    step="0.01"
                    value={formData.margem_atual_percent}
                    onChange={(e) => updateField('margem_atual_percent', parseFloat(e.target.value) || 0)}
                    className="pr-8"
                  />
                  <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">%</span>
                </div>
              </div>
              <div>
                <Label htmlFor="margem_atual_valor">Margem Atual (valor)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">R$</span>
                  <Input
                    id="margem_atual_valor"
                    type="number"
                    step="0.01"
                    value={formData.margem_atual_valor}
                    onChange={(e) => updateField('margem_atual_valor', parseFloat(e.target.value) || 0)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="investimento_perdas">Investimento Perdas</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">R$</span>
                  <Input
                    id="investimento_perdas"
                    type="number"
                    step="0.01"
                    value={formData.investimento_perdas}
                    onChange={(e) => updateField('investimento_perdas', parseFloat(e.target.value) || 0)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="investimento_comercial">Investimento Comercial</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">R$</span>
                  <Input
                    id="investimento_comercial"
                    type="number"
                    step="0.01"
                    value={formData.investimento_comercial}
                    onChange={(e) => updateField('investimento_comercial', parseFloat(e.target.value) || 0)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="investimento_erro_produto">Investimento Erro Produto</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">R$</span>
                  <Input
                    id="investimento_erro_produto"
                    type="number"
                    step="0.01"
                    value={formData.investimento_erro_produto}
                    onChange={(e) => updateField('investimento_erro_produto', parseFloat(e.target.value) || 0)}
                    className="pl-10"
                  />
                </div>
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

      {/* Aba Tarefas */}
      <TabsContent value="tarefas" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckSquare className="h-5 w-5" />
              Tarefas do Projeto
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <CustomFieldListManager 
              customFields={customFields}
              onFieldCreate={createCustomField}
              onFieldUpdate={() => {}}
              onFieldDelete={deleteCustomField}
            />
            
            <div className="border-t pt-6">
              <TaskList 
                tasks={tasks}
                onTaskCreate={createTask}
                onTaskUpdate={updateTask}
                onTaskDelete={deleteTask}
              />
            </div>
          </CardContent>
        </Card>
      </TabsContent>

    </Tabs>
  );
}