import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTAP } from "@/hooks/useTAP";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, DollarSign, FileText, Target } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface TAPDetailsProps {
  projectId: string;
}

export function TAPDetails({ projectId }: TAPDetailsProps) {
  const { tap, loading } = useTAP(projectId);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!tap) {
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
                <p>{tap.data ? new Date(tap.data).toLocaleDateString('pt-BR') : '-'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Cod. Cliente</label>
                <p className="font-semibold">{tap.cod_cliente}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Nome do Projeto</label>
                <p className="font-semibold">{tap.nome_projeto}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Cliente</label>
                <p>-</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">GPP</label>
                <p>{tap.gpp}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Coordenador do Projeto (CP)</label>
                <p>{tap.coordenador}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Produto</label>
                <p>{tap.produto}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">ESN</label>
                <p>{tap.esn}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Arquiteto</label>
                <p>{tap.arquiteto}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Criticidade</label>
                <Badge variant="outline">{tap.criticidade_totvs}</Badge>
              </div>
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-muted-foreground">Drive</label>
                <p className="mt-1 text-sm break-all">
                  {tap.drive ? (
                    <a href={tap.drive} target="_blank" rel="noopener noreferrer" className="underline text-primary">
                      {tap.drive}
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
                <p className="text-lg font-semibold">{formatCurrency(tap.valor_projeto)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Receita Atual</label>
                <p className="text-lg font-semibold">{formatCurrency(tap.receita_atual)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Margem da Venda (%)</label>
                <p className="text-lg font-semibold">{tap.margem_venda_percent?.toFixed(2) ?? '0.00'}%</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Margem Atual (%)</label>
                <p className="text-lg font-semibold">{tap.margem_atual_percent?.toFixed(2) ?? '0.00'}%</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Margem da Venda (Valor Monetário)</label>
                <p className="text-lg font-semibold">{formatCurrency(tap.margem_venda_valor)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Margem Atual (Valor Monetário)</label>
                <p className="text-lg font-semibold">{formatCurrency(tap.margem_atual_valor)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">MRR - Recorrente Mensal</label>
                <p className="text-lg font-semibold">{formatCurrency(tap.mrr)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">MRR Total (Contratados R$)</label>
                <p className="text-lg font-semibold">{formatCurrency(tap.mrr_total)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">PSA Planejado</label>
                <p className="text-lg font-semibold">{formatCurrency(tap.psa_planejado)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Investimento Comercial</label>
                <p className="text-lg font-semibold">{formatCurrency(tap.investimento_comercial)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Investimento Erro Produto</label>
                <p className="text-lg font-semibold">{formatCurrency(tap.investimento_erro_produto)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Investimento Perdas</label>
                <p className="text-lg font-semibold">{formatCurrency(tap.investimento_perdas)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Diferença PSA x Projeto</label>
                <p className="text-lg font-semibold">{formatCurrency(tap.diferenca_psa_projeto)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Projeto em Perda?</label>
                <div>
                  <Badge variant={tap.projeto_em_perda ? 'destructive' : 'secondary'}>
                    {tap.projeto_em_perda ? 'SIM' : 'Não'}
                  </Badge>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="timeline" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Data Início</label>
                <p>{tap.data_inicio ? new Date(tap.data_inicio).toLocaleDateString('pt-BR') : '-'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Go-live (Previsão)</label>
                <p>{tap.go_live_previsto ? new Date(tap.go_live_previsto).toLocaleDateString('pt-BR') : '-'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Duração Pós-produção (em meses)</label>
                <p>{tap.duracao_pos_producao ? `${tap.duracao_pos_producao} meses` : '-'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Encerramento</label>
                <p>{tap.encerramento ? new Date(tap.encerramento).toLocaleDateString('pt-BR') : '-'}</p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="outros" className="mt-6">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Escopo</label>
                <p className="mt-1 text-sm">{tap.escopo || '-'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Objetivo</label>
                <p className="mt-1 text-sm">{tap.objetivo || '-'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Observação</label>
                <p className="mt-1 text-sm">{tap.observacoes || '-'}</p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}