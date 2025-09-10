import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Project, ProjectFormData } from '@/types/project';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Save, X } from 'lucide-react';

interface ProjectFormProps {
  project?: Project | null;
  onSave: (data: ProjectFormData) => void;
  onCancel: () => void;
}

export function ProjectForm({ project, onSave, onCancel }: ProjectFormProps) {
  const form = useForm<ProjectFormData>({
    defaultValues: {
      data: '',
      codCliente: '',
      nomeProjeto: '',
      cliente: '',
      gpp: '',
      coordenador: '',
      produto: '',
      esn: '',
      arquiteto: '',
      criticidade: 'Média',
      drive: '',
      valorProjeto: 0,
      receitaAtual: 0,
      margemVendaPercent: 0,
      margemAtualPercent: 0,
      margemVendaReais: 0,
      margemAtualReais: 0,
      mrr: 0,
      investimentoPerdas: 0,
      mrrTotal: 0,
      investimentoComercial: 0,
      psaPlanejado: 0,
      investimentoErroProduto: 0,
      diferencaPsaProjeto: 0,
      projetoEmPerda: false,
      dataInicio: '',
      goLivePrevisto: '',
      duracaoPosProducao: 0,
      encerramento: '',
      escopo: '',
      objetivo: '',
      observacao: '',
    },
  });

  useEffect(() => {
    if (project) {
      form.reset({
        data: project.data,
        codCliente: project.codCliente,
        nomeProjeto: project.nomeProjeto,
        cliente: project.cliente,
        gpp: project.gpp,
        coordenador: project.coordenador,
        produto: project.produto,
        esn: project.esn,
        arquiteto: project.arquiteto,
        criticidade: project.criticidade,
        drive: project.drive,
        valorProjeto: project.valorProjeto,
        receitaAtual: project.receitaAtual,
        margemVendaPercent: project.margemVendaPercent,
        margemAtualPercent: project.margemAtualPercent,
        margemVendaReais: project.margemVendaReais,
        margemAtualReais: project.margemAtualReais,
        mrr: project.mrr,
        investimentoPerdas: project.investimentoPerdas,
        mrrTotal: project.mrrTotal,
        investimentoComercial: project.investimentoComercial,
        psaPlanejado: project.psaPlanejado,
        investimentoErroProduto: project.investimentoErroProduto,
        diferencaPsaProjeto: project.diferencaPsaProjeto,
        projetoEmPerda: project.projetoEmPerda,
        dataInicio: project.dataInicio,
        goLivePrevisto: project.goLivePrevisto,
        duracaoPosProducao: project.duracaoPosProducao,
        encerramento: project.encerramento,
        escopo: project.escopo,
        objetivo: project.objetivo,
        observacao: project.observacao,
      });
    }
  }, [project, form]);

  const handleSubmit = (data: ProjectFormData) => {
    onSave(data);
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{project ? 'Editar Projeto' : 'Novo Projeto'}</span>
          <Button variant="ghost" size="sm" onClick={onCancel}>
            <X className="h-4 w-4" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <Tabs defaultValue="identificacao" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="identificacao">Identificação</TabsTrigger>
                <TabsTrigger value="financeiro">Financeiro</TabsTrigger>
                <TabsTrigger value="timeline">Timeline</TabsTrigger>
                <TabsTrigger value="outros">Outros</TabsTrigger>
              </TabsList>

              <TabsContent value="identificacao" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="data"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="codCliente"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Código do Cliente</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: CLI001" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="nomeProjeto"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome do Projeto</FormLabel>
                        <FormControl>
                          <Input placeholder="Digite o nome do projeto" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="cliente"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cliente</FormLabel>
                        <FormControl>
                          <Input placeholder="Nome do cliente" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="gpp"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>GPP</FormLabel>
                        <FormControl>
                          <Input placeholder="GPP responsável" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="coordenador"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Coordenador</FormLabel>
                        <FormControl>
                          <Input placeholder="Coordenador do projeto" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="produto"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Produto</FormLabel>
                        <FormControl>
                          <Input placeholder="Produto relacionado" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="esn"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ESN</FormLabel>
                        <FormControl>
                          <Input placeholder="ESN" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="arquiteto"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Arquiteto</FormLabel>
                        <FormControl>
                          <Input placeholder="Arquiteto responsável" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="criticidade"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Criticidade</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione a criticidade" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Baixa">Baixa</SelectItem>
                            <SelectItem value="Média">Média</SelectItem>
                            <SelectItem value="Alta">Alta</SelectItem>
                            <SelectItem value="Crítica">Crítica</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="drive"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Drive</FormLabel>
                        <FormControl>
                          <Input placeholder="Link do drive" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </TabsContent>

              <TabsContent value="financeiro" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="valorProjeto"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Valor do Projeto (R$)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" {...field} onChange={(e) => field.onChange(Number(e.target.value))} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="receitaAtual"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Receita Atual (R$)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" {...field} onChange={(e) => field.onChange(Number(e.target.value))} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="margemVendaPercent"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Margem Venda (%)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" {...field} onChange={(e) => field.onChange(Number(e.target.value))} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="margemAtualPercent"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Margem Atual (%)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" {...field} onChange={(e) => field.onChange(Number(e.target.value))} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="margemVendaReais"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Margem Venda (R$)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" {...field} onChange={(e) => field.onChange(Number(e.target.value))} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="margemAtualReais"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Margem Atual (R$)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" {...field} onChange={(e) => field.onChange(Number(e.target.value))} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="mrr"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>MRR</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" {...field} onChange={(e) => field.onChange(Number(e.target.value))} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="mrrTotal"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>MRR Total</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" {...field} onChange={(e) => field.onChange(Number(e.target.value))} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="investimentoPerdas"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Investimento Perdas</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" {...field} onChange={(e) => field.onChange(Number(e.target.value))} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="investimentoComercial"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Investimento Comercial</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" {...field} onChange={(e) => field.onChange(Number(e.target.value))} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="psaPlanejado"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>PSA Planejado</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" {...field} onChange={(e) => field.onChange(Number(e.target.value))} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="investimentoErroProduto"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Investimento Erro Produto</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" {...field} onChange={(e) => field.onChange(Number(e.target.value))} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="diferencaPsaProjeto"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Diferença PSA Projeto</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" {...field} onChange={(e) => field.onChange(Number(e.target.value))} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="projetoEmPerda"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Projeto em Perda</FormLabel>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </TabsContent>

              <TabsContent value="timeline" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="dataInicio"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data de Início</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="goLivePrevisto"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Go Live Previsto</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="duracaoPosProducao"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Duração Pós Produção (dias)</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} onChange={(e) => field.onChange(Number(e.target.value))} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="encerramento"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data de Encerramento</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </TabsContent>

              <TabsContent value="outros" className="space-y-4">
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="escopo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Escopo</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Descreva o escopo do projeto" rows={4} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="objetivo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Objetivo</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Descreva o objetivo do projeto" rows={4} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="observacao"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Observações</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Observações adicionais" rows={4} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex justify-end gap-4 pt-4 border-t">
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-gradient-primary">
                <Save className="mr-2 h-4 w-4" />
                Salvar Projeto
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}