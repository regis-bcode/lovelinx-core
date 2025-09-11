import { useParams, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Edit, Calendar, DollarSign, Users, AlertTriangle } from "lucide-react";
import { useProjects } from "@/hooks/useProjects";
import { StakeholdersList } from "@/components/projects/StakeholdersList";
import { RisksList } from "@/components/projects/RisksList";
import { CommunicationPlanList } from "@/components/projects/CommunicationPlanList";

export default function ProjectDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getProject } = useProjects();
  
  const project = id ? getProject(id) : null;

  if (!project) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-2">Projeto não encontrado</h2>
            <p className="text-muted-foreground mb-4">O projeto que você está procurando não existe.</p>
            <Button onClick={() => navigate('/projects-tap')}>
              Voltar para Projetos
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const getCriticalityBadge = (criticality: string) => {
    switch (criticality) {
      case 'Crítica': return 'destructive';
      case 'Alta': return 'secondary';
      case 'Média': return 'outline';
      case 'Baixa': return 'default';
      default: return 'outline';
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/projects-tap')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <div>
              <h1 className="text-3xl font-bold">{project.nome_projeto}</h1>
              <p className="text-muted-foreground">
                Cliente: {project.cliente} | Código: {project.cod_cliente}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={getCriticalityBadge(project.criticidade)}>
              {project.criticidade}
            </Badge>
            <Button onClick={() => navigate(`/projects-tap/${id}/edit`)}>
              <Edit className="h-4 w-4 mr-2" />
              Editar
            </Button>
          </div>
        </div>

        {/* Project Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Valor do Projeto</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                R$ {project.valor_projeto?.toLocaleString() || '0'}
              </div>
              <p className="text-xs text-muted-foreground">
                Receita Atual: R$ {project.receita_atual?.toLocaleString() || '0'}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Margem Atual</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {project.margem_atual_percent?.toFixed(1) || '0'}%
              </div>
              <p className="text-xs text-muted-foreground">
                R$ {project.margem_atual_reais?.toLocaleString() || '0'}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Go Live</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {project.go_live_previsto ? new Date(project.go_live_previsto).toLocaleDateString('pt-BR') : 'N/A'}
              </div>
              <p className="text-xs text-muted-foreground">
                Início: {project.data_inicio ? new Date(project.data_inicio).toLocaleDateString('pt-BR') : 'N/A'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="financial">Financeiro</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="stakeholders">Stakeholders</TabsTrigger>
            <TabsTrigger value="risks">Riscos</TabsTrigger>
            <TabsTrigger value="communication">Comunicação</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Informações do Projeto</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div><strong>GPP:</strong> {project.gpp}</div>
                  <div><strong>Coordenador:</strong> {project.coordenador}</div>
                  <div><strong>Arquiteto:</strong> {project.arquiteto}</div>
                  <div><strong>Produto:</strong> {project.produto}</div>
                  <div><strong>ESN:</strong> {project.esn}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Escopo e Objetivos</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div><strong>Escopo:</strong></div>
                  <p className="text-sm text-muted-foreground">{project.escopo || 'Não definido'}</p>
                  <div><strong>Objetivo:</strong></div>
                  <p className="text-sm text-muted-foreground">{project.objetivo || 'Não definido'}</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="financial" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Valores Principais</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span>Valor do Projeto:</span>
                    <span>R$ {project.valor_projeto?.toLocaleString() || '0'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Receita Atual:</span>
                    <span>R$ {project.receita_atual?.toLocaleString() || '0'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>MRR:</span>
                    <span>R$ {project.mrr?.toLocaleString() || '0'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>MRR Total:</span>
                    <span>R$ {project.mrr_total?.toLocaleString() || '0'}</span>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Margens</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span>Margem Venda (%):</span>
                    <span>{project.margem_venda_percent?.toFixed(1) || '0'}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Margem Atual (%):</span>
                    <span>{project.margem_atual_percent?.toFixed(1) || '0'}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Margem Venda (R$):</span>
                    <span>R$ {project.margem_venda_reais?.toLocaleString() || '0'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Margem Atual (R$):</span>
                    <span>R$ {project.margem_atual_reais?.toLocaleString() || '0'}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="timeline" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Cronograma do Projeto</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <strong>Data de Início:</strong>
                    <p>{project.data_inicio ? new Date(project.data_inicio).toLocaleDateString('pt-BR') : 'Não definida'}</p>
                  </div>
                  <div>
                    <strong>Go Live Previsto:</strong>
                    <p>{project.go_live_previsto ? new Date(project.go_live_previsto).toLocaleDateString('pt-BR') : 'Não definido'}</p>
                  </div>
                  <div>
                    <strong>Duração Pós-Produção:</strong>
                    <p>{project.duracao_pos_producao || 0} dias</p>
                  </div>
                  <div>
                    <strong>Encerramento:</strong>
                    <p>{project.encerramento ? new Date(project.encerramento).toLocaleDateString('pt-BR') : 'Não definido'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="stakeholders" className="space-y-4">
            <StakeholdersList projectId={project.id} />
          </TabsContent>

          <TabsContent value="risks" className="space-y-4">
            <RisksList projectId={project.id} />
          </TabsContent>

          <TabsContent value="communication" className="space-y-4">
            <CommunicationPlanList projectId={project.id} />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}