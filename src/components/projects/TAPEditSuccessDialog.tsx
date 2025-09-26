import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckCircle2 } from "lucide-react";
import { TAP } from "@/types/tap";

interface TAPEditSuccessDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tapData: TAP | null;
  onContinue: () => void;
}

export function TAPEditSuccessDialog({ 
  open, 
  onOpenChange, 
  tapData,
  onContinue 
}: TAPEditSuccessDialogProps) {
  if (!tapData) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-success" />
            Dados da TAP Editados com Sucesso!
          </DialogTitle>
          <DialogDescription>
            Os dados da TAP foram atualizados com sucesso. Veja abaixo o resumo das informações:
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-6">
            {/* Identificação */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Identificação</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Data</label>
                  <p className="font-medium">{new Date(tapData.data).toLocaleDateString('pt-BR')}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Código Cliente</label>
                  <p className="font-medium">{tapData.cod_cliente}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Nome do Projeto</label>
                  <p className="font-medium">{tapData.nome_projeto}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">GPP</label>
                  <p className="font-medium">{tapData.gpp}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Produto</label>
                  <p className="font-medium">{tapData.produto}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Serviço</label>
                  <p className="font-medium">{tapData.servico || '-'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Arquiteto</label>
                  <p className="font-medium">{tapData.arquiteto}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Criticidade TOTVS</label>
                  <Badge variant="outline">{tapData.criticidade_totvs}</Badge>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Coordenador</label>
                  <p className="font-medium">{tapData.coordenador}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Gerente Projeto</label>
                  <p className="font-medium">{tapData.gerente_projeto}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">ESN</label>
                  <p className="font-medium">{tapData.esn}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Criticidade Cliente</label>
                  <p className="font-medium">{tapData.criticidade_cliente}</p>
                </div>
              </div>
            </div>

            {/* Timeline */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Timeline</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Data Início</label>
                  <p className="font-medium">
                    {tapData.data_inicio ? new Date(tapData.data_inicio).toLocaleDateString('pt-BR') : '-'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Go-Live Previsto</label>
                  <p className="font-medium">
                    {tapData.go_live_previsto ? new Date(tapData.go_live_previsto).toLocaleDateString('pt-BR') : '-'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Duração Pós-Produção</label>
                  <p className="font-medium">{tapData.duracao_pos_producao} meses</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Encerramento</label>
                  <p className="font-medium">
                    {tapData.encerramento ? new Date(tapData.encerramento).toLocaleDateString('pt-BR') : '-'}
                  </p>
                </div>
              </div>
            </div>

            {/* Financeiro */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Financeiro</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Valor Projeto</label>
                  <p className="font-medium">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(tapData.valor_projeto)}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Receita Atual</label>
                  <p className="font-medium">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(tapData.receita_atual)}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Margem Venda (%)</label>
                  <p className="font-medium">{tapData.margem_venda_percent.toFixed(2)}%</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Margem Atual (%)</label>
                  <p className="font-medium">{tapData.margem_atual_percent.toFixed(2)}%</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">MRR</label>
                  <p className="font-medium">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(tapData.mrr)}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Projeto em Perda</label>
                  <Badge variant={tapData.projeto_em_perda ? "destructive" : "secondary"}>
                    {tapData.projeto_em_perda ? "Sim" : "Não"}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Escopo e Objetivo */}
            {(tapData.escopo || tapData.objetivo || tapData.observacoes) && (
              <div>
                <h3 className="text-lg font-semibold mb-3">Detalhes</h3>
                <div className="space-y-4">
                  {tapData.escopo && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Escopo</label>
                      <p className="font-medium whitespace-pre-wrap">{tapData.escopo}</p>
                    </div>
                  )}
                  {tapData.objetivo && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Objetivo</label>
                      <p className="font-medium whitespace-pre-wrap">{tapData.objetivo}</p>
                    </div>
                  )}
                  {tapData.observacoes && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Observações</label>
                      <p className="font-medium whitespace-pre-wrap">{tapData.observacoes}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="flex justify-end pt-4">
          <Button onClick={onContinue} className="min-w-[120px]">
            Continuar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}