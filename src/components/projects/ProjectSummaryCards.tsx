import { Card, CardContent } from "@/components/ui/card";
import { FolderKanban, DollarSign, TrendingUp, AlertTriangle } from "lucide-react";
import type { Project } from "@/types/project";

interface ProjectSummaryCardsProps {
  projects: Project[];
}

export function ProjectSummaryCards({ projects }: ProjectSummaryCardsProps) {
  const total = projects.length;
  const sum = (arr: (number | string | null | undefined)[]) =>
    arr.reduce<number>((acc, v) => acc + (v ? Number(v) : 0), 0);

  const valorTotal = sum(projects.map(p => p.valor_projeto as any));
  const mrrTotal = sum(projects.map(p => (p.mrr_total ?? p.mrr) as any));
  const receitaTotal = sum(projects.map(p => p.receita_atual as any));
  const criticos = projects.filter(p => (p.criticidade === "Alta" || p.criticidade === "Crítica")).length;

  const cards = [
    {
      label: "Projetos",
      value: total.toLocaleString("pt-BR"),
      icon: FolderKanban,
    },
    {
      label: "Valor Total",
      value: `R$ ${valorTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
      icon: DollarSign,
    },
    {
      label: "MRR Total",
      value: `R$ ${mrrTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
      icon: TrendingUp,
    },
    {
      label: "Críticos (Alta/Crítica)",
      value: criticos.toLocaleString("pt-BR"),
      icon: AlertTriangle,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map(({ label, value, icon: Icon }) => (
        <Card key={label} className="shadow-soft">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{label}</p>
                <p className="text-2xl font-bold text-foreground">{value}</p>
              </div>
              <Icon className="h-6 w-6 text-primary" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
