import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useTAP } from "@/hooks/useTAP";
import { Calendar, DollarSign, Users, FileText, MapPin, Target, AlertCircle, Clock } from "lucide-react";

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
    <div className="space-y-6">
      {/* Informações Básicas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Informações Básicas do Projeto
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Nome do Projeto</label>
              <p className="font-semibold">{tap.nome_projeto}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Código do Cliente</label>
              <p className="font-semibold">{tap.cod_cliente}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">GPP</label>
              <p>{tap.gpp}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Coordenador</label>
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
              <label className="text-sm font-medium text-muted-foreground">Criticidade TOTVS</label>
              <Badge variant="outline">{tap.criticidade_totvs}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Gestão e Equipe */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Gestão e Equipe
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Gerente do Projeto</label>
              <p>{tap.gerente_projeto}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Gerente do Portfólio</label>
              <p>{tap.gerente_portfolio}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Gerente do Escritório</label>
              <p>{tap.gerente_escritorio}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Criticidade Cliente</label>
              <Badge variant="outline">{tap.criticidade_cliente}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cronograma e Prazos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Cronograma e Prazos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Data</label>
              <p>{tap.data ? new Date(tap.data).toLocaleDateString('pt-BR') : '-'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Data de Início</label>
              <p>{tap.data_inicio ? new Date(tap.data_inicio).toLocaleDateString('pt-BR') : '-'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Go Live Previsto</label>
              <p>{tap.go_live_previsto ? new Date(tap.go_live_previsto).toLocaleDateString('pt-BR') : '-'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Encerramento</label>
              <p>{tap.encerramento ? new Date(tap.encerramento).toLocaleDateString('pt-BR') : '-'}</p>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Duração Pós-Produção</label>
            <p>{tap.duracao_pos_producao ? `${tap.duracao_pos_producao} dias` : '-'}</p>
          </div>
        </CardContent>
      </Card>

      {/* Valores Financeiros */}
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
              <label className="text-sm font-medium text-muted-foreground">Valor do Projeto</label>
              <p className="text-lg font-semibold">R$ {tap.valor_projeto?.toLocaleString('pt-BR') || '0'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Receita Atual</label>
              <p className="text-lg font-semibold">R$ {tap.receita_atual?.toLocaleString('pt-BR') || '0'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">MRR</label>
              <p className="text-lg font-semibold">R$ {tap.mrr?.toLocaleString('pt-BR') || '0'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">MRR Total</label>
              <p className="text-lg font-semibold">R$ {tap.mrr_total?.toLocaleString('pt-BR') || '0'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Margem Venda (%)</label>
              <p className="text-lg font-semibold">{tap.margem_venda_percent?.toFixed(2) || '0'}%</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Margem Venda (R$)</label>
              <p className="text-lg font-semibold">R$ {tap.margem_venda_valor?.toLocaleString('pt-BR') || '0'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Margem Atual (%)</label>
              <p className="text-lg font-semibold">{tap.margem_atual_percent?.toFixed(2) || '0'}%</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Margem Atual (R$)</label>
              <p className="text-lg font-semibold">R$ {tap.margem_atual_valor?.toLocaleString('pt-BR') || '0'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">PSA Planejado</label>
              <p className="text-lg font-semibold">R$ {tap.psa_planejado?.toLocaleString('pt-BR') || '0'}</p>
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Investimento Comercial</label>
              <p className="font-semibold">R$ {tap.investimento_comercial?.toLocaleString('pt-BR') || '0'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Investimento Erro Produto</label>
              <p className="font-semibold">R$ {tap.investimento_erro_produto?.toLocaleString('pt-BR') || '0'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Investimento Perdas</label>
              <p className="font-semibold">R$ {tap.investimento_perdas?.toLocaleString('pt-BR') || '0'}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Diferença PSA/Projeto</label>
              <p className="font-semibold">R$ {tap.diferenca_psa_projeto?.toLocaleString('pt-BR') || '0'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Projeto em Perda</label>
              <Badge variant={tap.projeto_em_perda ? "destructive" : "default"}>
                {tap.projeto_em_perda ? "Sim" : "Não"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Descrições e Observações */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Escopo e Objetivos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {tap.escopo && (
            <div>
              <label className="text-sm font-medium text-muted-foreground">Escopo</label>
              <p className="mt-1 text-sm">{tap.escopo}</p>
            </div>
          )}
          {tap.objetivo && (
            <div>
              <label className="text-sm font-medium text-muted-foreground">Objetivo</label>
              <p className="mt-1 text-sm">{tap.objetivo}</p>
            </div>
          )}
          {tap.observacoes && (
            <div>
              <label className="text-sm font-medium text-muted-foreground">Observações</label>
              <p className="mt-1 text-sm">{tap.observacoes}</p>
            </div>
          )}
          {tap.drive && (
            <div>
              <label className="text-sm font-medium text-muted-foreground">Drive</label>
              <p className="mt-1 text-sm break-all">{tap.drive}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}