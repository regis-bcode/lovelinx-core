import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, DollarSign, FileText, Target, CheckCircle } from "lucide-react";
import { TAP } from "@/types/tap";

interface TAPSummaryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tapData: TAP;
  onComplete: () => void;
}

export function TAPSummaryDialog({
  open,
  onOpenChange,
  tapData,
  onComplete
}: TAPSummaryDialogProps) {
  const [timeLeft, setTimeLeft] = useState(5);

  useEffect(() => {
    if (open && timeLeft > 0) {
      const timer = setTimeout(() => {
        setTimeLeft(timeLeft - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0) {
      onOpenChange(false);
      onComplete();
    }
  }, [open, timeLeft, onOpenChange, onComplete]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "Não informado";
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-6 w-6 text-green-500" />
            TAP Criada com Sucesso!
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Identificação */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="h-5 w-5" />
                Identificação do Projeto
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <span className="text-sm text-muted-foreground">Nome do Projeto:</span>
                  <p className="font-medium">{tapData.nome_projeto}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Código Cliente:</span>
                  <p className="font-medium">{tapData.cod_cliente}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">GPP:</span>
                  <p className="font-medium">{tapData.gpp}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Produto:</span>
                  <p className="font-medium">{tapData.produto || "Não informado"}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Criticidade:</span>
                  <Badge variant={
                    tapData.criticidade_totvs === 'Crítica' ? 'destructive' :
                    tapData.criticidade_totvs === 'Alta' ? 'secondary' :
                    'outline'
                  }>
                    {tapData.criticidade_totvs}
                  </Badge>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Coordenador:</span>
                  <p className="font-medium">{tapData.coordenador || "Não informado"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Calendar className="h-5 w-5" />
                Timeline do Projeto
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <span className="text-sm text-muted-foreground">Data Início:</span>
                  <p className="font-medium">{formatDate(tapData.data_inicio || "")}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Go-live Previsto:</span>
                  <p className="font-medium">{formatDate(tapData.go_live_previsto || "")}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Duração Pós-produção:</span>
                  <p className="font-medium">{tapData.duracao_pos_producao} meses</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Encerramento:</span>
                  <p className="font-medium">{formatDate(tapData.encerramento || "")}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Financeiro */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <DollarSign className="h-5 w-5" />
                Dados Financeiros
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <span className="text-sm text-muted-foreground">Valor do Projeto:</span>
                  <p className="font-medium text-green-600">{formatCurrency(tapData.valor_projeto)}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Receita Atual:</span>
                  <p className="font-medium">{formatCurrency(tapData.receita_atual)}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Margem Venda:</span>
                  <p className="font-medium">{tapData.margem_venda_percent}% ({formatCurrency(tapData.margem_venda_valor)})</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">MRR:</span>
                  <p className="font-medium">{formatCurrency(tapData.mrr)}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">PSA Planejado:</span>
                  <p className="font-medium">{formatCurrency(tapData.psa_planejado)}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Projeto em Perda:</span>
                  <Badge variant={tapData.projeto_em_perda ? 'destructive' : 'secondary'}>
                    {tapData.projeto_em_perda ? 'Sim' : 'Não'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Outros Dados */}
          {(tapData.escopo || tapData.objetivo || tapData.observacoes) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Target className="h-5 w-5" />
                  Outros Dados
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {tapData.escopo && (
                  <div>
                    <span className="text-sm text-muted-foreground">Escopo:</span>
                    <p className="font-medium mt-1">{tapData.escopo}</p>
                  </div>
                )}
                {tapData.objetivo && (
                  <div>
                    <span className="text-sm text-muted-foreground">Objetivo:</span>
                    <p className="font-medium mt-1">{tapData.objetivo}</p>
                  </div>
                )}
                {tapData.observacoes && (
                  <div>
                    <span className="text-sm text-muted-foreground">Observações:</span>
                    <p className="font-medium mt-1">{tapData.observacoes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Timer */}
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Esta janela será fechada automaticamente em {timeLeft} segundos...
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}