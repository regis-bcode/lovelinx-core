import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Calendar,
  ClipboardList,
  AlertTriangle,
  Users,
  BarChart3,
  Target,
  FileText,
  MessageSquare,
  Clock,
  Layers,
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useProjects } from "@/hooks/useProjects";
import { useTasks } from "@/hooks/useTasks";
import { useRisks } from "@/hooks/useRisks";
import { useStakeholders } from "@/hooks/useStakeholders";
import { useCommunicationPlan } from "@/hooks/useCommunicationPlan";
import { supabase } from "@/integrations/supabase/client";
import type { Project } from "@/types/project";
import type { Task } from "@/types/task";

const formatDate = (date?: string | null) => {
  if (!date) return "—";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) {
    return "—";
  }
  return new Intl.DateTimeFormat("pt-BR").format(parsed);
};

const formatCurrency = (value?: number | null) => {
  if (typeof value !== "number") return "—";
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });
};

const formatPercentage = (value?: number | null) => {
  if (typeof value !== "number") return "—";
  return `${value.toFixed(1)}%`;
};

const isCompletedTask = (task: Task) => {
  const normalized = task.status?.toLowerCase() ?? "";
  return ["concl", "finaliz", "feito", "done"].some((keyword) => normalized.includes(keyword));
};

const getTaskOwner = (task: Task) =>
  task.responsavel || task.responsavel_consultoria || task.responsavel_cliente || "Não atribuído";

export default function ProjectOnePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getProject, loading: projectsLoading, refreshProjects } = useProjects();
  const { tasks, loading: tasksLoading } = useTasks(id);
  const { risks } = useRisks(id ?? "");
  const { stakeholders } = useStakeholders(id ?? "");
  const { communicationPlans } = useCommunicationPlan(id ?? "");

  const [fetchedProject, setFetchedProject] = useState<Project | null>(null);
  const [isFetchingProject, setIsFetchingProject] = useState(false);

  const projectFromStore = id ? getProject(id) : null;
  const project = projectFromStore ?? fetchedProject;

  useEffect(() => {
    if (!id) return;
    if (projectFromStore || fetchedProject || isFetchingProject) return;

    const fetchProject = async () => {
      try {
        setIsFetchingProject(true);
        const { data, error } = await supabase
          .from("projects")
          .select("*")
          .eq("id", id)
          .maybeSingle<Project>();

        if (error) throw error;
        if (data) {
          setFetchedProject({
            ...data,
            criticidade: data.criticidade as Project["criticidade"],
          });
          refreshProjects();
        }
      } catch (error) {
        console.error("Erro ao carregar projeto:", error);
      } finally {
        setIsFetchingProject(false);
      }
    };

    fetchProject();
  }, [id, projectFromStore, fetchedProject, isFetchingProject, refreshProjects]);

  useEffect(() => {
    if (projectFromStore) {
      setFetchedProject(projectFromStore);
    }
  }, [projectFromStore]);

  const progress = useMemo(() => {
    if (!tasks.length) return 0;
    const completed = tasks.filter(isCompletedTask).length;
    return Math.round((completed / tasks.length) * 100);
  }, [tasks]);

  const attentionTasks = useMemo(() => {
    const now = new Date();
    return tasks
      .filter((task) => {
        if (isCompletedTask(task)) return false;
        if (!task.data_vencimento) return false;
        const due = new Date(task.data_vencimento);
        if (Number.isNaN(due.getTime())) return false;
        return due.getTime() < now.getTime();
      })
      .sort((a, b) => {
        const dateA = new Date(a.data_vencimento ?? "").getTime();
        const dateB = new Date(b.data_vencimento ?? "").getTime();
        return dateA - dateB;
      })
      .slice(0, 6);
  }, [tasks]);

  const issuesByOwner = useMemo(() => {
    const map = new Map<string, number>();
    attentionTasks.forEach((task) => {
      const owner = getTaskOwner(task);
      map.set(owner, (map.get(owner) ?? 0) + 1);
    });
    return Array.from(map.entries())
      .map(([owner, count]) => ({ owner, count }))
      .sort((a, b) => b.count - a.count);
  }, [attentionTasks]);

  const upcomingDeliveries = useMemo(() => {
    const now = new Date();
    return tasks
      .filter((task) => !isCompletedTask(task) && task.data_vencimento)
      .map((task) => ({
        task,
        date: new Date(task.data_vencimento as string),
      }))
      .filter(({ date }) => !Number.isNaN(date.getTime()) && date.getTime() >= now.getTime())
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .slice(0, 5);
  }, [tasks]);

  const deliveredTasks = useMemo(() => {
    return tasks
      .filter((task) => isCompletedTask(task))
      .sort((a, b) => {
        const dateA = new Date(a.data_entrega ?? a.updated_at ?? "").getTime();
        const dateB = new Date(b.data_entrega ?? b.updated_at ?? "").getTime();
        return dateB - dateA;
      })
      .slice(0, 5);
  }, [tasks]);

  const criticalRisks = useMemo(() => {
    return [...risks]
      .sort((a, b) => b.exposicao - a.exposicao)
      .slice(0, 3);
  }, [risks]);

  const keyStakeholders = useMemo(() => stakeholders.slice(0, 4), [stakeholders]);
  const keyCommunications = useMemo(() => communicationPlans.slice(0, 4), [communicationPlans]);

  const isLoading = projectsLoading || tasksLoading || isFetchingProject;

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px] text-muted-foreground">
          Carregando informações do projeto...
        </div>
      </DashboardLayout>
    );
  }

  if (!project) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-3">
            <h2 className="text-2xl font-bold">Projeto não encontrado</h2>
            <p className="text-muted-foreground">
              Não foi possível localizar o projeto solicitado.
            </p>
            <Button onClick={() => navigate("/projects")}>Voltar para Projetos</Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <Button variant="outline" size="sm" onClick={() => navigate("/projects")}> 
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <div>
              <h1 className="text-3xl font-bold">One Page - {project.nome_projeto}</h1>
              <p className="text-muted-foreground">
                Cliente: {project.cliente || "—"} · Código: {project.cod_cliente || "—"}
              </p>
            </div>
          </div>
          <Badge variant={project.criticidade === "Crítica" ? "destructive" : project.criticidade === "Alta" ? "secondary" : "outline"}>
            Criticidade {project.criticidade}
          </Badge>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Progresso geral</CardDescription>
              <CardTitle className="text-3xl font-bold">{progress}%</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Progress value={progress} className="h-2" />
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <ClipboardList className="h-4 w-4" />
                {tasks.length} atividades monitoradas
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Cronograma</CardDescription>
              <CardTitle className="text-lg">Linha do tempo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>Início: {formatDate(project.data_inicio)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>Go-live previsto: {formatDate(project.go_live_previsto)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-muted-foreground" />
                <span>
                  Pós-produção: {project.duracao_pos_producao ? `${project.duracao_pos_producao} dias` : "—"}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Financeiro</CardDescription>
              <CardTitle className="text-lg">Resumo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span>Valor do projeto</span>
                <strong>{formatCurrency(project.valor_projeto)}</strong>
              </div>
              <div className="flex items-center justify-between">
                <span>Receita atual</span>
                <strong>{formatCurrency(project.receita_atual)}</strong>
              </div>
              <div className="flex items-center justify-between">
                <span>Margem (venda · atual)</span>
                <strong>
                  {formatPercentage(project.margem_venda_percent)} · {formatPercentage(project.margem_atual_percent)}
                </strong>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Equipe principal</CardDescription>
              <CardTitle className="text-lg">Responsáveis</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span>GPP: <strong>{project.gpp || "—"}</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span>Coordenador: <strong>{project.coordenador || "—"}</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span>Arquiteto: <strong>{project.arquiteto || "—"}</strong></span>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Resumo executivo</CardTitle>
            <CardDescription>Escopo, objetivos e observações principais do projeto</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <h3 className="text-sm font-semibold uppercase text-muted-foreground">Objetivo</h3>
              <p className="text-sm leading-relaxed">
                {project.objetivo || "Objetivo do projeto não informado."}
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="text-sm font-semibold uppercase text-muted-foreground">Escopo</h3>
              <p className="text-sm leading-relaxed">
                {project.escopo || "Escopo detalhado não informado."}
              </p>
            </div>
            <div className="space-y-2 md:col-span-2">
              <h3 className="text-sm font-semibold uppercase text-muted-foreground">Observações</h3>
              <p className="text-sm leading-relaxed">
                {project.observacao || "Nenhuma observação adicional registrada."}
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-primary" />
                <CardTitle>Questões por responsável</CardTitle>
              </div>
              <CardDescription>Pontos de atenção em aberto organizados por responsável</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {issuesByOwner.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhum ponto de atenção aberto até o momento.
                </p>
              ) : (
                <div className="grid gap-3">
                  {issuesByOwner.map((item) => (
                    <div key={item.owner} className="flex items-center justify-between rounded-md border p-3">
                      <div>
                        <p className="font-medium">{item.owner}</p>
                        <p className="text-sm text-muted-foreground">Responsável</p>
                      </div>
                      <Badge variant="secondary">{item.count} ponto(s)</Badge>
                    </div>
                  ))}
                </div>
              )}

              {attentionTasks.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold uppercase text-muted-foreground">Pontos críticos</h4>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Atividade</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Responsável</TableHead>
                          <TableHead>Prazo</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {attentionTasks.map((task) => (
                          <TableRow key={task.id}>
                            <TableCell className="font-medium">{task.nome}</TableCell>
                            <TableCell>{task.status}</TableCell>
                            <TableCell>{getTaskOwner(task)}</TableCell>
                            <TableCell>{formatDate(task.data_vencimento)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                <CardTitle>Riscos críticos</CardTitle>
              </div>
              <CardDescription>Principais riscos acompanhados pelo time do projeto</CardDescription>
            </CardHeader>
            <CardContent>
              {criticalRisks.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhum risco crítico registrado.
                </p>
              ) : (
                <div className="space-y-3">
                  {criticalRisks.map((risk) => (
                    <div key={risk.id} className="rounded-md border p-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-semibold">{risk.situacao}</h4>
                          <p className="text-sm text-muted-foreground">{risk.area}</p>
                        </div>
                        <Badge variant="destructive">Exposição {risk.exposicao}</Badge>
                      </div>
                      <div className="mt-2 space-y-1 text-sm">
                        <p><strong>Responsável:</strong> {risk.responsavel}</p>
                        <p><strong>Plano de ação:</strong> {risk.planoAcao || "Não informado"}</p>
                        <p><strong>Prazo:</strong> {formatDate(risk.dataLimite)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              <CardTitle>Entregas e próximos passos</CardTitle>
            </div>
            <CardDescription>Visão consolidada das entregas concluídas e futuras</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6 lg:grid-cols-2">
            <div>
              <h3 className="flex items-center gap-2 text-sm font-semibold uppercase text-muted-foreground">
                <FileText className="h-4 w-4" /> Entregas realizadas
              </h3>
              <div className="mt-3 rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Atividade</TableHead>
                      <TableHead>Responsável</TableHead>
                      <TableHead>Data</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {deliveredTasks.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-sm text-muted-foreground">
                          Nenhuma entrega concluída ainda.
                        </TableCell>
                      </TableRow>
                    ) : (
                      deliveredTasks.map((task) => (
                        <TableRow key={task.id}>
                          <TableCell className="font-medium">{task.nome}</TableCell>
                          <TableCell>{getTaskOwner(task)}</TableCell>
                          <TableCell>{formatDate(task.data_entrega ?? task.updated_at)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>

            <div>
              <h3 className="flex items-center gap-2 text-sm font-semibold uppercase text-muted-foreground">
                <Target className="h-4 w-4" /> Atividades a realizar
              </h3>
              <div className="mt-3 rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Atividade</TableHead>
                      <TableHead>Responsável</TableHead>
                      <TableHead>Prazo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {upcomingDeliveries.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-sm text-muted-foreground">
                          Nenhuma atividade programada.
                        </TableCell>
                      </TableRow>
                    ) : (
                      upcomingDeliveries.map(({ task }) => (
                        <TableRow key={task.id}>
                          <TableCell className="font-medium">{task.nome}</TableCell>
                          <TableCell>{getTaskOwner(task)}</TableCell>
                          <TableCell>{formatDate(task.data_vencimento)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                <CardTitle>Stakeholders chave</CardTitle>
              </div>
              <CardDescription>Principais envolvidos e nível de influência</CardDescription>
            </CardHeader>
            <CardContent>
              {keyStakeholders.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum stakeholder registrado.</p>
              ) : (
                <div className="space-y-3">
                  {keyStakeholders.map((stakeholder) => (
                    <div key={stakeholder.id} className="rounded-md border p-3">
                      <h4 className="font-semibold">{stakeholder.nome}</h4>
                      <p className="text-sm text-muted-foreground">{stakeholder.cargo} · {stakeholder.departamento}</p>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs">
                        <Badge variant="secondary">Influência: {stakeholder.tipo_influencia}</Badge>
                        <Badge variant="outline">Contato: {stakeholder.email}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-primary" />
                <CardTitle>Comunicações planejadas</CardTitle>
              </div>
              <CardDescription>Principais comunicações e responsáveis</CardDescription>
            </CardHeader>
            <CardContent>
              {keyCommunications.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma comunicação cadastrada.</p>
              ) : (
                <div className="space-y-3">
                  {keyCommunications.map((plan) => (
                    <div key={plan.id} className="rounded-md border p-3">
                      <h4 className="font-semibold">{plan.comunicacao || plan.codigo}</h4>
                      <p className="text-sm text-muted-foreground">Objetivo: {plan.objetivo || "—"}</p>
                      <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                        <span><strong>Frequência:</strong> {plan.frequencia || "—"}</span>
                        <span><strong>Responsável:</strong> {plan.responsavel || "—"}</span>
                        <span><strong>Canal:</strong> {plan.canal_envio || "—"}</span>
                        <span><strong>Envolvidos:</strong> {plan.envolvidos || "—"}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
