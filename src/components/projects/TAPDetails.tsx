import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTAP } from "@/hooks/useTAP";
import { useProjects } from "@/hooks/useProjects";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, DollarSign, FileText, Target } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface TAPDetailsProps {
  projectId: string;
}

export function TAPDetails({ projectId }: TAPDetailsProps) {
  const { tap, loading: tapLoading } = useTAP(projectId);
  const { getProject } = useProjects();
  const project = getProject(projectId);

  // Use TAP data if available, otherwise use project data
  const tapData = tap || project;
  const loading = tapLoading;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!tapData) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhuma TAP (Termo de Abertura de Projeto) encontrada.</p>
            <p className="text-sm mt-2">As informações da TAP aparecerão aqui quando disponíveis.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          TAP do Projeto
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
                <label className="text-sm font-medium text-muted-foreground">Data</label>
                <p>{tapData.data ? new Date(tapData.data).toLocaleDateString('pt-BR') : '-'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Cod. Cliente</label>
                <p className="font-semibold">{tapData.cod_cliente}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Nome do Projeto</label>
                <p className="font-semibold">{tapData.nome_projeto}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Cliente</label>
                <p>{(tapData as any).cliente || '-'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">GPP</label>
                <p>{tapData.gpp}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Coordenador do Projeto (CP)</label>
                <p>{tapData.coordenador}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Produto</label>
                <p>{tapData.produto}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">ESN</label>
                <p>{tapData.esn}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Arquiteto</label>
                <p>{tapData.arquiteto}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Criticidade</label>
                <Badge variant="outline">{(tapData as any).criticidade_totvs || (tapData as any).criticidade}</Badge>
              </div>
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-muted-foreground">Drive</label>
                <p className="mt-1 text-sm break-all">
                  {tapData.drive ? (
                    <a href={tapData.drive} target="_blank" rel="noopener noreferrer" className="underline text-primary">
                      {tapData.drive}
                    </a>
                  ) : (
                    '-'
                  )}
                </p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="financeiro" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Valor do Projeto</label>
                <p className="text-lg font-semibold">{formatCurrency(tapData.valor_projeto)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Receita Atual</label>
                <p className="text-lg font-semibold">{formatCurrency(tapData.receita_atual)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Margem da Venda (%)</label>
                <p className="text-lg font-semibold">{tapData.margem_venda_percent?.toFixed(2) ?? '0.00'}%</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Margem Atual (%)</label>
                <p className="text-lg font-semibold">{tapData.margem_atual_percent?.toFixed(2) ?? '0.00'}%</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Margem da Venda (Valor Monetário)</label>
                <p className="text-lg font-semibold">{formatCurrency((tapData as any).margem_venda_valor || (tapData as any).margem_venda_reais)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Margem Atual (Valor Monetário)</label>
                <p className="text-lg font-semibold">{formatCurrency((tapData as any).margem_atual_valor || (tapData as any).margem_atual_reais)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">MRR - Recorrente Mensal</label>
                <p className="text-lg font-semibold">{formatCurrency(tapData.mrr)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">MRR Total (Contratados R$)</label>
                <p className="text-lg font-semibold">{formatCurrency(tapData.mrr_total)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">PSA Planejado</label>
                <p className="text-lg font-semibold">{formatCurrency(tapData.psa_planejado)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Investimento Comercial</label>
                <p className="text-lg font-semibold">{formatCurrency(tapData.investimento_comercial)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Investimento Erro Produto</label>
                <p className="text-lg font-semibold">{formatCurrency(tapData.investimento_erro_produto)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Investimento Perdas</label>
                <p className="text-lg font-semibold">{formatCurrency(tapData.investimento_perdas)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Diferença PSA x Projeto</label>
                <p className="text-lg font-semibold">{formatCurrency(tapData.diferenca_psa_projeto)}</p>
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
          </TabsContent>

          <TabsContent value="timeline" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Data Início</label>
                <p>{tapData.data_inicio ? new Date(tapData.data_inicio).toLocaleDateString('pt-BR') : '-'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Go-live (Previsão)</label>
                <p>{tapData.go_live_previsto ? new Date(tapData.go_live_previsto).toLocaleDateString('pt-BR') : '-'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Duração Pós-produção (em meses)</label>
                <p>{tapData.duracao_pos_producao ? `${tapData.duracao_pos_producao} meses` : '-'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Encerramento</label>
                <p>{tapData.encerramento ? new Date(tapData.encerramento).toLocaleDateString('pt-BR') : '-'}</p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="outros" className="mt-6">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Escopo</label>
                <p className="mt-1 text-sm">{tapData.escopo || '-'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Objetivo</label>
                <p className="mt-1 text-sm">{tapData.objetivo || '-'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Observação</label>
                <p className="mt-1 text-sm">{(tapData as any).observacoes || (tapData as any).observacao || '-'}</p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}