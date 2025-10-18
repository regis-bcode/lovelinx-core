import { type ChangeEvent, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DateInput } from '@/components/ui/date-input';
import { Switch } from '@/components/ui/switch';
import { CurrencyInput } from '@/components/ui/currency-input';
import { PercentageInput } from '@/components/ui/percentage-input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useGaps } from '@/hooks/useGaps';
import { useTasks } from '@/hooks/useTasks';
import { useToast } from '@/hooks/use-toast';
import { Gap, GapFormData } from '@/types/gap';
import { cn } from '@/lib/utils';
import { CheckCircle2, ClipboardEdit, Download, FilePlus2, FileSpreadsheet, Loader2, Trash2, Upload } from 'lucide-react';

const IMPACT_OPTIONS = ['Escopo', 'Prazo', 'Custo'] as const;

const formatCurrency = (value?: number | null) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return null;
  }
  try {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value));
  } catch {
    return String(value);
  }
};

const formatDate = (value?: string | null) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString('pt-BR');
};

const formatBoolean = (value?: boolean | null) => {
  if (value === null || value === undefined) {
    return null;
  }
  return value ? 'Sim' : 'Não';
};

const formatPercentageValue = (value?: number | null) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return null;
  }

  const formatter = new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });

  return `${formatter.format(value)}%`;
};

const formatResumo = (descricao?: string | null) => {
  if (!descricao) return null;
  const trimmed = descricao.trim();
  if (!trimmed) return null;
  if (trimmed.length <= 140) {
    return trimmed;
  }
  return `${trimmed.slice(0, 137)}...`;
};

const parseExcelDate = (value: unknown): string | null => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  if (typeof value === 'number') {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (!parsed) {
      return null;
    }
    const date = new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d));
    return date.toISOString().slice(0, 10);
  }

  const text = String(value).trim();
  if (!text) {
    return null;
  }

  const datePattern = text.match(/^([0-9]{1,2})[/-]([0-9]{1,2})[/-]([0-9]{2,4})$/);
  if (datePattern) {
    const [, day, month, rawYear] = datePattern;
    const year = rawYear.length === 2 ? `20${rawYear}` : rawYear;
    const iso = `${year.padStart(4, '0')}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    const parsedDate = new Date(iso);
    if (!Number.isNaN(parsedDate.getTime())) {
      return parsedDate.toISOString().slice(0, 10);
    }
  }

  const parsedDate = new Date(text);
  if (!Number.isNaN(parsedDate.getTime())) {
    return parsedDate.toISOString().slice(0, 10);
  }

  return null;
};

const parseBooleanCell = (value: unknown): boolean | null => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  const normalized = String(value).trim().toLowerCase();
  if (!normalized) return null;

  if (['sim', 's', 'yes', 'y', 'verdadeiro', 'true', '1'].includes(normalized)) {
    return true;
  }

  if (['nao', 'não', 'n', 'no', 'false', '0'].includes(normalized)) {
    return false;
  }

  return null;
};

const parseCurrencyCell = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  const normalized = String(value)
    .replace(/[^0-9,.-]/g, '')
    .replace(/\.(?=\d{3}(?:\.|,))/g, '')
    .replace(',', '.');

  if (!normalized.trim()) {
    return null;
  }

  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

const parsePercentageCell = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return null;
    return Math.min(Math.max(value, 0), 100);
  }

  const normalized = String(value).replace('%', '').replace(',', '.').trim();
  if (!normalized) {
    return null;
  }

  const parsed = Number.parseFloat(normalized);
  if (!Number.isFinite(parsed)) {
    return null;
  }

  return Math.min(Math.max(parsed, 0), 100);
};

const sanitizeFileName = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9-_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();

interface GapColumn {
  key: string;
  label: string;
  minWidth?: number;
  cellClassName?: string;
  render: (gap: Gap) => ReactNode;
}

type GapFormState = Omit<Partial<GapFormData>, 'impacto' | 'anexos' | 'valor_impacto_financeiro' | 'percentual_previsto' | 'percentual_planejado'> & {
  impacto: string[];
  anexosTexto?: string;
  valor_impacto_financeiro?: string | number | null;
  percentual_previsto?: string | number | null;
  percentual_planejado?: string | number | null;
};

interface GapManagementProps {
  projectId: string;
  initialTaskId?: string;
}

const emptyForm: GapFormState = {
  task_id: '',
  titulo: '',
  descricao: '',
  tipo: '',
  origem: '',
  severidade: '',
  urgencia: '',
  prioridade: '',
  impacto: [],
  faturavel: false,
  valor_impacto_financeiro: '',
  causa_raiz: '',
  plano_acao: '',
  responsavel: '',
  data_prometida: '',
  data_prevista_solucao: '',
  data_realizada_solucao: '',
  status: '',
  necessita_aprovacao: false,
  decisao: '',
  aprovado_por: '',
  data_aprovacao: '',
  anexos: [],
  observacoes: '',
  impacto_financeiro_descricao: '',
  impacto_resumo: '',
  anexosTexto: '',
  percentual_previsto: '',
  percentual_planejado: '',
};

export function GapManagement({ projectId, initialTaskId }: GapManagementProps) {
  const { gaps, loading, createGap, updateGap, deleteGap, ensureGapForTask } = useGaps(projectId);
  const { tasks } = useTasks(projectId);
  const { toast } = useToast();

  const [selectedTaskId, setSelectedTaskId] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formState, setFormState] = useState<GapFormState>(emptyForm);
  const [editingGap, setEditingGap] = useState<Gap | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isExportingTemplate, setIsExportingTemplate] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (initialTaskId) {
      setSelectedTaskId(initialTaskId);
    }
  }, [initialTaskId]);

  useEffect(() => {
    if (!isDialogOpen) {
      setFormState(emptyForm);
      setEditingGap(null);
    }
  }, [isDialogOpen]);

  const filteredGaps = useMemo(() => {
    if (selectedTaskId === 'all') {
      return gaps;
    }
    return gaps.filter(gap => gap.task_id === selectedTaskId);
  }, [gaps, selectedTaskId]);

  const tasksOptions = useMemo(() => {
    return tasks
      .slice()
      .sort((a, b) => a.nome.localeCompare(b.nome));
  }, [tasks]);

  const taskNameById = useMemo(() => {
    return tasks.reduce<Record<string, string>>((acc, task) => {
      acc[task.id] = task.nome;
      return acc;
    }, {});
  }, [tasks]);

  const highlightTaskId = initialTaskId ?? null;

  const gapColumns = useMemo<GapColumn[]>(() => {
    const renderTextValue = (
      value?: string | null,
      options?: { multiline?: boolean; strong?: boolean },
    ): ReactNode => {
      if (!value || value.trim().length === 0) {
        return <span className="text-muted-foreground">-</span>;
      }

      return (
        <span
          className={cn(
            'break-words text-foreground',
            options?.multiline ? 'whitespace-pre-wrap' : 'whitespace-normal',
            options?.strong ? 'font-semibold' : undefined,
          )}
        >
          {value}
        </span>
      );
    };

    const renderCurrencyValue = (value?: number | null): ReactNode => {
      const formatted = formatCurrency(value ?? undefined);
      if (!formatted) {
        return <span className="text-muted-foreground">-</span>;
      }
      return <span>{formatted}</span>;
    };

    const renderBooleanValue = (value?: boolean | null): ReactNode => {
      const formatted = formatBoolean(value);
      if (!formatted) {
        return <span className="text-muted-foreground">-</span>;
      }
      return <span>{formatted}</span>;
    };

    const renderImpactValue = (impact?: string[] | null): ReactNode => {
      const list = Array.isArray(impact) ? impact.filter(Boolean) : [];
      if (list.length === 0) {
        return <span className="text-muted-foreground">-</span>;
      }

      return (
        <div className="flex flex-wrap gap-1">
          {list.map(item => (
            <Badge key={item} variant="outline" className="text-[11px]">
              {item}
            </Badge>
          ))}
        </div>
      );
    };

    const renderAttachmentsValue = (anexos?: string[] | null): ReactNode => {
      const list = Array.isArray(anexos)
        ? anexos.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
        : [];

      if (list.length === 0) {
        return <span className="text-muted-foreground">-</span>;
      }

      return (
        <ul className="list-disc space-y-1 pl-4 text-xs">
          {list.map((item, index) => {
            const key = `${item}-${index}`;
            const isUrl = /^https?:\/\//i.test(item);
            return (
              <li key={key} className="break-words">
                {isUrl ? (
                  <a
                    href={item}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline-offset-2 hover:underline"
                  >
                    {item}
                  </a>
                ) : (
                  item
                )}
              </li>
            );
          })}
        </ul>
      );
    };

    const renderResumoValue = (descricao?: string | null): ReactNode => {
      const resumo = formatResumo(descricao);
      if (!resumo) {
        return <span className="text-muted-foreground">-</span>;
      }

      return <span className="break-words whitespace-pre-wrap text-foreground">{resumo}</span>;
    };

    const renderPercentageCell = (value?: number | null): ReactNode => {
      const formatted = formatPercentageValue(value);
      if (!formatted) {
        return <span className="text-muted-foreground">-</span>;
      }

      return <span>{formatted}</span>;
    };

    return [
      {
        key: 'task',
        label: 'Tarefa vinculada',
        minWidth: 220,
        render: gap => renderTextValue(taskNameById[gap.task_id] ?? 'Tarefa não encontrada', { strong: true }),
      },
      {
        key: 'titulo',
        label: 'Título',
        minWidth: 220,
        render: gap => renderTextValue(gap.titulo ?? null, { strong: true }),
      },
      {
        key: 'resumo',
        label: 'Resumo do GAP',
        minWidth: 240,
        cellClassName: 'max-w-[320px]',
        render: gap => renderResumoValue(gap.descricao ?? null),
      },
      {
        key: 'descricao',
        label: 'Descrição',
        minWidth: 260,
        cellClassName: 'max-w-[360px]',
        render: gap => renderTextValue(gap.descricao ?? null, { multiline: true }),
      },
      {
        key: 'tipo',
        label: 'Tipo de GAP',
        minWidth: 160,
        render: gap => renderTextValue(gap.tipo ?? null),
      },
      {
        key: 'origem',
        label: 'Origem',
        minWidth: 160,
        render: gap => renderTextValue(gap.origem ?? null),
      },
      {
        key: 'severidade',
        label: 'Severidade',
        minWidth: 160,
        render: gap => renderTextValue(gap.severidade ?? null),
      },
      {
        key: 'urgencia',
        label: 'Urgência',
        minWidth: 160,
        render: gap => renderTextValue(gap.urgencia ?? null),
      },
      {
        key: 'prioridade',
        label: 'Prioridade',
        minWidth: 160,
        render: gap => renderTextValue(gap.prioridade ?? null),
      },
      {
        key: 'status',
        label: 'Status do GAP',
        minWidth: 180,
        render: gap => renderTextValue(gap.status ?? null),
      },
      {
        key: 'impacto',
        label: 'Impacto',
        minWidth: 200,
        render: gap => renderImpactValue(gap.impacto ?? null),
      },
      {
        key: 'faturavel',
        label: 'Faturável? (Gera cobrança adicional?)',
        minWidth: 180,
        render: gap => renderBooleanValue(gap.faturavel ?? null),
      },
      {
        key: 'valor_impacto_financeiro',
        label: 'Valor de Impacto Financeiro',
        minWidth: 180,
        render: gap => renderCurrencyValue(gap.valor_impacto_financeiro ?? null),
      },
      {
        key: 'causa_raiz',
        label: 'Causa raiz',
        minWidth: 240,
        cellClassName: 'max-w-[360px]',
        render: gap => renderTextValue(gap.causa_raiz ?? null, { multiline: true }),
      },
      {
        key: 'plano_acao',
        label: 'Plano de ação',
        minWidth: 240,
        cellClassName: 'max-w-[360px]',
        render: gap => renderTextValue(gap.plano_acao ?? null, { multiline: true }),
      },
      {
        key: 'responsavel',
        label: 'Responsável',
        minWidth: 180,
        render: gap => renderTextValue(gap.responsavel ?? null),
      },
      {
        key: 'data_prometida',
        label: 'Data prometida para tratativa',
        minWidth: 180,
        render: gap => renderTextValue(formatDate(gap.data_prometida) ?? null),
      },
      {
        key: 'data_prevista_solucao',
        label: 'Data prevista solução',
        minWidth: 180,
        render: gap => renderTextValue(formatDate(gap.data_prevista_solucao) ?? null),
      },
      {
        key: 'data_realizada_solucao',
        label: 'Data realizada solução',
        minWidth: 180,
        render: gap => renderTextValue(formatDate(gap.data_realizada_solucao) ?? null),
      },
      {
        key: 'necessita_aprovacao',
        label: 'Necessita aprovação?',
        minWidth: 180,
        render: gap => renderBooleanValue(gap.necessita_aprovacao ?? null),
      },
      {
        key: 'decisao',
        label: 'Decisão',
        minWidth: 240,
        cellClassName: 'max-w-[360px]',
        render: gap => renderTextValue(gap.decisao ?? null, { multiline: true }),
      },
      {
        key: 'aprovado_por',
        label: 'Aprovado por',
        minWidth: 180,
        render: gap => renderTextValue(gap.aprovado_por ?? null),
      },
      {
        key: 'data_aprovacao',
        label: 'Data de aprovação',
        minWidth: 180,
        render: gap => renderTextValue(formatDate(gap.data_aprovacao) ?? null),
      },
      {
        key: 'impacto_financeiro_descricao',
        label: 'Impacto financeiro (descrição)',
        minWidth: 240,
        cellClassName: 'max-w-[360px]',
        render: gap => renderTextValue(gap.impacto_financeiro_descricao ?? null, { multiline: true }),
      },
      {
        key: 'impacto_resumo',
        label: 'Resumo do impacto',
        minWidth: 240,
        cellClassName: 'max-w-[360px]',
        render: gap => renderTextValue(gap.impacto_resumo ?? null, { multiline: true }),
      },
      {
        key: 'percentual_previsto',
        label: '% Previsto',
        minWidth: 140,
        render: gap => renderPercentageCell(gap.percentual_previsto ?? null),
      },
      {
        key: 'percentual_planejado',
        label: '% Planejado',
        minWidth: 140,
        render: gap => renderPercentageCell(gap.percentual_planejado ?? null),
      },
      {
        key: 'anexos',
        label: 'Anexos (um por linha)',
        minWidth: 240,
        cellClassName: 'max-w-[360px]',
        render: gap => renderAttachmentsValue(gap.anexos ?? null),
      },
      {
        key: 'observacoes',
        label: 'Observações',
        minWidth: 240,
        cellClassName: 'max-w-[360px]',
        render: gap => renderTextValue(gap.observacoes ?? null, { multiline: true }),
      },
    ];
  }, [taskNameById]);

  const exportColumns = useMemo(
    () => [
      {
        label: 'Tarefa vinculada',
        value: (gap: Gap) => taskNameById[gap.task_id] ?? '',
      },
      {
        label: 'Título',
        value: (gap: Gap) => gap.titulo ?? '',
      },
      {
        label: 'Resumo do GAP',
        value: (gap: Gap) => formatResumo(gap.descricao ?? null) ?? '',
      },
      {
        label: 'Descrição',
        value: (gap: Gap) => gap.descricao ?? '',
      },
      {
        label: 'Tipo de GAP',
        value: (gap: Gap) => gap.tipo ?? '',
      },
      {
        label: 'Origem',
        value: (gap: Gap) => gap.origem ?? '',
      },
      {
        label: 'Severidade',
        value: (gap: Gap) => gap.severidade ?? '',
      },
      {
        label: 'Urgência',
        value: (gap: Gap) => gap.urgencia ?? '',
      },
      {
        label: 'Prioridade',
        value: (gap: Gap) => gap.prioridade ?? '',
      },
      {
        label: 'Status do GAP',
        value: (gap: Gap) => gap.status ?? '',
      },
      {
        label: 'Impacto',
        value: (gap: Gap) => (Array.isArray(gap.impacto) ? gap.impacto.filter(Boolean).join('; ') : ''),
      },
      {
        label: 'Faturável? (Gera cobrança adicional?)',
        value: (gap: Gap) => formatBoolean(gap.faturavel ?? null) ?? '',
      },
      {
        label: 'Valor de Impacto Financeiro',
        value: (gap: Gap) => formatCurrency(gap.valor_impacto_financeiro ?? null) ?? '',
      },
      {
        label: 'Causa raiz',
        value: (gap: Gap) => gap.causa_raiz ?? '',
      },
      {
        label: 'Plano de ação',
        value: (gap: Gap) => gap.plano_acao ?? '',
      },
      {
        label: 'Responsável',
        value: (gap: Gap) => gap.responsavel ?? '',
      },
      {
        label: 'Data prometida para tratativa',
        value: (gap: Gap) => formatDate(gap.data_prometida) ?? '',
      },
      {
        label: 'Data prevista solução',
        value: (gap: Gap) => formatDate(gap.data_prevista_solucao) ?? '',
      },
      {
        label: 'Data realizada solução',
        value: (gap: Gap) => formatDate(gap.data_realizada_solucao) ?? '',
      },
      {
        label: 'Necessita aprovação?',
        value: (gap: Gap) => formatBoolean(gap.necessita_aprovacao ?? null) ?? '',
      },
      {
        label: 'Decisão',
        value: (gap: Gap) => gap.decisao ?? '',
      },
      {
        label: 'Aprovado por',
        value: (gap: Gap) => gap.aprovado_por ?? '',
      },
      {
        label: 'Data de aprovação',
        value: (gap: Gap) => formatDate(gap.data_aprovacao) ?? '',
      },
      {
        label: 'Impacto financeiro (descrição)',
        value: (gap: Gap) => gap.impacto_financeiro_descricao ?? '',
      },
      {
        label: 'Resumo do impacto',
        value: (gap: Gap) => gap.impacto_resumo ?? '',
      },
      {
        label: '% Previsto',
        value: (gap: Gap) => formatPercentageValue(gap.percentual_previsto ?? null) ?? '',
      },
      {
        label: '% Planejado',
        value: (gap: Gap) => formatPercentageValue(gap.percentual_planejado ?? null) ?? '',
      },
      {
        label: 'Anexos (um por linha)',
        value: (gap: Gap) => (Array.isArray(gap.anexos) ? gap.anexos.join('\n') : ''),
      },
      {
        label: 'Observações',
        value: (gap: Gap) => gap.observacoes ?? '',
      },
    ],
    [taskNameById],
  );

  const handleExportTemplate = useCallback(() => {
    try {
      setIsExportingTemplate(true);
      const worksheet = XLSX.utils.json_to_sheet([
        {
          'Tarefa ID': '',
          'Tarefa Nome': '',
          'Título': '',
          'Descrição': '',
          'Tipo de GAP': '',
          'Origem': '',
          'Severidade': '',
          'Urgência': '',
          'Prioridade': '',
          'Status do GAP': '',
          'Impacto (separe por ;)': '',
          'Faturável? (Sim/Não)': '',
          'Valor de Impacto Financeiro': '',
          'Causa raiz': '',
          'Plano de ação': '',
          'Responsável': '',
          'Data prometida para tratativa': '',
          'Data prevista solução': '',
          'Data realizada solução': '',
          'Necessita aprovação? (Sim/Não)': '',
          'Decisão': '',
          'Aprovado por': '',
          'Data de aprovação': '',
          'Impacto financeiro (descrição)': '',
          'Resumo do impacto': '',
          'Anexos (um por linha ou ;)': '',
          'Observações': '',
          '% Previsto': '',
          '% Planejado': '',
        },
      ]);

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'GAPs');
      XLSX.writeFile(workbook, 'modelo-gaps.xlsx');

      toast({
        title: 'Modelo exportado',
        description: 'O modelo de importação foi gerado com sucesso.',
      });
    } catch (error) {
      console.error('Erro ao exportar modelo de GAPs', error);
      toast({
        title: 'Erro ao exportar modelo',
        description: 'Não foi possível gerar o modelo de importação.',
        variant: 'destructive',
      });
    } finally {
      setIsExportingTemplate(false);
    }
  }, [toast]);

  const handleImportData = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];

      if (!file) {
        return;
      }

      const normalize = (text: string) =>
        text
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLowerCase();

      try {
        setIsImporting(true);
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        if (!worksheet) {
          throw new Error('Planilha inválida');
        }

        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: '' });

        let skippedByTask = 0;

        const formattedRows = rows
          .map(row => {
            const titulo = String(row['Título'] ?? row['Titulo'] ?? '').trim();
            if (!titulo) {
              return null;
            }

            const rawTaskId = String(row['Tarefa ID'] ?? '').trim();
            const rawTaskName = String(row['Tarefa Nome'] ?? '').trim();

            let resolvedTaskId = '';

            if (rawTaskId) {
              const matchById = tasks.find(task => task.id === rawTaskId);
              if (matchById) {
                resolvedTaskId = matchById.id;
              }
            }

            if (!resolvedTaskId && rawTaskName) {
              const normalizedName = normalize(rawTaskName);
              const matchByName = tasks.find(task => normalize(task.nome) === normalizedName);
              if (matchByName) {
                resolvedTaskId = matchByName.id;
              }
            }

            if (!resolvedTaskId) {
              skippedByTask += 1;
              return null;
            }

            const impactoList = String(row['Impacto'] ?? row['Impacto (separe por ;)'] ?? '')
              .split(/;|\n/)
              .map(item => item.trim())
              .filter(Boolean);

            const anexosList = String(row['Anexos (um por linha)'] ?? row['Anexos (um por linha ou ;)'] ?? '')
              .split(/\r?\n|;/)
              .map(item => item.trim())
              .filter(Boolean);

            const faturavel = parseBooleanCell(row['Faturável? (Sim/Não)'] ?? row['Faturável? (Gera cobrança adicional?)']);
            const necessitaAprovacao = parseBooleanCell(row['Necessita aprovação? (Sim/Não)'] ?? row['Necessita aprovação?']);

            const payload: Partial<GapFormData> = {
              task_id: resolvedTaskId,
              titulo,
              descricao: String(row['Descrição'] ?? '').trim() || null,
              tipo: String(row['Tipo de GAP'] ?? '').trim() || null,
              origem: String(row['Origem'] ?? '').trim() || null,
              severidade: String(row['Severidade'] ?? '').trim() || null,
              urgencia: String(row['Urgência'] ?? '').trim() || null,
              prioridade: String(row['Prioridade'] ?? '').trim() || null,
              status: String(row['Status do GAP'] ?? '').trim() || null,
              impacto: impactoList.length ? impactoList : null,
              faturavel: faturavel ?? null,
              valor_impacto_financeiro: parseCurrencyCell(row['Valor de Impacto Financeiro'] ?? ''),
              causa_raiz: String(row['Causa raiz'] ?? '').trim() || null,
              plano_acao: String(row['Plano de ação'] ?? '').trim() || null,
              responsavel: String(row['Responsável'] ?? '').trim() || null,
              data_prometida: parseExcelDate(row['Data prometida para tratativa']),
              data_prevista_solucao: parseExcelDate(row['Data prevista solução']),
              data_realizada_solucao: parseExcelDate(row['Data realizada solução']),
              necessita_aprovacao: necessitaAprovacao ?? null,
              decisao: String(row['Decisão'] ?? '').trim() || null,
              aprovado_por: String(row['Aprovado por'] ?? '').trim() || null,
              data_aprovacao: parseExcelDate(row['Data de aprovação']),
              impacto_financeiro_descricao: String(row['Impacto financeiro (descrição)'] ?? '').trim() || null,
              impacto_resumo: String(row['Resumo do impacto'] ?? '').trim() || null,
              anexos: anexosList.length ? anexosList : null,
              observacoes: String(row['Observações'] ?? '').trim() || null,
              percentual_previsto: parsePercentageCell(row['% Previsto']),
              percentual_planejado: parsePercentageCell(row['% Planejado']),
            };

            return payload;
          })
          .filter((row): row is Partial<GapFormData> => Boolean(row && row.task_id && row.titulo));

        if (formattedRows.length === 0) {
          toast({
            title: 'Nenhum dado válido encontrado',
            description: 'Verifique se a planilha segue o modelo de importação.',
            variant: 'destructive',
          });
          return;
        }

        let createdCount = 0;

        for (const row of formattedRows) {
          try {
            const result = await createGap(row);
            if (result) {
              createdCount += 1;
            }
          } catch (error) {
            console.error('Erro ao importar GAP', error);
          }
        }

        if (createdCount > 0) {
          toast({
            title: 'Importação concluída',
            description: `${createdCount} GAP(s) importados com sucesso.${
              skippedByTask ? ` ${skippedByTask} linha(s) ignoradas por falta de tarefa.` : ''
            }`,
          });
        } else {
          toast({
            title: 'Nenhum dado importado',
            description: skippedByTask
              ? 'Não foi possível localizar as tarefas informadas na planilha.'
              : 'Não foi possível importar os dados da planilha.',
            variant: 'destructive',
          });
        }
      } catch (error) {
        console.error('Erro ao importar planilha de GAPs', error);
        toast({
          title: 'Erro ao importar dados',
          description: 'Não foi possível ler a planilha informada.',
          variant: 'destructive',
        });
      } finally {
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        setIsImporting(false);
      }
    },
    [createGap, tasks, toast],
  );

  const handleExportData = useCallback(() => {
    if (filteredGaps.length === 0) {
      toast({
        title: 'Nenhum dado para exportar',
        description: 'Adicione registros antes de tentar exportar.',
      });
      return;
    }

    try {
      setIsExporting(true);
      const workbook = XLSX.utils.book_new();
      const header = exportColumns.map(column => column.label);
      const sheetData: (string | number)[][] = [];

      if (selectedTaskId === 'all') {
        const groups = new Map<string, Gap[]>();
        filteredGaps.forEach(gap => {
          const groupName = taskNameById[gap.task_id] ?? 'Sem tarefa';
          if (!groups.has(groupName)) {
            groups.set(groupName, []);
          }
          groups.get(groupName)!.push(gap);
        });

        Array.from(groups.entries()).forEach(([groupName, groupGaps], index) => {
          if (index > 0) {
            sheetData.push([]);
          }
          sheetData.push([groupName]);
          sheetData.push(header);
          groupGaps.forEach(gap => {
            sheetData.push(exportColumns.map(column => column.value(gap) ?? ''));
          });
        });
      } else {
        sheetData.push(header);
        filteredGaps.forEach(gap => {
          sheetData.push(exportColumns.map(column => column.value(gap) ?? ''));
        });
      }

      const worksheet = XLSX.utils.aoa_to_sheet(sheetData);
      XLSX.utils.book_append_sheet(workbook, worksheet, 'GAPs');

      const baseName = selectedTaskId === 'all' ? 'todos' : taskNameById[selectedTaskId] ?? selectedTaskId;
      const fileName = `gaps-${sanitizeFileName(baseName || 'export')}.xlsx`;

      XLSX.writeFile(workbook, fileName);

      toast({
        title: 'Exportação concluída',
        description: 'Os dados exibidos na grid foram exportados com sucesso.',
      });
    } catch (error) {
      console.error('Erro ao exportar GAPs', error);
      toast({
        title: 'Erro ao exportar dados',
        description: 'Não foi possível gerar o arquivo de exportação.',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  }, [exportColumns, filteredGaps, selectedTaskId, taskNameById, toast]);

  const openCreateDialog = (taskId?: string) => {
    const baseTaskId = taskId ?? (selectedTaskId !== 'all' ? selectedTaskId : '');
    setFormState({
      ...emptyForm,
      task_id: baseTaskId,
      impacto: [],
      faturavel: false,
      necessita_aprovacao: false,
    });
    setEditingGap(null);
    setIsDialogOpen(true);
  };

  const openEditDialog = useCallback((gap: Gap) => {
    setFormState({
      ...gap,
      impacto: Array.isArray(gap.impacto) ? gap.impacto : gap.impacto ? [...(gap.impacto as string[])] : [],
      anexosTexto: Array.isArray(gap.anexos) ? gap.anexos.join('\n') : '',
      valor_impacto_financeiro: gap.valor_impacto_financeiro ?? '',
      percentual_previsto: gap.percentual_previsto ?? '',
      percentual_planejado: gap.percentual_planejado ?? '',
      data_prevista_solucao: gap.data_prevista_solucao ?? '',
      data_realizada_solucao: gap.data_realizada_solucao ?? '',
    });
    setEditingGap(gap);
    setIsDialogOpen(true);
  }, []);

  const handleImpactToggle = (impact: string) => {
    setFormState(prev => {
      const current = new Set(prev.impacto ?? []);
      if (current.has(impact)) {
        current.delete(impact);
      } else {
        current.add(impact);
      }
      return { ...prev, impacto: Array.from(current) };
    });
  };

  const handleSubmit = async () => {
    if (!formState.task_id) {
      toast({
        title: 'Atenção',
        description: 'Selecione a tarefa vinculada ao GAP antes de salvar.',
        variant: 'destructive',
      });
      return;
    }

    if (!formState.titulo?.trim()) {
      toast({
        title: 'Atenção',
        description: 'Informe o título do GAP.',
        variant: 'destructive',
      });
      return;
    }

    const anexosArray = formState.anexosTexto
      ?.split('\n')
      .map(item => item.trim())
      .filter(Boolean);

    const payload: Partial<GapFormData> = {
      task_id: formState.task_id,
      titulo: formState.titulo?.trim(),
      descricao: formState.descricao?.trim() || null,
      tipo: formState.tipo?.trim() || null,
      origem: formState.origem?.trim() || null,
      severidade: formState.severidade?.trim() || null,
      urgencia: formState.urgencia?.trim() || null,
      prioridade: formState.prioridade?.trim() || null,
      impacto: (formState.impacto ?? []).length ? formState.impacto : null,
      faturavel: Boolean(formState.faturavel),
      valor_impacto_financeiro:
        formState.valor_impacto_financeiro === '' || formState.valor_impacto_financeiro === undefined
          ? null
          : Number(formState.valor_impacto_financeiro),
      causa_raiz: formState.causa_raiz?.trim() || null,
      plano_acao: formState.plano_acao?.trim() || null,
      responsavel: formState.responsavel?.trim() || null,
      data_prometida: formState.data_prometida || null,
      data_prevista_solucao: formState.data_prevista_solucao || null,
      data_realizada_solucao: formState.data_realizada_solucao || null,
      status: formState.status?.trim() || null,
      necessita_aprovacao: Boolean(formState.necessita_aprovacao),
      decisao: formState.decisao?.trim() || null,
      aprovado_por: formState.aprovado_por?.trim() || null,
      data_aprovacao: formState.data_aprovacao || null,
      anexos: anexosArray && anexosArray.length ? anexosArray : null,
      observacoes: formState.observacoes?.trim() || null,
      impacto_financeiro_descricao: formState.impacto_financeiro_descricao?.trim() || null,
      impacto_resumo: formState.impacto_resumo?.trim() || null,
      percentual_previsto: parsePercentageCell(formState.percentual_previsto ?? null),
      percentual_planejado: parsePercentageCell(formState.percentual_planejado ?? null),
    };

    setIsSaving(true);
    const result = editingGap
      ? await updateGap(editingGap.id, payload)
      : await createGap(payload);
    setIsSaving(false);

    if (result) {
      toast({
        title: editingGap ? 'GAP atualizado' : 'GAP criado',
        description: editingGap
          ? 'As informações do GAP foram atualizadas com sucesso.'
          : 'O GAP foi registrado com sucesso.',
      });
      setIsDialogOpen(false);
    }
  };

  const handleDelete = useCallback(
    async (gap: Gap) => {
      if (!confirm(`Deseja realmente remover o GAP "${gap.titulo}"?`)) return;
      const success = await deleteGap(gap.id);
      if (success && editingGap?.id === gap.id) {
        setIsDialogOpen(false);
      }
    },
    [deleteGap, editingGap],
  );

  const handleEnsureGap = async (taskId: string) => {
    const task = tasks.find(item => item.id === taskId);
    if (!task) return;
    const ensured = await ensureGapForTask(task);
    if (ensured) {
      toast({
        title: 'GAP gerado',
        description: 'Um GAP foi criado automaticamente para a tarefa fora de escopo.',
      });
    }
  };

  const tableColumns = useMemo<GapColumn[]>(
    () => [
      ...gapColumns,
      {
        key: 'acoes',
        label: 'Ações',
        minWidth: 200,
        render: gap => (
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => openEditDialog(gap)}
              aria-label="Editar GAP"
            >
              <ClipboardEdit className="mr-2 h-4 w-4" />
              Editar
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="border-destructive text-destructive hover:bg-destructive/10"
              onClick={() => handleDelete(gap)}
              aria-label="Excluir GAP"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Remover
            </Button>
          </div>
        ),
      },
    ],
    [gapColumns, handleDelete, openEditDialog],
  );

  const selectedTaskHasGap = selectedTaskId === 'all'
    ? false
    : gaps.some(gap => gap.task_id === selectedTaskId);

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col gap-4 overflow-hidden">
      <input
        ref={fileInputRef}
        type="file"
        accept=".xls,.xlsx"
        className="hidden"
        onChange={handleFileChange}
      />
      <Card className="flex min-h-0 min-w-0 w-full flex-1 flex-col overflow-hidden rounded-3xl border-border/80">
        <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <CardTitle>Gestão de GAPs</CardTitle>
            <CardDescription>
              Registre lacunas identificadas no projeto, acompanhe planos de ação e mantenha o histórico de decisões.
            </CardDescription>
          </div>
          <div className="flex w-full flex-col gap-3 lg:w-auto lg:flex-row lg:items-center">
            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Filtrar por tarefa</span>
              <Select value={selectedTaskId} onValueChange={value => setSelectedTaskId(value)}>
                <SelectTrigger className="w-full min-w-[240px]">
                  <SelectValue placeholder="Todas as tarefas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as tarefas</SelectItem>
                  {tasksOptions.map(task => (
                    <SelectItem key={task.id} value={task.id}>
                      {task.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
              {selectedTaskId !== 'all' && !selectedTaskHasGap ? (
                <Button variant="outline" onClick={() => handleEnsureGap(selectedTaskId)}>
                  <CheckCircle2 className="mr-2 h-4 w-4" /> Gerar GAP automático
                </Button>
              ) : null}
              <Button
                variant="outline"
                onClick={handleExportData}
                disabled={isExporting || filteredGaps.length === 0}
              >
                <Download className="mr-2 h-4 w-4" />
                {isExporting ? 'Exportando...' : 'Exportar dados'}
              </Button>
              <Button
                variant="outline"
                onClick={handleExportTemplate}
                disabled={isExportingTemplate}
              >
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                {isExportingTemplate ? 'Gerando modelo...' : 'Exportar modelo'}
              </Button>
              <Button
                variant="outline"
                onClick={handleImportData}
                disabled={isImporting}
              >
                <Upload className="mr-2 h-4 w-4" />
                {isImporting ? 'Importando...' : 'Incluir dados'}
              </Button>
              <Button onClick={() => openCreateDialog(selectedTaskId !== 'all' ? selectedTaskId : undefined)}>
                <FilePlus2 className="mr-2 h-4 w-4" /> Novo GAP
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-1 min-h-0 min-w-0 flex-col gap-4 overflow-hidden bg-background pt-4">
          <div className="relative min-h-0 min-w-0 w-full flex-1 overflow-hidden rounded-2xl border border-border/60">
            <div className="h-full w-full overflow-auto">
              <Table className="min-w-max text-[10px]">
                <TableHeader className="sticky top-0 z-20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/75">
                  <TableRow className="h-10">
                    {tableColumns.map(column => (
                      <TableHead
                        key={column.key}
                        className="border-b border-border/60 bg-transparent px-3 py-2 text-left font-semibold uppercase tracking-wide text-muted-foreground"
                        style={column.minWidth ? { minWidth: `${column.minWidth}px` } : undefined}
                      >
                        {column.label}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={tableColumns.length} className="py-8 text-center text-[10px] text-muted-foreground">
                        <div className="flex items-center justify-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Carregando registros de GAP...
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : filteredGaps.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={tableColumns.length} className="py-8 text-center text-[10px] text-muted-foreground">
                        Nenhum GAP registrado para o filtro selecionado.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredGaps.map((gap, index) => {
                      const highlight = highlightTaskId && gap.task_id === highlightTaskId;
                      const isZebra = index % 2 === 1;

                      return (
                        <TableRow
                          key={gap.id}
                          className={cn(
                            'group border-border/60 text-[10px] transition-colors',
                            highlight
                              ? 'bg-primary/10 hover:bg-primary/20'
                              : isZebra
                                ? 'bg-muted/30 hover:bg-muted/40'
                                : 'bg-background hover:bg-muted/40',
                          )}
                        >
                          {tableColumns.map((column, columnIndex) => (
                            <TableCell
                              key={`${gap.id}-${column.key}`}
                              className={cn(
                                'border-x border-border/60 px-3 py-2 align-top text-[10px]',
                                column.cellClassName,
                                highlight && columnIndex === 0 ? 'border-l-4 border-l-primary/40' : undefined,
                              )}
                              style={column.minWidth ? { minWidth: `${column.minWidth}px` } : undefined}
                            >
                              {column.render(gap)}
                            </TableCell>
                          ))}
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-hidden sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>{editingGap ? 'Editar GAP' : 'Novo GAP'}</DialogTitle>
            <DialogDescription>
              Preencha os campos abaixo para registrar a lacuna identificada e definir o plano de tratamento.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[65vh] pr-4">
            <div className="py-2">
              <div className="grid gap-4 md:grid-cols-12 xl:gap-5">
                <div className="space-y-2 md:col-span-6 xl:col-span-4">
                  <label className="text-sm font-semibold text-muted-foreground">Tarefa vinculada</label>
                  <Select
                    value={formState.task_id || ''}
                    onValueChange={value => setFormState(prev => ({ ...prev, task_id: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a tarefa" />
                    </SelectTrigger>
                    <SelectContent>
                      {tasksOptions.map(task => (
                        <SelectItem key={task.id} value={task.id}>
                          {task.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 md:col-span-6 xl:col-span-8">
                  <label className="text-sm font-semibold text-muted-foreground">Título</label>
                  <Input
                    value={formState.titulo || ''}
                    onChange={event => setFormState(prev => ({ ...prev, titulo: event.target.value }))}
                    placeholder="Resumo do GAP"
                  />
                </div>
                <div className="space-y-2 md:col-span-12">
                  <label className="text-sm font-semibold text-muted-foreground">Descrição</label>
                  <Textarea
                    value={formState.descricao || ''}
                    onChange={event => setFormState(prev => ({ ...prev, descricao: event.target.value }))}
                    placeholder="Detalhe o GAP identificado..."
                    className="min-h-[120px]"
                  />
                </div>
                <div className="space-y-2 md:col-span-4 xl:col-span-3">
                  <label className="text-sm font-semibold text-muted-foreground">Tipo de GAP</label>
                  <Input
                    value={formState.tipo || ''}
                    onChange={event => setFormState(prev => ({ ...prev, tipo: event.target.value }))}
                    placeholder="Processo, Sistema..."
                  />
                </div>
                <div className="space-y-2 md:col-span-4 xl:col-span-3">
                  <label className="text-sm font-semibold text-muted-foreground">Origem</label>
                  <Input
                    value={formState.origem || ''}
                    onChange={event => setFormState(prev => ({ ...prev, origem: event.target.value }))}
                    placeholder="Cliente, Interno..."
                  />
                </div>
                <div className="space-y-2 md:col-span-4 xl:col-span-3">
                  <label className="text-sm font-semibold text-muted-foreground">Severidade</label>
                  <Input
                    value={formState.severidade || ''}
                    onChange={event => setFormState(prev => ({ ...prev, severidade: event.target.value }))}
                    placeholder="Baixa, Média, Alta..."
                  />
                </div>
                <div className="space-y-2 md:col-span-4 xl:col-span-3">
                  <label className="text-sm font-semibold text-muted-foreground">Urgência</label>
                  <Input
                    value={formState.urgencia || ''}
                    onChange={event => setFormState(prev => ({ ...prev, urgencia: event.target.value }))}
                    placeholder="Imediata, Breve..."
                  />
                </div>
                <div className="space-y-2 md:col-span-4 xl:col-span-3">
                  <label className="text-sm font-semibold text-muted-foreground">Prioridade</label>
                  <Input
                    value={formState.prioridade || ''}
                    onChange={event => setFormState(prev => ({ ...prev, prioridade: event.target.value }))}
                    placeholder="Baixa, Média, Alta..."
                  />
                </div>
                <div className="space-y-2 md:col-span-4 xl:col-span-3">
                  <label className="text-sm font-semibold text-muted-foreground">Status do GAP</label>
                  <Input
                    value={formState.status || ''}
                    onChange={event => setFormState(prev => ({ ...prev, status: event.target.value }))}
                    placeholder="Aberto, Em análise..."
                  />
                </div>
                <div className="space-y-2 md:col-span-12">
                  <label className="text-sm font-semibold text-muted-foreground">Impacto</label>
                  <div className="flex flex-wrap gap-2">
                    {IMPACT_OPTIONS.map(option => {
                      const checked = formState.impacto?.includes(option) ?? false;
                      return (
                        <Button
                          key={option}
                          type="button"
                          variant={checked ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => handleImpactToggle(option)}
                        >
                          {option}
                        </Button>
                      );
                    })}
                  </div>
                </div>
                <div className="space-y-2 md:col-span-6 xl:col-span-4">
                  <label className="text-sm font-semibold text-muted-foreground">Faturável?</label>
                  <div className="flex items-center justify-between rounded-md border border-dashed border-muted px-3 py-2">
                    <span className="text-sm text-muted-foreground">Este GAP gera cobrança adicional?</span>
                    <Switch
                      checked={Boolean(formState.faturavel)}
                      onCheckedChange={checked => setFormState(prev => ({ ...prev, faturavel: checked }))}
                    />
                  </div>
                </div>
                <div className="space-y-2 md:col-span-6 xl:col-span-4">
                  <label className="text-sm font-semibold text-muted-foreground">Valor de Impacto Financeiro</label>
                  <CurrencyInput
                    value={formState.valor_impacto_financeiro ?? ''}
                    onChange={value => setFormState(prev => ({ ...prev, valor_impacto_financeiro: value }))}
                    placeholder="R$ 0,00"
                  />
                </div>
                <div className="space-y-2 md:col-span-6 xl:col-span-4">
                  <label className="text-sm font-semibold text-muted-foreground">% Previsto</label>
                  <PercentageInput
                    value={formState.percentual_previsto ?? ''}
                    onChange={value => setFormState(prev => ({ ...prev, percentual_previsto: value }))}
                    placeholder="0%"
                  />
                </div>
                <div className="space-y-2 md:col-span-6 xl:col-span-4">
                  <label className="text-sm font-semibold text-muted-foreground">% Planejado</label>
                  <PercentageInput
                    value={formState.percentual_planejado ?? ''}
                    onChange={value => setFormState(prev => ({ ...prev, percentual_planejado: value }))}
                    placeholder="0%"
                  />
                </div>
                <div className="space-y-2 md:col-span-6 xl:col-span-6">
                  <label className="text-sm font-semibold text-muted-foreground">Causa raiz</label>
                  <Textarea
                    value={formState.causa_raiz || ''}
                    onChange={event => setFormState(prev => ({ ...prev, causa_raiz: event.target.value }))}
                    placeholder="Explique a causa principal identificada..."
                  />
                </div>
                <div className="space-y-2 md:col-span-6 xl:col-span-6">
                  <label className="text-sm font-semibold text-muted-foreground">Plano de ação</label>
                  <Textarea
                    value={formState.plano_acao || ''}
                    onChange={event => setFormState(prev => ({ ...prev, plano_acao: event.target.value }))}
                    placeholder="Defina as ações necessárias..."
                  />
                </div>
                <div className="space-y-2 md:col-span-6 xl:col-span-4">
                  <label className="text-sm font-semibold text-muted-foreground">Responsável</label>
                  <Input
                    value={formState.responsavel || ''}
                    onChange={event => setFormState(prev => ({ ...prev, responsavel: event.target.value }))}
                    placeholder="Nome do responsável"
                  />
                </div>
                <div className="space-y-2 md:col-span-6 xl:col-span-4">
                  <label className="text-sm font-semibold text-muted-foreground">Data prometida para tratativa</label>
                  <DateInput
                    value={formState.data_prometida || ''}
                    onChange={value => setFormState(prev => ({ ...prev, data_prometida: value }))}
                  />
                </div>
                <div className="space-y-2 md:col-span-6 xl:col-span-4">
                  <label className="text-sm font-semibold text-muted-foreground">Data prevista solução</label>
                  <DateInput
                    value={formState.data_prevista_solucao || ''}
                    onChange={value => setFormState(prev => ({ ...prev, data_prevista_solucao: value }))}
                  />
                </div>
                <div className="space-y-2 md:col-span-6 xl:col-span-4">
                  <label className="text-sm font-semibold text-muted-foreground">Data realizada solução</label>
                  <DateInput
                    value={formState.data_realizada_solucao || ''}
                    onChange={value => setFormState(prev => ({ ...prev, data_realizada_solucao: value }))}
                  />
                </div>
                <div className="space-y-2 md:col-span-6 xl:col-span-4">
                  <label className="text-sm font-semibold text-muted-foreground">Necessita aprovação?</label>
                  <div className="flex items-center justify-between rounded-md border border-dashed border-muted px-3 py-2">
                    <span className="text-sm text-muted-foreground">Indica se o GAP exige aprovação formal.</span>
                    <Switch
                      checked={Boolean(formState.necessita_aprovacao)}
                      onCheckedChange={checked => setFormState(prev => ({ ...prev, necessita_aprovacao: checked }))}
                    />
                  </div>
                </div>
                <div className="space-y-2 md:col-span-6 xl:col-span-8">
                  <label className="text-sm font-semibold text-muted-foreground">Decisão</label>
                  <Textarea
                    value={formState.decisao || ''}
                    onChange={event => setFormState(prev => ({ ...prev, decisao: event.target.value }))}
                    placeholder="Resumo da decisão tomada"
                  />
                </div>
                <div className="space-y-2 md:col-span-6 xl:col-span-4">
                  <label className="text-sm font-semibold text-muted-foreground">Aprovado por</label>
                  <Input
                    value={formState.aprovado_por || ''}
                    onChange={event => setFormState(prev => ({ ...prev, aprovado_por: event.target.value }))}
                    placeholder="Nome do aprovador"
                  />
                </div>
                <div className="space-y-2 md:col-span-6 xl:col-span-4">
                  <label className="text-sm font-semibold text-muted-foreground">Data de aprovação</label>
                  <DateInput
                    value={formState.data_aprovacao || ''}
                    onChange={value => setFormState(prev => ({ ...prev, data_aprovacao: value }))}
                  />
                </div>
                <div className="space-y-2 md:col-span-6 xl:col-span-6">
                  <label className="text-sm font-semibold text-muted-foreground">Impacto financeiro (descrição)</label>
                  <Textarea
                    value={formState.impacto_financeiro_descricao || ''}
                    onChange={event => setFormState(prev => ({ ...prev, impacto_financeiro_descricao: event.target.value }))}
                    placeholder="Descreva como o GAP impacta financeiramente o projeto"
                  />
                </div>
                <div className="space-y-2 md:col-span-6 xl:col-span-6">
                  <label className="text-sm font-semibold text-muted-foreground">Resumo do impacto</label>
                  <Textarea
                    value={formState.impacto_resumo || ''}
                    onChange={event => setFormState(prev => ({ ...prev, impacto_resumo: event.target.value }))}
                    placeholder="Resumo executivo do impacto"
                  />
                </div>
                <div className="space-y-2 md:col-span-12">
                  <label className="text-sm font-semibold text-muted-foreground">Anexos (um por linha)</label>
                  <Textarea
                    value={formState.anexosTexto || ''}
                    onChange={event => setFormState(prev => ({ ...prev, anexosTexto: event.target.value }))}
                    placeholder="Cole URLs ou descrições de anexos, um por linha"
                    className="min-h-[120px]"
                  />
                </div>
                <div className="space-y-2 md:col-span-12">
                  <label className="text-sm font-semibold text-muted-foreground">Observações</label>
                  <Textarea
                    value={formState.observacoes || ''}
                    onChange={event => setFormState(prev => ({ ...prev, observacoes: event.target.value }))}
                    placeholder="Informações adicionais relevantes"
                    className="min-h-[100px]"
                  />
                </div>
              </div>
            </div>
          </ScrollArea>
          <DialogFooter className="gap-2">
            {editingGap ? (
              <Button
                type="button"
                variant="destructive"
                onClick={() => handleDelete(editingGap)}
                disabled={isSaving}
              >
                <Trash2 className="mr-2 h-4 w-4" /> Excluir
              </Button>
            ) : null}
            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isSaving}>
              Cancelar
            </Button>
            <Button type="button" onClick={handleSubmit} disabled={isSaving}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Salvar GAP
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
