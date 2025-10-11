import { useEffect, useMemo, useRef, useState } from "react";
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
  PrinterCheck,
  TrendingUp,
  Download,
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  PolarAngleAxis,
  RadialBar,
  RadialBarChart,
  XAxis,
  YAxis,
} from "recharts";
import { useProjects } from "@/hooks/useProjects";
import { useTasks } from "@/hooks/useTasks";
import { useRisks } from "@/hooks/useRisks";
import { useStakeholders } from "@/hooks/useStakeholders";
import { useCommunicationPlan } from "@/hooks/useCommunicationPlan";
import { useTAP } from "@/hooks/useTAP";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { Project } from "@/types/project";
import type { Task } from "@/types/task";
import { loadHtml2Canvas, loadJsPDF, loadPptxGenJS } from "@/lib/exporters";

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

const formatDateTime = (value: Date) =>
  new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(value);

const isCompletedTask = (task: Task) => {
  const normalized = task.status?.toLowerCase() ?? "";
  return ["concl", "finaliz", "feito", "done"].some((keyword) => normalized.includes(keyword));
};

const getTaskOwner = (task: Task) =>
  task.responsavel || task.responsavel_consultoria || task.responsavel_cliente || "Não atribuído";

type PrintSectionKey =
  | "progress"
  | "schedule"
  | "finance"
  | "team"
  | "executiveSummary"
  | "issues"
  | "risks"
  | "deliveries"
  | "sCurve"
  | "stakeholders"
  | "communications";

const defaultPrintSelection: Record<PrintSectionKey, boolean> = {
  progress: true,
  schedule: true,
  finance: true,
  team: true,
  executiveSummary: true,
  issues: true,
  risks: true,
  deliveries: true,
  sCurve: true,
  stakeholders: true,
  communications: true,
};

const slugify = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "") || "sem_status";

const normalizeStatusLabel = (status?: string | null) => {
  if (!status) return "Sem status";
  const normalized = status.trim();
  if (!normalized) return "Sem status";
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
};

export default function ProjectOnePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getProject, loading: projectsLoading, refreshProjects } = useProjects();
  const { tasks, loading: tasksLoading } = useTasks(id);
  const { risks } = useRisks(id ?? "");
  const { stakeholders } = useStakeholders(id ?? "");
  const { communicationPlans } = useCommunicationPlan(id ?? "");
  const { tap } = useTAP(id);
  const { toast } = useToast();

  const [fetchedProject, setFetchedProject] = useState<Project | null>(null);
  const [isFetchingProject, setIsFetchingProject] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const projectFromStore = id ? getProject(id) : null;
  const project = projectFromStore ?? fetchedProject;
  const printContainerRef = useRef<HTMLDivElement | null>(null);

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

  const plannedProgress = useMemo(() => {
    if (!tasks.length) return 0;
    const now = new Date();
    const tasksWithDueDate = tasks.filter((task) => {
      if (!task.data_vencimento) return false;
      const due = new Date(task.data_vencimento);
      return !Number.isNaN(due.getTime());
    });

    if (!tasksWithDueDate.length) {
      return 0;
    }

    const plannedCount = tasksWithDueDate.filter((task) => {
      const due = new Date(task.data_vencimento as string);
      return due.getTime() <= now.getTime();
    }).length;

    const ratio = (plannedCount / tasksWithDueDate.length) * 100;
    return Math.min(100, Math.max(0, Math.round(ratio)));
  }, [tasks]);

  const [printSelection, setPrintSelection] = useState<Record<PrintSectionKey, boolean>>(defaultPrintSelection);

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

  const issuesByOwnerChart = useMemo(() => {
    if (!attentionTasks.length) {
      return {
        data: [],
        statuses: [] as Array<{ key: string; label: string }>,
        config: {} as ChartConfig,
      };
    }

    const statusMap = new Map<string, { key: string; label: string }>();
    const dataMap = new Map<string, Map<string, number>>();

    attentionTasks.forEach((task) => {
      const owner = getTaskOwner(task);
      const label = normalizeStatusLabel(task.status);
      const key = slugify(label);
      if (!statusMap.has(key)) {
        statusMap.set(key, { key, label });
      }
      if (!dataMap.has(owner)) {
        dataMap.set(owner, new Map());
      }
      const ownerMap = dataMap.get(owner)!;
      ownerMap.set(key, (ownerMap.get(key) ?? 0) + 1);
    });

    const statuses = Array.from(statusMap.values());

    const data = Array.from(dataMap.entries()).map(([owner, map]) => {
      const entry: Record<string, string | number> = { owner };
      statuses.forEach(({ key }) => {
        entry[key] = map.get(key) ?? 0;
      });
      entry.total = Array.from(map.values()).reduce((total, value) => total + value, 0);
      return entry;
    });

    const config = statuses.reduce((acc, { key, label }, index) => {
      const colorIndex = (index % 5) + 1;
      acc[key] = {
        label,
        color: `hsl(var(--chart-${colorIndex}))`,
      };
      return acc;
    }, {} as ChartConfig);

    return {
      data,
      statuses,
      config,
    };
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

  const sCurveData = useMemo(() => {
    if (!tasks.length) return [] as Array<{ label: string; planned: number; actual: number }>;

    const plannedMap = new Map<string, number>();
    const actualMap = new Map<string, number>();

    tasks.forEach((task) => {
      if (task.data_vencimento) {
        const due = new Date(task.data_vencimento);
        if (!Number.isNaN(due.getTime())) {
          const key = due.toISOString().slice(0, 10);
          plannedMap.set(key, (plannedMap.get(key) ?? 0) + 1);
        }
      }

      if (isCompletedTask(task)) {
        const completionDate = task.data_entrega || task.updated_at;
        if (completionDate) {
          const completed = new Date(completionDate);
          if (!Number.isNaN(completed.getTime())) {
            const key = completed.toISOString().slice(0, 10);
            actualMap.set(key, (actualMap.get(key) ?? 0) + 1);
          }
        }
      }
    });

    const allDates = Array.from(new Set([...plannedMap.keys(), ...actualMap.keys()])).sort();

    if (!allDates.length) return [] as Array<{ label: string; planned: number; actual: number }>;

    const totalTasks = tasks.length;
    let cumulativePlanned = 0;
    let cumulativeActual = 0;

    return allDates.map((dateKey) => {
      cumulativePlanned += plannedMap.get(dateKey) ?? 0;
      cumulativeActual += actualMap.get(dateKey) ?? 0;

      const dateLabel = new Intl.DateTimeFormat("pt-BR").format(new Date(`${dateKey}T00:00:00`));

      return {
        label: dateLabel,
        planned: Number(((cumulativePlanned / totalTasks) * 100).toFixed(2)),
        actual: Number(((cumulativeActual / totalTasks) * 100).toFixed(2)),
      };
    });
  }, [tasks]);

  const sCurveConfig: ChartConfig = useMemo(
    () => ({
      planned: {
        label: "Planejado",
        color: "hsl(var(--chart-2))",
      },
      actual: {
        label: "Realizado",
        color: "hsl(var(--chart-1))",
      },
    }),
    [],
  );

  const gaugeConfig: ChartConfig = useMemo(
    () => ({
      planned: {
        label: "Previsto",
        color: "hsl(var(--chart-2))",
      },
      actual: {
        label: "Realizado",
        color: "hsl(var(--chart-1))",
      },
    }),
    [],
  );

  const gaugeData = useMemo(
    () => [
      {
        name: "progress",
        planned: plannedProgress,
        actual: progress,
      },
    ],
    [plannedProgress, progress],
  );

  const handleTogglePrint = (section: PrintSectionKey, value: boolean | "indeterminate") => {
    setPrintSelection((prev) => ({
      ...prev,
      [section]: value === true,
    }));
  };

  const renderPrintToggle = (section: PrintSectionKey) => (
    <div data-print-control="true" className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
      <Checkbox
        id={`print-${section}`}
        checked={printSelection[section]}
        onCheckedChange={(value) => handleTogglePrint(section, value)}
        className="h-4 w-4"
      />
      <label htmlFor={`print-${section}`} className="flex cursor-pointer items-center gap-1 select-none">
        <PrinterCheck className="h-3.5 w-3.5" />
        Imprimir
      </label>
    </div>
  );

  const getSelectedSections = () => {
    if (!printContainerRef.current) {
      return [] as HTMLElement[];
    }

    return Array.from(
      printContainerRef.current.querySelectorAll<HTMLElement>(
        '[data-print-section][data-print-selected="true"]',
      ),
    );
  };

  const createExportContainer = (sections: HTMLElement[]) => {
    if (typeof window === "undefined") {
      return null;
    }

    const exportRoot = document.createElement("div");
    exportRoot.setAttribute("data-export-root", "true");
    exportRoot.style.width = "1024px";
    exportRoot.style.backgroundColor = "#ffffff";
    exportRoot.style.color = "#0f172a";
    exportRoot.style.padding = "40px";
    exportRoot.style.display = "flex";
    exportRoot.style.flexDirection = "column";
    exportRoot.style.gap = "24px";
    exportRoot.style.fontFamily =
      "'Inter', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif";

    const header = document.createElement("div");
    header.style.display = "flex";
    header.style.flexDirection = "column";
    header.style.gap = "12px";
    header.style.borderBottom = "1px solid #e2e8f0";
    header.style.paddingBottom = "16px";

    const title = document.createElement("h1");
    title.textContent = `One Page - ${project.nome_projeto}`;
    title.style.margin = "0";
    title.style.fontSize = "28px";
    title.style.fontWeight = "700";
    title.style.color = "#0f172a";
    header.appendChild(title);

    const subtitle = document.createElement("div");
    subtitle.textContent = `Cliente: ${project.cliente || "—"} · Código: ${
      tap?.cod_cliente ?? project.cod_cliente ?? "—"
    }`;
    subtitle.style.fontSize = "14px";
    subtitle.style.color = "#475569";
    subtitle.style.fontWeight = "500";
    header.appendChild(subtitle);

    const infoGrid = document.createElement("div");
    infoGrid.style.display = "grid";
    infoGrid.style.gridTemplateColumns = "repeat(auto-fit, minmax(220px, 1fr))";
    infoGrid.style.gap = "8px 16px";

    const infoItems = [
      { label: "Data", value: formatDate(tap?.data ?? project.data) },
      { label: "Cliente", value: project.cliente ?? "—" },
      { label: "Código do Cliente", value: tap?.cod_cliente ?? project.cod_cliente ?? "—" },
      { label: "Tipo", value: tap?.tipo ?? "—" },
      { label: "GPP", value: tap?.gpp ?? project.gpp ?? "—" },
      { label: "Coordenador", value: tap?.coordenador ?? project.coordenador ?? "—" },
      { label: "Gerente do Projeto", value: tap?.gerente_projeto ?? project.coordenador ?? "—" },
      { label: "Produto", value: tap?.produto ?? project.produto ?? "—" },
      { label: "Serviço", value: tap?.servico ?? "—" },
      { label: "ESN", value: tap?.esn ?? project.esn ?? "—" },
      { label: "Arquiteto", value: tap?.arquiteto ?? project.arquiteto ?? "—" },
      { label: "Criticidade TOTVS", value: tap?.criticidade_totvs ?? project.criticidade ?? "—" },
      { label: "Criticidade Cliente", value: tap?.criticidade_cliente ?? project.criticidade ?? "—" },
    ];

    infoItems.forEach((item) => {
      const wrapper = document.createElement("div");
      wrapper.style.display = "flex";
      wrapper.style.flexDirection = "column";
      wrapper.style.gap = "2px";

      const labelEl = document.createElement("span");
      labelEl.textContent = item.label;
      labelEl.style.fontSize = "11px";
      labelEl.style.letterSpacing = "0.04em";
      labelEl.style.textTransform = "uppercase";
      labelEl.style.color = "#64748b";
      labelEl.style.fontWeight = "600";

      const valueEl = document.createElement("span");
      valueEl.textContent = item.value ?? "—";
      valueEl.style.fontSize = "14px";
      valueEl.style.fontWeight = "600";
      valueEl.style.color = "#0f172a";

      wrapper.appendChild(labelEl);
      wrapper.appendChild(valueEl);
      infoGrid.appendChild(wrapper);
    });

    header.appendChild(infoGrid);
    exportRoot.appendChild(header);

    sections.forEach((section, index) => {
      const clonedSection = section.cloneNode(true) as HTMLElement;
      clonedSection.querySelectorAll<HTMLElement>("[data-print-control='true']").forEach((control) => {
        control.remove();
      });
      clonedSection.removeAttribute("data-print-selected");
      clonedSection.removeAttribute("data-print-section");
      clonedSection.style.margin = "0";
      clonedSection.style.width = "100%";
      clonedSection.style.breakInside = "avoid";
      clonedSection.style.pageBreakInside = "avoid";
      if (index !== sections.length - 1) {
        clonedSection.style.paddingBottom = "16px";
        clonedSection.style.marginBottom = "16px";
        clonedSection.style.borderBottom = "1px solid #e2e8f0";
      }
      exportRoot.appendChild(clonedSection);
    });

    const footer = document.createElement("div");
    footer.style.marginTop = "auto";
    footer.style.paddingTop = "12px";
    footer.style.borderTop = "1px solid #e2e8f0";
    footer.style.fontSize = "12px";
    footer.style.color = "#475569";
    footer.style.display = "flex";
    footer.style.justifyContent = "space-between";
    footer.style.alignItems = "center";

    const footerLeft = document.createElement("span");
    footerLeft.textContent = `Projeto: ${project.nome_projeto}`;
    footerLeft.style.fontWeight = "600";

    const footerRight = document.createElement("span");
    footerRight.textContent = `Impresso em ${formatDateTime(new Date())}`;

    footer.appendChild(footerLeft);
    footer.appendChild(footerRight);
    exportRoot.appendChild(footer);

    document.body.appendChild(exportRoot);

    return exportRoot;
  };

  const handleExport = async (format: "pdf" | "pptx") => {
    if (typeof window === "undefined" || isExporting) {
      return;
    }

    const selectedSections = getSelectedSections();
    if (!selectedSections.length) {
      toast({
        title: "Nenhuma seção selecionada",
        description: "Selecione ao menos uma seção marcada para impressão antes de exportar.",
        variant: "destructive",
      });
      return;
    }

    let exportRoot: HTMLElement | null = null;

    try {
      setIsExporting(true);
      const fileSlug = slugify(project.nome_projeto);
      const today = new Date();
      const filePrefix = `onepage-${fileSlug}-${today.toISOString().slice(0, 10)}`;

      if (format === "pdf") {
        exportRoot = createExportContainer(selectedSections);

        if (!exportRoot) {
          throw new Error("Não foi possível preparar o conteúdo para exportação.");
        }

        const html2canvas = await loadHtml2Canvas();
        if (!html2canvas) {
          throw new Error("Não foi possível carregar a biblioteca de captura.");
        }

        const canvas = await html2canvas(exportRoot, {
          scale: 2,
          backgroundColor: "#ffffff",
          useCORS: true,
          logging: false,
        });

        const imageData = canvas.toDataURL("image/png");
        const jsPDFConstructor = await loadJsPDF();
        if (!jsPDFConstructor) {
          throw new Error("Biblioteca de PDF indisponível.");
        }

        const orientation = canvas.width > canvas.height ? "landscape" : "portrait";
        const pdf = new jsPDFConstructor({
          orientation,
          unit: "px",
          format: [canvas.width, canvas.height],
        });

        pdf.addImage(imageData, "PNG", 0, 0, canvas.width, canvas.height);
        pdf.save(`${filePrefix}.pdf`);
      } else {
        const PptxGenJS = await loadPptxGenJS();
        if (!PptxGenJS) {
          throw new Error("Biblioteca de PPTX indisponível.");
        }

        const pptx = new PptxGenJS();
        pptx.layout = "LAYOUT_16x9";
        const slide = pptx.addSlide();
        slide.background = { color: "FFFFFF" };

        const slideWidth = pptx.presLayout.width;
        const headerHeight = 0.9;

        const headerShape = slide.addShape(PptxGenJS.ShapeType.rect, {
          x: 0,
          y: 0,
          w: slideWidth,
          h: headerHeight,
          fill: { color: "1F2937" },
          line: { color: "1F2937" },
        });
        headerShape?.sendToBack?.();

        slide.addText("Project Status Report", {
          x: 0.6,
          y: 0.18,
          fontSize: 16,
          color: "E2E8F0",
          bold: true,
        });

        slide.addText(project.nome_projeto, {
          x: 0.6,
          y: 0.42,
          w: slideWidth - 1.2,
          fontSize: 22,
          color: "FFFFFF",
          bold: true,
        });

        slide.addText(`Cliente: ${project.cliente ?? "—"}`, {
          x: 0.6,
          y: 0.68,
          fontSize: 11,
          color: "CBD5F5",
        });

        slide.addText(`Atualizado em ${formatDateTime(today)}`, {
          x: slideWidth - 3.1,
          y: 0.2,
          w: 2.5,
          fontSize: 10,
          color: "CBD5F5",
          align: "right",
        });

        const leftMargin = 0.6;
        const columnGap = 0.3;
        const leftColumnWidth = 5.4;
        const rightColumnWidth = 3.8;
        const rightColumnX = leftMargin + leftColumnWidth + columnGap;
        const baseY = headerHeight + 0.2;

        const projectStatus = normalizeStatusLabel(project.status);
        const realizedRatio = Math.min(Math.max(progress, 0), 100) / 100;
        const plannedRatio = Math.min(Math.max(plannedProgress, 0), 100) / 100;

        const progressCardHeight = 2;
        slide.addShape(PptxGenJS.ShapeType.rect, {
          x: leftMargin,
          y: baseY,
          w: leftColumnWidth,
          h: progressCardHeight,
          fill: { color: "F8FAFC" },
          line: { color: "E2E8F0" },
        });

        slide.addText("Status do Projeto", {
          x: leftMargin + 0.25,
          y: baseY + 0.18,
          fontSize: 12,
          color: "475569",
          bold: true,
        });

        slide.addText(projectStatus, {
          x: leftMargin + 0.25,
          y: baseY + 0.5,
          fontSize: 18,
          color: "1F2937",
          bold: true,
        });

        slide.addText(`${progress}% realizado`, {
          x: leftMargin + 0.25,
          y: baseY + 0.9,
          fontSize: 12,
          color: "1F2937",
          bold: true,
        });

        slide.addText(`Previsto ${plannedProgress}%`, {
          x: leftMargin + 2.6,
          y: baseY + 0.9,
          fontSize: 11,
          color: "64748B",
        });

        const progressBarWidth = leftColumnWidth - 0.5;
        const progressBarX = leftMargin + 0.25;
        const progressBarY = baseY + 1.25;

        slide.addShape(PptxGenJS.ShapeType.rect, {
          x: progressBarX,
          y: progressBarY,
          w: progressBarWidth,
          h: 0.28,
          fill: { color: "E2E8F0" },
          line: { color: "E2E8F0" },
        });

        const realizedWidth = progressBarWidth * realizedRatio;
        if (realizedWidth > 0) {
          slide.addShape(PptxGenJS.ShapeType.rect, {
            x: progressBarX,
            y: progressBarY,
            w: realizedWidth,
            h: 0.28,
            fill: { color: "16A34A" },
            line: { color: "16A34A" },
          });
        }

        const plannedMarkerX = progressBarX + progressBarWidth * plannedRatio;
        slide.addShape(PptxGenJS.ShapeType.rect, {
          x: Math.min(Math.max(plannedMarkerX - 0.02, progressBarX), progressBarX + progressBarWidth - 0.02),
          y: progressBarY - 0.06,
          w: 0.04,
          h: 0.4,
          fill: { color: "F59E0B" },
          line: { color: "F59E0B" },
        });

        slide.addText(`${tasks.length} atividades monitoradas`, {
          x: leftMargin + 0.25,
          y: progressBarY + 0.4,
          fontSize: 10,
          color: "64748B",
        });

        let currentLeftY = baseY + progressCardHeight + 0.3;

        type ExportTableCell = { text: string; options?: Record<string, unknown> };
        type ExportTableRow = Array<string | ExportTableCell>;

        const addTableCard = ({
          title,
          rows,
          x,
          y,
          width,
          columnWidths,
        }: {
          title: string;
          rows: ExportTableRow[];
          x: number;
          y: number;
          width: number;
          columnWidths: number[];
        }) => {
          const padding = 0.22;
          const rowHeight = 0.32;
          const titleHeight = 0.32;
          const tableHeight = rows.length * rowHeight;
          const cardHeight = padding * 2 + titleHeight + tableHeight;

          slide.addShape(PptxGenJS.ShapeType.rect, {
            x,
            y,
            w: width,
            h: cardHeight,
            fill: { color: "F8FAFC" },
            line: { color: "E2E8F0" },
          });

          slide.addText(title, {
            x: x + padding,
            y: y + padding - 0.02,
            w: width - padding * 2,
            fontSize: 12,
            color: "1F2937",
            bold: true,
          });

          slide.addTable(rows, {
            x: x + padding,
            y: y + padding + titleHeight,
            w: width - padding * 2,
            colW: columnWidths,
            fontSize: 10,
            rowH: rowHeight,
            border: { pt: 0.5, color: "E2E8F0" },
            valign: "middle",
          });

          return y + cardHeight + 0.24;
        };

        const issuesRows = [
          [
            {
              text: "Responsável",
              options: { bold: true, color: "FFFFFF", fill: { color: "1E293B" } },
            },
            {
              text: "Pendências",
              options: {
                bold: true,
                color: "FFFFFF",
                fill: { color: "1E293B" },
                align: "center",
              },
            },
          ],
          ...(
            issuesByOwner.length
              ? issuesByOwner.map((issue) => [
                  { text: issue.owner, options: { color: "1F2937" } },
                  { text: issue.count.toString(), options: { align: "center", color: "1F2937" } },
                ])
              : [[
                  { text: "Nenhuma pendência identificada", options: { color: "64748B", italic: true } },
                  { text: "—", options: { align: "center", color: "94A3B8" } },
                ]]
          ),
        ];

        const issuesContentWidth = leftColumnWidth - 0.44;
        currentLeftY = addTableCard({
          title: "Questões por responsável",
          rows: issuesRows,
          x: leftMargin,
          y: currentLeftY,
          width: leftColumnWidth,
          columnWidths: [issuesContentWidth * 0.7, issuesContentWidth * 0.3],
        });

        const deliveredRows = [
          [
            { text: "Data", options: { bold: true, color: "FFFFFF", fill: { color: "1E293B" } } },
            { text: "Entrega", options: { bold: true, color: "FFFFFF", fill: { color: "1E293B" } } },
          ],
          ...(
            deliveredTasks.length
              ? deliveredTasks.map((task) => [
                  { text: formatDate(task.data_entrega ?? task.updated_at ?? ""), options: { color: "1F2937" } },
                  { text: task.nome, options: { color: "1F2937" } },
                ])
              : [[
                  { text: "Sem entregas registradas", options: { color: "64748B", italic: true } },
                  { text: "—", options: { color: "94A3B8" } },
                ]]
          ),
        ];

        currentLeftY = addTableCard({
          title: "Entregas recentes",
          rows: deliveredRows,
          x: leftMargin,
          y: currentLeftY,
          width: leftColumnWidth,
          columnWidths: [issuesContentWidth * 0.32, issuesContentWidth * 0.68],
        });

        const upcomingRows = [
          [
            { text: "Data", options: { bold: true, color: "FFFFFF", fill: { color: "1E293B" } } },
            { text: "Atividade", options: { bold: true, color: "FFFFFF", fill: { color: "1E293B" } } },
          ],
          ...(
            upcomingDeliveries.length
              ? upcomingDeliveries.map(({ task, date }) => [
                  { text: formatDate(date.toISOString()), options: { color: "1F2937" } },
                  { text: task.nome, options: { color: "1F2937" } },
                ])
              : [[
                  { text: "Sem atividades previstas", options: { color: "64748B", italic: true } },
                  { text: "—", options: { color: "94A3B8" } },
                ]]
          ),
        ];

        currentLeftY = addTableCard({
          title: "Entregas próximas",
          rows: upcomingRows,
          x: leftMargin,
          y: currentLeftY,
          width: leftColumnWidth,
          columnWidths: [issuesContentWidth * 0.32, issuesContentWidth * 0.68],
        });

        let currentRightY = baseY;

        const addInfoCard = ({
          title,
          lines,
          x,
          y,
          width,
        }: {
          title: string;
          lines: Array<{ label: string; value: string }>;
          x: number;
          y: number;
          width: number;
        }) => {
          const padding = 0.22;
          const lineHeight = 0.28;
          const titleHeight = 0.32;
          const cardHeight = padding * 2 + titleHeight + lines.length * lineHeight;

          slide.addShape(PptxGenJS.ShapeType.rect, {
            x,
            y,
            w: width,
            h: cardHeight,
            fill: { color: "F8FAFC" },
            line: { color: "E2E8F0" },
          });

          slide.addText(title, {
            x: x + padding,
            y: y + padding - 0.02,
            w: width - padding * 2,
            fontSize: 12,
            color: "1F2937",
            bold: true,
          });

          lines.forEach((line, index) => {
            const lineY = y + padding + titleHeight + index * lineHeight;
            slide.addText(line.label, {
              x: x + padding,
              y: lineY,
              fontSize: 10,
              color: "64748B",
            });

            slide.addText(line.value, {
              x: x + padding,
              y: lineY,
              w: width - padding * 2,
              fontSize: 11,
              color: "1F2937",
              bold: true,
              align: "right",
            });
          });

          return y + cardHeight + 0.26;
        };

        currentRightY = addInfoCard({
          title: "Informações do projeto",
          lines: [
            { label: "Data", value: formatDate(project.data) },
            { label: "Código", value: tap?.cod_cliente ?? project.cod_cliente ?? "—" },
            { label: "GPP", value: tap?.gpp ?? project.gpp ?? "—" },
            { label: "Coordenação", value: tap?.coordenador ?? project.coordenador ?? "—" },
            { label: "Gerente", value: tap?.gerente_projeto ?? project.coordenador ?? "—" },
          ],
          x: rightColumnX,
          y: currentRightY,
          width: rightColumnWidth,
        });

        currentRightY = addInfoCard({
          title: "Cronograma",
          lines: [
            { label: "Início", value: formatDate(project.data_inicio) },
            { label: "Go-live previsto", value: formatDate(project.go_live_previsto) },
            {
              label: "Pós-produção",
              value: project.duracao_pos_producao ? `${project.duracao_pos_producao} dias` : "—",
            },
          ],
          x: rightColumnX,
          y: currentRightY,
          width: rightColumnWidth,
        });

        currentRightY = addInfoCard({
          title: "Financeiro",
          lines: [
            { label: "Valor do projeto", value: formatCurrency(project.valor_projeto) },
            { label: "Receita atual", value: formatCurrency(project.receita_atual) },
            {
              label: "Margem",
              value: `${formatPercentage(project.margem_venda_percent)} / ${formatPercentage(project.margem_atual_percent)}`,
            },
          ],
          x: rightColumnX,
          y: currentRightY,
          width: rightColumnWidth,
        });

        const riskRows = [
          [
            { text: "Risco", options: { bold: true, color: "FFFFFF", fill: { color: "1E293B" } } },
            { text: "Responsável", options: { bold: true, color: "FFFFFF", fill: { color: "1E293B" } } },
            { text: "Exposição", options: { bold: true, color: "FFFFFF", fill: { color: "1E293B" }, align: "center" } },
          ],
          ...(
            criticalRisks.length
              ? criticalRisks.map((risk) => [
                  { text: risk.situacao, options: { color: "1F2937" } },
                  { text: risk.responsavel, options: { color: "1F2937" } },
                  {
                    text: `${Math.round(risk.exposicao)}%`,
                    options: { align: "center", color: "1F2937" },
                  },
                ])
              : [[
                  { text: "Sem riscos críticos", options: { color: "64748B", italic: true } },
                  { text: "—", options: { color: "94A3B8" } },
                  { text: "—", options: { align: "center", color: "94A3B8" } },
                ]]
          ),
        ];

        currentRightY = addTableCard({
          title: "Riscos críticos",
          rows: riskRows,
          x: rightColumnX,
          y: currentRightY,
          width: rightColumnWidth,
          columnWidths: [rightColumnWidth * 0.42, rightColumnWidth * 0.33, rightColumnWidth * 0.23],
        });

        const stakeholderRows = [
          [
            { text: "Stakeholder", options: { bold: true, color: "FFFFFF", fill: { color: "1E293B" } } },
            { text: "Cargo", options: { bold: true, color: "FFFFFF", fill: { color: "1E293B" } } },
          ],
          ...(
            keyStakeholders.length
              ? keyStakeholders.map((stakeholder) => [
                  { text: stakeholder.nome, options: { color: "1F2937" } },
                  { text: stakeholder.cargo, options: { color: "1F2937" } },
                ])
              : [[
                  { text: "Sem stakeholders cadastrados", options: { color: "64748B", italic: true } },
                  { text: "—", options: { color: "94A3B8" } },
                ]]
          ),
        ];

        addTableCard({
          title: "Stakeholders chave",
          rows: stakeholderRows,
          x: rightColumnX,
          y: currentRightY,
          width: rightColumnWidth,
          columnWidths: [rightColumnWidth * 0.55, rightColumnWidth * 0.45],
        });

        await pptx.writeFile({ fileName: `${filePrefix}.pptx` });
      }

      toast({
        title: "Exportação concluída",
        description: format === "pdf" ? "Arquivo PDF gerado com sucesso." : "Arquivo PPTX gerado com sucesso.",
      });
    } catch (error) {
      console.error("Erro ao exportar One Page:", error);
      toast({
        title: "Erro na exportação",
        description: "Não foi possível exportar a One Page. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
      if (exportRoot?.parentElement) {
        exportRoot.parentElement.removeChild(exportRoot);
      }
    }
  };

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
      <div ref={printContainerRef} className="space-y-6">
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
          <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" className="whitespace-nowrap" disabled={isExporting}>
                  <Download className="mr-2 h-4 w-4" />
                  {isExporting ? "Gerando..." : "Exportar One Page"}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onSelect={(event) => {
                    event.preventDefault();
                    void handleExport("pdf");
                  }}
                >
                  Exportar em PDF
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={(event) => {
                    event.preventDefault();
                    void handleExport("pptx");
                  }}
                >
                  Exportar em PPTX
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Badge
              className="self-start sm:self-auto"
              variant={
                project.criticidade === "Crítica"
                  ? "destructive"
                  : project.criticidade === "Alta"
                  ? "secondary"
                  : "outline"
              }
            >
              Criticidade {project.criticidade}
            </Badge>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card data-print-section="progress" data-print-selected={printSelection.progress ? "true" : "false"}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardDescription>Progresso geral</CardDescription>
                  <CardTitle className="text-3xl font-bold">Entrega consolidada</CardTitle>
                </div>
                {renderPrintToggle("progress")}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative mx-auto flex h-48 w-full max-w-[280px] flex-col items-center justify-center">
                <ChartContainer
                  config={gaugeConfig}
                  className="h-48 w-full max-w-[280px] [&_.recharts-wrapper]:overflow-visible"
                >
                  <RadialBarChart data={gaugeData} startAngle={210} endAngle={-30}>
                    <PolarAngleAxis type="number" domain={[0, 100]} tick={false} angleAxisId={0} />
                    <RadialBar
                      dataKey="planned"
                      cornerRadius={12}
                      fill="var(--color-planned)"
                      background
                      clockWise
                      innerRadius="70%"
                      outerRadius="100%"
                    />
                    <RadialBar
                      dataKey="actual"
                      cornerRadius={12}
                      fill="var(--color-actual)"
                      clockWise
                      innerRadius="50%"
                      outerRadius="80%"
                    />
                  </RadialBarChart>
                </ChartContainer>
                <div className="absolute top-1/2 flex -translate-y-1/2 flex-col items-center justify-center gap-1 text-center">
                  <span className="text-4xl font-bold text-foreground">{progress}%</span>
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Realizado
                  </span>
                  <span className="text-xs text-muted-foreground">Previsto: {plannedProgress}%</span>
                </div>
              </div>
              <div className="space-y-3">
                <div className="relative">
                  <Progress value={progress} className="h-2" />
                  <div
                    className="absolute top-0 h-2 w-0.5 -translate-x-1/2 rounded-full bg-[hsl(var(--chart-2))]"
                    style={{ left: `${plannedProgress}%` }}
                    aria-hidden="true"
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="flex items-center gap-3 rounded-md border border-border/60 bg-muted/20 p-3">
                    <span className="h-2 w-2 rounded-full bg-[hsl(var(--chart-2))]" aria-hidden="true" />
                    <div className="flex flex-col leading-tight">
                      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Previsto</span>
                      <span className="text-sm font-semibold text-foreground">{plannedProgress}%</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 rounded-md border border-border/60 bg-muted/20 p-3">
                    <span className="h-2 w-2 rounded-full bg-[hsl(var(--chart-1))]" aria-hidden="true" />
                    <div className="flex flex-col leading-tight">
                      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Realizado</span>
                      <span className="text-sm font-semibold text-foreground">{progress}%</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <ClipboardList className="h-4 w-4" />
                {tasks.length} atividades monitoradas
              </div>
            </CardContent>
          </Card>

          <Card data-print-section="schedule" data-print-selected={printSelection.schedule ? "true" : "false"}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardDescription>Cronograma</CardDescription>
                  <CardTitle className="text-lg">Linha do tempo</CardTitle>
                </div>
                {renderPrintToggle("schedule")}
              </div>
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

          <Card data-print-section="finance" data-print-selected={printSelection.finance ? "true" : "false"}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardDescription>Financeiro</CardDescription>
                  <CardTitle className="text-lg">Resumo</CardTitle>
                </div>
                {renderPrintToggle("finance")}
              </div>
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

          <Card data-print-section="team" data-print-selected={printSelection.team ? "true" : "false"}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardDescription>Equipe principal</CardDescription>
                  <CardTitle className="text-lg">Responsáveis</CardTitle>
                </div>
                {renderPrintToggle("team")}
              </div>
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

        <Card data-print-section="executiveSummary" data-print-selected={printSelection.executiveSummary ? "true" : "false"}>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle>Resumo executivo</CardTitle>
                <CardDescription>Escopo, objetivos e observações principais do projeto</CardDescription>
              </div>
              {renderPrintToggle("executiveSummary")}
            </div>
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
          <Card data-print-section="issues" data-print-selected={printSelection.issues ? "true" : "false"}>
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Layers className="h-4 w-4 text-primary" />
                    <CardTitle>Questões por responsável</CardTitle>
                  </div>
                  <CardDescription>Pontos de atenção em aberto organizados por responsável</CardDescription>
                </div>
                {renderPrintToggle("issues")}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {issuesByOwnerChart.data.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold uppercase text-muted-foreground">
                    Distribuição por status
                  </h4>
                  <ChartContainer config={issuesByOwnerChart.config} className="h-72 w-full">
                    <BarChart data={issuesByOwnerChart.data}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="owner" tickLine={false} axisLine={false} />
                      <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Legend />
                      {issuesByOwnerChart.statuses.map(({ key }) => (
                        <Bar key={key} dataKey={key} stackId="issues" fill={`var(--color-${key})`} radius={[4, 4, 0, 0]} />
                      ))}
                    </BarChart>
                  </ChartContainer>
                </div>
              )}

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

          <Card data-print-section="risks" data-print-selected={printSelection.risks ? "true" : "false"}>
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                    <CardTitle>Riscos críticos</CardTitle>
                  </div>
                  <CardDescription>Principais riscos acompanhados pelo time do projeto</CardDescription>
                </div>
                {renderPrintToggle("risks")}
              </div>
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

        <Card data-print-section="deliveries" data-print-selected={printSelection.deliveries ? "true" : "false"}>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  <CardTitle>Entregas e próximos passos</CardTitle>
                </div>
                <CardDescription>Visão consolidada das entregas concluídas e futuras</CardDescription>
              </div>
              {renderPrintToggle("deliveries")}
            </div>
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

        <Card data-print-section="sCurve" data-print-selected={printSelection.sCurve ? "true" : "false"}>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  <CardTitle>Curva S do projeto</CardTitle>
                </div>
                <CardDescription>Evolução acumulada das entregas planejadas x realizadas</CardDescription>
              </div>
              {renderPrintToggle("sCurve")}
            </div>
          </CardHeader>
          <CardContent>
            {sCurveData.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Ainda não há dados suficientes para calcular a curva S.
              </p>
            ) : (
              <ChartContainer config={sCurveConfig} className="h-80 w-full">
                <LineChart data={sCurveData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} />
                  <YAxis domain={[0, 100]} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}%`} />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        formatter={(value, name) => {
                          const numeric = typeof value === "number" ? value : Number(value);
                          const percentage = Number.isFinite(numeric)
                            ? `${numeric.toFixed(2)}%`
                            : `${value}%`;
                          const label =
                            sCurveConfig[name as keyof typeof sCurveConfig]?.label || name;
                          return [percentage, label];
                        }}
                        labelFormatter={(label) => `Data: ${label}`}
                      />
                    }
                  />
                  <Legend />
                  <Line type="monotone" dataKey="planned" stroke="var(--color-planned)" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="actual" stroke="var(--color-actual)" strokeWidth={2} dot />
                </LineChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card data-print-section="stakeholders" data-print-selected={printSelection.stakeholders ? "true" : "false"}>
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" />
                    <CardTitle>Stakeholders chave</CardTitle>
                  </div>
                  <CardDescription>Principais envolvidos e nível de influência</CardDescription>
                </div>
                {renderPrintToggle("stakeholders")}
              </div>
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

          <Card data-print-section="communications" data-print-selected={printSelection.communications ? "true" : "false"}>
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-primary" />
                    <CardTitle>Comunicações planejadas</CardTitle>
                  </div>
                  <CardDescription>Principais comunicações e responsáveis</CardDescription>
                </div>
                {renderPrintToggle("communications")}
              </div>
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
