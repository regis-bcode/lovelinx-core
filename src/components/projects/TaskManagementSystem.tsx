import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import type { ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CurrencyInput } from '@/components/ui/currency-input';
import { PercentageInput } from '@/components/ui/percentage-input';
import { DatePicker } from '@/components/ui/date-picker';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CreatableSelect } from '@/components/ui/creatable-select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { SortModal } from '@/components/sort/SortModal';
import { HeaderSortBadge } from '@/components/sort/HeaderSortBadge';
import {
  Settings,
  Save,
  Trash2,
  PlusCircle,
  PlusSquare,
  Type,
  Hash,
  Percent,
  Coins,
  ListChecks,
  Tags,
  CheckSquare,
  Pencil,
  Eye,
  Table as TableIcon,
  GanttChart,
  Loader2,
  Play,
  Square,
  FileWarning,
  ChevronDown,
  ChevronRight,
  Download,
  Upload,
  History,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { TaskGanttView } from '@/components/projects/TaskGanttView';
import { CustomField, Task, TaskFormData } from '@/types/task';
import type { Status } from '@/types/status';
import type { TAP } from '@/types/tap';
import {
  useTasks,
  canStartTimer,
  resolveResponsibleUserId,
  startTimer as startTaskTimer,
  stopTimer as stopTaskTimer,
  sumDailyMinutes,
  getTaskById,
  insertTask,
  updateTaskRecord,
  type TaskInsertPayload,
  type TasksRow,
} from '@/hooks/useTasks';
import { useTAP } from '@/hooks/useTAP';
import { useStatus } from '@/hooks/useStatus';
import { useModulos } from '@/hooks/useModulos';
import { useAreas } from '@/hooks/useAreas';
import { useCategorias } from '@/hooks/useCategorias';
import { useTimeLogs } from '@/hooks/useTimeLogs';
import { notifyProjectActiveTimersChange } from '@/hooks/useProjectActiveTimersIndicator';
import { useUserRoles } from '@/hooks/useUserRoles';
import { useToast } from '@/hooks/use-toast';
import { useProjectAllocations } from '@/hooks/useProjectAllocations';
import { useProjectStages } from '@/hooks/useProjectStages';
import { useGaps } from '@/hooks/useGaps';
import { useAuth } from '@/contexts/AuthContext';
import { useMultiSort } from '@/hooks/useMultiSort';
import type { SortDirection } from '@/hooks/useMultiSort';
import { multiSort } from '@/utils/multiSort';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { getStatusColorValue } from '@/lib/status-colors';
import {
  areActiveTimerRecordsEqual,
  persistActiveTimerRecord,
  readActiveTimerRecord,
  sanitizeActiveTimerRecord,
  type ActiveTimerRecord,
} from '@/lib/active-timers';
import { getStartTimerButtonState, hasAssignedResponsible } from './taskActionGuards';
import type { PostgrestError } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useForm, type Resolver } from 'react-hook-form';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

interface TaskManagementSystemProps {
  projectId: string;
  projectClient?: string;
}

type TaskRow = Partial<Task> & { _isNew?: boolean; isDraft?: boolean; _tempId?: string };

type ColumnDefinition =
  | {
      key: string;
      label: string;
      width?: string;
      isCustom?: false;
    }
  | {
      key: string;
      label: string;
      width?: string;
      isCustom: true;
      field: CustomField;
    };

type GroupByKey =
  | ''
  | 'responsavel'
  | 'prioridade'
  | 'status'
  | 'cliente'
  | 'modulo'
  | 'area'
  | 'percentualConclusao'
  | 'vencimento';

type GroupedTask = {
  key: string;
  value: string;
  count: number;
  items: TaskRow[];
};

type ResponsibleTimeSummary = {
  label: string;
  seconds: number;
  minutes: number;
  formatted: string;
  isActive: boolean;
};

const GROUP_BY_STORAGE_KEY = 'task-grid.groupBy';
const EXPANDED_GROUPS_STORAGE_PREFIX = 'task-grid.expanded.';

const GROUP_LABELS: Record<Exclude<GroupByKey, ''>, string> = {
  responsavel: 'Responsável',
  prioridade: 'Prioridade',
  status: 'Status',
  cliente: 'Cliente',
  modulo: 'Módulo',
  area: 'Área',
  percentualConclusao: '% Conclusão',
  vencimento: 'Vencimento',
};

const GROUP_BY_OPTIONS: GroupByKey[] = [
  '',
  'responsavel',
  'prioridade',
  'status',
  'cliente',
  'modulo',
  'area',
  'percentualConclusao',
  'vencimento',
];

const PERCENTUAL_BUCKETS = ['0%', '1–25%', '26–50%', '51–75%', '76–99%', '100%'] as const;
const PERCENTUAL_BUCKET_INDEX = new Map<string, number>(
  PERCENTUAL_BUCKETS.map((bucket, index) => [bucket, index])
);

const EMPTY_GROUP_VALUE = '__empty__';
const NO_DUE_DATE_VALUE = '__no_due__';

const TASK_TABLE_PREFERENCES_VERSION = 4;
const TASK_SORT_STORAGE_KEY = 'task-grid:sortRules';

const DEFAULT_SORT_DIRECTIONS: Partial<Record<string, SortDirection>> = {
  data_inicio: 'desc',
  data_vencimento: 'desc',
  percentual_conclusao: 'desc',
};

const PRIORITY_WEIGHTS: Record<string, number> = {
  baixa: 0,
  media: 1,
  média: 1,
  alta: 2,
  critica: 3,
  crítica: 3,
};

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type NullableString = string | null;

type TaskDialogFormValues = {
  id: NullableString;
  project_id: string;
  user_id: NullableString;
  task_id: string;
  nome: string;
  responsavel: NullableString;
  responsavel_cliente: NullableString;
  responsavel_consultoria: NullableString;
  responsavel_ticket: NullableString;
  prioridade: NullableString;
  status: NullableString;
  status_ticket: NullableString;
  cliente: NullableString;
  modulo: NullableString;
  area: NullableString;
  categoria: NullableString;
  etapa_projeto: NullableString;
  sub_etapa_projeto: NullableString;
  descricao_detalhada: NullableString;
  retorno_acao: NullableString;
  acao_realizada: NullableString;
  descricao_ticket: NullableString;
  numero_ticket: NullableString;
  data_inicio: NullableString;
  data_vencimento: NullableString;
  data_entrega: NullableString;
  data_prevista_entrega: NullableString;
  data_prevista_validacao: NullableString;
  dias_para_concluir: number | null;
  percentual_conclusao: number | null;
  tempo_total: number;
  cronograma: boolean;
  link: NullableString;
  link_drive: NullableString;
  validado_por: NullableString;
  escopo: NullableString;
  custom_fields: NullableString;
  created_at: NullableString;
  updated_at: NullableString;
};

const coerceOptionalNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const coerceNonNegativeNumber = (value: unknown, fallback = 0): number => {
  const parsed = coerceOptionalNumber(value);
  if (parsed === null) {
    return Math.max(0, fallback);
  }

  return Math.max(0, parsed);
};

const taskDialogResolver: Resolver<TaskDialogFormValues> = async values => {
  const errors: Record<string, { type: string; message: string }> = {};

  const projectId = typeof values.project_id === 'string' ? values.project_id.trim() : '';
  const taskId = typeof values.task_id === 'string' ? values.task_id.trim() : '';
  const nome = typeof values.nome === 'string' ? values.nome.trim() : '';

  const diasParaConcluir = coerceOptionalNumber(values.dias_para_concluir);
  const percentualConclusao = coerceOptionalNumber(values.percentual_conclusao);
  const tempoTotal = coerceNonNegativeNumber(values.tempo_total, 0);

  if (!projectId) {
    errors.project_id = { type: 'required', message: 'Projeto obrigatório' };
  } else if (!UUID_REGEX.test(projectId)) {
    errors.project_id = { type: 'pattern', message: 'Projeto inválido' };
  }

  if (!taskId) {
    errors.task_id = { type: 'min', message: 'Código da tarefa é obrigatório' };
  }

  if (!nome) {
    errors.nome = { type: 'min', message: 'Nome da tarefa é obrigatório' };
  }

  if (percentualConclusao !== null && (percentualConclusao < 0 || percentualConclusao > 100)) {
    errors.percentual_conclusao = {
      type: 'validate',
      message: 'O percentual deve estar entre 0 e 100',
    };
  }

  const sanitizedValues: TaskDialogFormValues = {
    ...values,
    project_id: projectId,
    task_id: taskId,
    nome,
    dias_para_concluir: diasParaConcluir,
    percentual_conclusao:
      percentualConclusao === null || percentualConclusao === undefined
        ? null
        : Math.min(Math.max(percentualConclusao, 0), 100),
    tempo_total: tempoTotal,
  };

  return {
    values: Object.keys(errors).length ? {} : sanitizedValues,
    errors,
  };
};

type TaskDialogFieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'date'
  | 'boolean'
  | 'json'
  | 'datetime';

type TaskDialogField = {
  name: keyof TaskDialogFormValues;
  label: string;
  type: TaskDialogFieldType;
  readOnly?: boolean;
};

const TASK_DIALOG_FIELDS: TaskDialogField[] = [
  { name: 'task_id', label: 'Código da tarefa', type: 'text', readOnly: true },
  { name: 'nome', label: 'Nome', type: 'text' },
  { name: 'responsavel', label: 'Responsável', type: 'text' },
  { name: 'responsavel_cliente', label: 'Responsável (Cliente)', type: 'text' },
  { name: 'responsavel_consultoria', label: 'Responsável (Consultoria)', type: 'text' },
  { name: 'responsavel_ticket', label: 'Responsável (Ticket)', type: 'text' },
  { name: 'user_id', label: 'Usuário Vinculado', type: 'text' },
  { name: 'project_id', label: 'Projeto', type: 'text', readOnly: true },
  { name: 'prioridade', label: 'Prioridade', type: 'text' },
  { name: 'status', label: 'Status', type: 'text' },
  { name: 'status_ticket', label: 'Status do Ticket', type: 'text' },
  { name: 'cliente', label: 'Cliente', type: 'text' },
  { name: 'modulo', label: 'Módulo', type: 'text' },
  { name: 'area', label: 'Área', type: 'text' },
  { name: 'categoria', label: 'Categoria', type: 'text' },
  { name: 'etapa_projeto', label: 'Etapa do Projeto', type: 'text' },
  { name: 'sub_etapa_projeto', label: 'Sub-etapa do Projeto', type: 'text' },
  { name: 'descricao_detalhada', label: 'Descrição Detalhada', type: 'textarea' },
  { name: 'retorno_acao', label: 'Retorno da Ação', type: 'textarea' },
  { name: 'acao_realizada', label: 'Ação Realizada', type: 'textarea' },
  { name: 'descricao_ticket', label: 'Descrição do Ticket', type: 'textarea' },
  { name: 'numero_ticket', label: 'Número do Ticket', type: 'text' },
  { name: 'data_inicio', label: 'Data de Início', type: 'date' },
  { name: 'data_vencimento', label: 'Data de Vencimento', type: 'date' },
  { name: 'data_entrega', label: 'Data de Entrega', type: 'date' },
  { name: 'data_prevista_entrega', label: 'Data Prevista de Entrega', type: 'date' },
  { name: 'data_prevista_validacao', label: 'Data Prevista de Validação', type: 'date' },
  { name: 'dias_para_concluir', label: 'Dias para Concluir', type: 'number' },
  { name: 'percentual_conclusao', label: '% Conclusão', type: 'number' },
  { name: 'tempo_total', label: 'Tempo Total (min)', type: 'number', readOnly: true },
  { name: 'cronograma', label: 'Cronograma', type: 'boolean' },
  { name: 'link', label: 'Link', type: 'text' },
  { name: 'link_drive', label: 'Link Drive', type: 'text' },
  { name: 'validado_por', label: 'Validado por', type: 'text' },
  { name: 'escopo', label: 'Escopo', type: 'textarea' },
  { name: 'custom_fields', label: 'Campos Personalizados (JSON)', type: 'json' },
  { name: 'created_at', label: 'Criado em', type: 'datetime', readOnly: true },
  { name: 'updated_at', label: 'Atualizado em', type: 'datetime', readOnly: true },
];

const sanitizeStringField = (value?: string | null) => {
  if (value === undefined || value === null) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const formatDateForInput = (value?: string | null) => {
  if (!value) {
    return '';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value.slice(0, 10);
  }

  return format(parsed, 'yyyy-MM-dd');
};

const formatDateTimeForDisplay = (value?: string | null) => {
  if (!value) {
    return '';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return format(parsed, 'dd/MM/yyyy HH:mm');
};

const mapTaskToDialogValues = (task: TasksRow): TaskDialogFormValues => ({
  id: task.id,
  project_id: task.project_id,
  user_id: task.user_id ?? null,
  task_id: task.task_id ?? '',
  nome: task.nome ?? '',
  responsavel: task.responsavel ?? null,
  responsavel_cliente: task.responsavel_cliente ?? null,
  responsavel_consultoria: task.responsavel_consultoria ?? null,
  responsavel_ticket: task.responsavel_ticket ?? null,
  prioridade: task.prioridade ?? null,
  status: task.status ?? null,
  status_ticket: task.status_ticket ?? null,
  cliente: task.cliente ?? null,
  modulo: task.modulo ?? null,
  area: task.area ?? null,
  categoria: task.categoria ?? null,
  etapa_projeto: task.etapa_projeto ?? null,
  sub_etapa_projeto: task.sub_etapa_projeto ?? null,
  descricao_detalhada: task.descricao_detalhada ?? null,
  retorno_acao: task.retorno_acao ?? null,
  acao_realizada: task.acao_realizada ?? null,
  descricao_ticket: task.descricao_ticket ?? null,
  numero_ticket: task.numero_ticket ?? null,
  data_inicio: task.data_inicio ?? null,
  data_vencimento: task.data_vencimento ?? null,
  data_entrega: task.data_entrega ?? null,
  data_prevista_entrega: task.data_prevista_entrega ?? null,
  data_prevista_validacao: task.data_prevista_validacao ?? null,
  dias_para_concluir: task.dias_para_concluir ?? null,
  percentual_conclusao: task.percentual_conclusao ?? null,
  tempo_total: task.tempo_total ?? 0,
  cronograma: Boolean(task.cronograma),
  link: task.link ?? null,
  link_drive: task.link_drive ?? null,
  validado_por: task.validado_por ?? null,
  escopo: task.escopo ?? null,
  custom_fields: task.custom_fields ? JSON.stringify(task.custom_fields, null, 2) : null,
  created_at: task.created_at ?? null,
  updated_at: task.updated_at ?? null,
});

class CustomFieldsParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CustomFieldsParseError';
  }
}

interface CustomFieldsParseResult {
  parsed: Record<string, unknown> | null;
  error: CustomFieldsParseError | null;
}

const parseCustomFields = (value: string | null | undefined): CustomFieldsParseResult => {
  if (!value || value.trim().length === 0) {
    return { parsed: null, error: null };
  }

  try {
    const parsed = JSON.parse(value) as unknown;

    if (parsed === null) {
      return { parsed: null, error: null };
    }

    if (typeof parsed === 'object' && !Array.isArray(parsed)) {
      return { parsed: parsed as Record<string, unknown>, error: null };
    }

    const typeDescription = Array.isArray(parsed) ? 'um array' : typeof parsed;
    return {
      parsed: null,
      error: new CustomFieldsParseError(
        `Os campos personalizados devem ser um objeto JSON. Valor recebido é ${typeDescription}.`,
      ),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Falha ao interpretar campos personalizados da tarefa:', message);
    return {
      parsed: null,
      error: new CustomFieldsParseError('JSON inválido nos campos personalizados.'),
    };
  }
};

const buildTaskPatchFromFormValues = (values: TaskDialogFormValues): Partial<TasksRow> => {
  const toDateValue = (raw?: string | null) => {
    if (!raw) {
      return null;
    }
    const trimmed = raw.trim();
    return trimmed.length > 0 ? trimmed : null;
  };

  const toNumberValue = (raw?: number | null) => {
    if (raw === null || raw === undefined) {
      return null;
    }
    return Number.isFinite(raw) ? raw : null;
  };

  return {
    project_id: values.project_id,
    user_id: sanitizeStringField(values.user_id ?? null),
    task_id: values.task_id.trim(),
    nome: values.nome.trim(),
    responsavel: sanitizeStringField(values.responsavel ?? null),
    responsavel_cliente: sanitizeStringField(values.responsavel_cliente ?? null),
    responsavel_consultoria: sanitizeStringField(values.responsavel_consultoria ?? null),
    responsavel_ticket: sanitizeStringField(values.responsavel_ticket ?? null),
    prioridade: sanitizeStringField(values.prioridade ?? null),
    status: sanitizeStringField(values.status ?? null) ?? 'Atenção',
    status_ticket: sanitizeStringField(values.status_ticket ?? null),
    cliente: sanitizeStringField(values.cliente ?? null),
    modulo: sanitizeStringField(values.modulo ?? null),
    area: sanitizeStringField(values.area ?? null),
    categoria: sanitizeStringField(values.categoria ?? null),
    etapa_projeto: sanitizeStringField(values.etapa_projeto ?? null),
    sub_etapa_projeto: sanitizeStringField(values.sub_etapa_projeto ?? null),
    descricao_detalhada: sanitizeStringField(values.descricao_detalhada ?? null),
    retorno_acao: sanitizeStringField(values.retorno_acao ?? null),
    acao_realizada: sanitizeStringField(values.acao_realizada ?? null),
    descricao_ticket: sanitizeStringField(values.descricao_ticket ?? null),
    numero_ticket: sanitizeStringField(values.numero_ticket ?? null),
    data_inicio: toDateValue(values.data_inicio),
    data_vencimento: toDateValue(values.data_vencimento),
    data_entrega: toDateValue(values.data_entrega),
    data_prevista_entrega: toDateValue(values.data_prevista_entrega),
    data_prevista_validacao: toDateValue(values.data_prevista_validacao),
    dias_para_concluir: toNumberValue(values.dias_para_concluir ?? null),
    percentual_conclusao: toNumberValue(values.percentual_conclusao ?? null),
    tempo_total: Number.isFinite(values.tempo_total) ? values.tempo_total : 0,
    cronograma: Boolean(values.cronograma),
    link: sanitizeStringField(values.link ?? null),
    link_drive: sanitizeStringField(values.link_drive ?? null),
    validado_por: sanitizeStringField(values.validado_por ?? null),
    escopo: sanitizeStringField(values.escopo ?? null),
    custom_fields: (() => {
      const { parsed, error } = parseCustomFields(values.custom_fields ?? null);
      if (error) {
        throw error;
      }
      return parsed;
    })(),
  };
};

// Ajuste este conjunto conforme as colunas que podem ser ordenadas no seu grid.
const SORTABLE_COLUMN_KEYS = new Set<string>([
  'task_id',
  'tarefa',
  'prioridade',
  'status',
  'cliente',
  'responsavel',
  'data_inicio',
  'data_vencimento',
  'descricao_tarefa',
  'solucao',
  'percentual_conclusao',
  'tempo_total',
  'modulo',
  'area',
  'categoria',
  'etapa_projeto',
  'sub_etapa_projeto',
  'criticidade',
  'escopo',
  'cronograma',
]);

const normalizePriorityWeight = (value: unknown): number => {
  if (typeof value !== 'string') {
    return Number.POSITIVE_INFINITY;
  }
  const normalized = value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
  return PRIORITY_WEIGHTS[normalized] ?? Number.POSITIVE_INFINITY;
};

const normalizeTextValue = (value?: string | null) => {
  const trimmed = typeof value === 'string' ? value.trim() : '';
  if (!trimmed) {
    return { value: EMPTY_GROUP_VALUE, label: '—', sortValue: '~~~~' } as const;
  }

  const normalized = trimmed.toLowerCase();
  const sortValue = trimmed.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

  return { value: normalized, label: trimmed, sortValue } as const;
};

const normalizePercentualConclusao = (value: unknown) => {
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric)) {
    return {
      value: EMPTY_GROUP_VALUE,
      label: 'Sem conclusão',
      sortValue: PERCENTUAL_BUCKETS.length,
    } as const;
  }

  const clamped = Math.min(Math.max(Math.round(numeric), 0), 100);
  let label: (typeof PERCENTUAL_BUCKETS)[number];

  if (clamped === 0) {
    label = '0%';
  } else if (clamped <= 25) {
    label = '1–25%';
  } else if (clamped <= 50) {
    label = '26–50%';
  } else if (clamped <= 75) {
    label = '51–75%';
  } else if (clamped < 100) {
    label = '76–99%';
  } else {
    label = '100%';
  }

  return {
    value: label,
    label,
    sortValue: PERCENTUAL_BUCKET_INDEX.get(label) ?? 0,
  } as const;
};

const normalizeVencimento = (value: TaskRow['data_vencimento']) => {
  if (!value) {
    return {
      value: NO_DUE_DATE_VALUE,
      label: 'Sem vencimento',
      sortValue: Number.POSITIVE_INFINITY,
    } as const;
  }

  const date = new Date(value as string | number | Date);
  if (Number.isNaN(date.getTime())) {
    return {
      value: NO_DUE_DATE_VALUE,
      label: 'Sem vencimento',
      sortValue: Number.POSITIVE_INFINITY,
    } as const;
  }

  try {
    const sortValue = date.getTime();
    const label = format(date, 'dd/MM/yyyy');
    const normalizedValue = format(date, 'yyyy-MM-dd');
    return { value: normalizedValue, label, sortValue } as const;
  } catch (error) {
    console.error('Erro ao formatar data para agrupamento:', error);
    return {
      value: NO_DUE_DATE_VALUE,
      label: 'Sem vencimento',
      sortValue: Number.POSITIVE_INFINITY,
    } as const;
  }
};

const groupTasks = (tasks: TaskRow[], groupBy: GroupByKey): GroupedTask[] => {
  if (!groupBy) {
    return [];
  }

  const groups = new Map<
    string,
    { label: string; items: TaskRow[]; sortValue: number | string }
  >();

  tasks.forEach(task => {
    let meta: { value: string; label: string; sortValue: number | string };

    switch (groupBy) {
      case 'responsavel':
        meta = normalizeTextValue(task.responsavel);
        break;
      case 'prioridade':
        meta = normalizeTextValue(task.prioridade);
        break;
      case 'status':
        meta = normalizeTextValue(task.status);
        break;
      case 'cliente':
        meta = normalizeTextValue(task.cliente);
        break;
      case 'modulo':
        meta = normalizeTextValue(task.modulo);
        break;
      case 'area':
        meta = normalizeTextValue(task.area);
        break;
      case 'percentualConclusao':
        meta = normalizePercentualConclusao(task.percentual_conclusao);
        break;
      case 'vencimento':
        meta = normalizeVencimento(task.data_vencimento);
        break;
      default:
        meta = { value: EMPTY_GROUP_VALUE, label: '—', sortValue: '~~~~' };
        break;
    }

    const existing = groups.get(meta.value);
    if (existing) {
      existing.items.push(task);
    } else {
      groups.set(meta.value, {
        label: meta.label,
        items: [task],
        sortValue: meta.sortValue,
      });
    }
  });

  const sorted = Array.from(groups.entries()).map(([value, data]) => ({
    key: data.label,
    value,
    count: data.items.length,
    items: data.items,
    sortValue: data.sortValue,
  }));

  sorted.sort((a, b) => {
    if (groupBy === 'vencimento' || groupBy === 'percentualConclusao') {
      return Number(a.sortValue) - Number(b.sortValue);
    }

    const valueA = String(a.sortValue);
    const valueB = String(b.sortValue);
    return valueA.localeCompare(valueB, 'pt-BR');
  });

  return sorted.map(({ sortValue: _sortValue, ...rest }) => rest);
};

const resolveGroupLabel = (groupBy: GroupByKey) => {
  if (!groupBy) {
    return '';
  }
  return GROUP_LABELS[groupBy as Exclude<GroupByKey, ''>];
};

const isValidGroupBy = (value: string | null): value is GroupByKey => {
  if (value === null) {
    return false;
  }
  return GROUP_BY_OPTIONS.includes(value as GroupByKey);
};

const CUSTOM_FIELD_TYPES: Array<{
  type: CustomField['field_type'];
  label: string;
  description: string;
  icon: React.ElementType;
}> = [
  {
    type: 'text_short',
    label: 'Texto curto',
    description: 'Capture informações em até 200 caracteres.',
    icon: Type,
  },
  {
    type: 'text_long',
    label: 'Texto longo',
    description: 'Registre descrições extensas com até 5000 caracteres.',
    icon: Type,
  },
  {
    type: 'numeric',
    label: 'Número',
    description: 'Registre valores numéricos inteiros ou decimais.',
    icon: Hash,
  },
  {
    type: 'percentage',
    label: 'Percentual',
    description: 'Defina valores percentuais entre 0 e 100%.',
    icon: Percent,
  },
  {
    type: 'monetary',
    label: 'Dinheiro',
    description: 'Controle valores financeiros de maneira padronizada.',
    icon: Coins,
  },
  {
    type: 'dropdown',
    label: 'Lista suspensa',
    description: 'Escolha uma opção pré-definida em uma lista.',
    icon: ListChecks,
  },
  {
    type: 'tags',
    label: 'Rótulos',
    description: 'Atribua múltiplos rótulos separados por vírgula.',
    icon: Tags,
  },
  {
    type: 'checkbox',
    label: 'Caixa de seleção',
    description: 'Marque ou desmarque rapidamente uma opção.',
    icon: CheckSquare,
  },
];

const TASK_ACTION_ICON_BASE_CLASS =
  'h-8 w-8 rounded-full shadow-sm transition-transform duration-200 hover:scale-105 focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-60 disabled:hover:scale-100';

const TASK_ACTION_ICON_VARIANTS = {
  view: 'bg-slate-500 text-white hover:bg-slate-600 hover:text-white focus-visible:ring-slate-500',
  edit: 'bg-indigo-500 text-white hover:bg-indigo-600 hover:text-white focus-visible:ring-indigo-500',
  gaps: 'bg-purple-500 text-white hover:bg-purple-600 hover:text-white focus-visible:ring-purple-500',
  activity:
    'bg-amber-500 text-white hover:bg-amber-600 hover:text-white focus-visible:ring-amber-500 disabled:bg-amber-300 disabled:text-amber-700',
  save: 'bg-sky-500 text-white hover:bg-sky-600 hover:text-white focus-visible:ring-sky-500 disabled:bg-sky-300 disabled:text-sky-700',
  start:
    'bg-emerald-500 text-white hover:bg-emerald-600 hover:text-white focus-visible:ring-emerald-500 disabled:bg-emerald-300 disabled:text-emerald-700',
  stop:
    'bg-rose-500 text-white hover:bg-rose-600 hover:text-white focus-visible:ring-rose-500 disabled:bg-rose-300 disabled:text-rose-700',
  delete:
    'bg-rose-500 text-white hover:bg-rose-600 hover:text-white focus-visible:ring-rose-500 disabled:bg-rose-300 disabled:text-rose-700',
} as const;

const extractTaskNumber = (identifier?: string | null): number => {
  if (!identifier) {
    return 0;
  }

  const match = String(identifier).trim().match(/(\d+)(?!.*\d)/);
  if (!match) {
    return 0;
  }

  const numeric = Number.parseInt(match[1], 10);
  return Number.isFinite(numeric) ? numeric : 0;
};

const deepEqual = (a: unknown, b: unknown): boolean => {
  if (a === b) {
    return true;
  }

  if (typeof a !== typeof b) {
    return false;
  }

  if (a === null || b === null) {
    return false;
  }

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) {
      return false;
    }
    return a.every((value, index) => deepEqual(value, b[index]));
  }

  if (typeof a === 'object' && typeof b === 'object') {
    const keysA = Object.keys(a as Record<string, unknown>);
    const keysB = Object.keys(b as Record<string, unknown>);

    if (keysA.length !== keysB.length) {
      return false;
    }

    const sortedKeysA = [...keysA].sort();
    const sortedKeysB = [...keysB].sort();

    return sortedKeysA.every((key, index) => {
      if (key !== sortedKeysB[index]) {
        return false;
      }
      return deepEqual((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key]);
    });
  }

  if (typeof a === 'number' && typeof b === 'number') {
    if (Number.isNaN(a) && Number.isNaN(b)) {
      return true;
    }
  }

  return false;
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

  const match = text.match(/^([0-9]{1,2})[/-]([0-9]{1,2})[/-]([0-9]{2,4})$/);
  if (match) {
    const [, day, month, rawYear] = match;
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
  if (!normalized) {
    return null;
  }

  if (['sim', 's', 'yes', 'y', 'verdadeiro', 'true', '1'].includes(normalized)) {
    return true;
  }

  if (['nao', 'não', 'n', 'no', 'false', '0'].includes(normalized)) {
    return false;
  }

  return null;
};

const parsePercentageCell = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      return null;
    }
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

const parseNumericCell = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  const normalized = String(value).replace(',', '.').trim();
  if (!normalized) {
    return null;
  }

  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

const parseTagsCell = (value: unknown): string[] => {
  if (value === null || value === undefined || value === '') {
    return [];
  }

  if (Array.isArray(value)) {
    return value
      .map(item => String(item).trim())
      .filter(Boolean);
  }

  return String(value)
    .split(/[,;\n]/)
    .map(item => item.trim())
    .filter(Boolean);
};

const normalizeHeader = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();

const getColumnLabel = (column: ColumnDefinition): string =>
  'isCustom' in column && column.isCustom ? column.field.field_name : column.label;

export function TaskManagementSystem({ projectId, projectClient }: TaskManagementSystemProps) {
  const {
    tasks,
    customFields,
    loading,
    createTask: createTaskMutation,
    updateTask,
    deleteTask,
    createCustomField,
    updateCustomField,
    deleteCustomField,
    refreshTasks,
  } = useTasks(projectId);
  const { user } = useAuth();
  const { tap } = useTAP(projectId);
  const { statuses } = useStatus();
  const statusColorMap = useMemo(() => {
    const map = new Map<string, string>();

    statuses.forEach(status => {
      const normalizedName = status.nome?.trim().toLowerCase();

      if (normalizedName) {
        map.set(normalizedName, getStatusColorValue(status));
      }
    });

    return map;
  }, [statuses]);
  const { modulos, createModulo } = useModulos();
  const { areas, createArea } = useAreas();
  const { categorias, createCategoria } = useCategorias();
  const {
    timeLogs,
    getTaskTotalTime,
    getResponsibleTotalTime,
    refreshTimeLogs,
    loading: timeLogsLoading,
  } = useTimeLogs(projectId);
  const tasksWithTimeLogs = useMemo(() => {
    const set = new Set<string>();
    timeLogs.forEach(log => {
      if (typeof log.task_id === 'string' && log.task_id.length > 0) {
        set.add(log.task_id);
      }
    });
    return set;
  }, [timeLogs]);
  const { allocations: projectAllocations } = useProjectAllocations(projectId);
  const { isGestor } = useUserRoles();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { stages, subStages } = useProjectStages();
  const { ensureGapForTask } = useGaps(projectId);

  const [editableRows, setEditableRows] = useState<TaskRow[]>([]);
  const [hiddenColumns, setHiddenColumns] = useState<string[]>([]);
  const [columnOrder, setColumnOrder] = useState<string[]>([]);
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const [draggingColumn, setDraggingColumn] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const [isLoadedPreferences, setIsLoadedPreferences] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [isCondensedView, setIsCondensedView] = useState(false);
  const [activeView, setActiveView] = useState<'table' | 'gantt'>('table');
  const taskDialogDefaultValues = useMemo<TaskDialogFormValues>(
    () => ({
      id: null,
      project_id: projectId,
      user_id: null,
      task_id: '',
      nome: '',
      responsavel: null,
      responsavel_cliente: null,
      responsavel_consultoria: null,
      responsavel_ticket: null,
      prioridade: null,
      status: null,
      status_ticket: null,
      cliente: null,
      modulo: null,
      area: null,
      categoria: null,
      etapa_projeto: null,
      sub_etapa_projeto: null,
      descricao_detalhada: null,
      retorno_acao: null,
      acao_realizada: null,
      descricao_ticket: null,
      numero_ticket: null,
      data_inicio: null,
      data_vencimento: null,
      data_entrega: null,
      data_prevista_entrega: null,
      data_prevista_validacao: null,
      dias_para_concluir: null,
      percentual_conclusao: null,
      tempo_total: 0,
      cronograma: false,
      link: null,
      link_drive: null,
      validado_por: null,
      escopo: null,
      custom_fields: null,
      created_at: null,
      updated_at: null,
    }),
    [projectId],
  );
  const taskDialogForm = useForm<TaskDialogFormValues>({
    resolver: taskDialogResolver,
    defaultValues: taskDialogDefaultValues,
  });
  const [taskDialogState, setTaskDialogState] = useState<{
    mode: 'view' | 'edit';
    task: TasksRow | null;
  } | null>(null);
  const [taskDialogLoading, setTaskDialogLoading] = useState(false);
  const [pendingDeleteRowIndex, setPendingDeleteRowIndex] = useState<number | null>(null);
  const {
    sortRules,
    addRule,
    toggleDirection,
    removeRule,
    reorderRules,
    clearAll,
    getRuleForKey,
    rulePositions,
  } = useMultiSort({ storageKey: TASK_SORT_STORAGE_KEY });
  const [isSortModalOpen, setIsSortModalOpen] = useState(false);
  const [pendingSortColumn, setPendingSortColumn] = useState<
    { key: string; label: string; defaultDirection?: SortDirection } | null
  >(null);
  const [savingRowIndex, setSavingRowIndex] = useState<number | null>(null);
  const savingRowPromiseRef = useRef<Promise<Task | null> | null>(null);
  const savingRowIndexRef = useRef<number | null>(null);
  const [deletingRowIndex, setDeletingRowIndex] = useState<number | null>(null);
  const [isCustomFieldDialogOpen, setIsCustomFieldDialogOpen] = useState(false);
  const [selectedFieldType, setSelectedFieldType] = useState<CustomField['field_type'] | null>(null);
  const [fieldName, setFieldName] = useState('');
  const [fieldOptionsInput, setFieldOptionsInput] = useState('');
  const [isFieldRequired, setIsFieldRequired] = useState(false);
  const [fieldSearch, setFieldSearch] = useState('');
  const [isCreatingField, setIsCreatingField] = useState(false);
  const [pendingResponsavelAssignment, setPendingResponsavelAssignment] = useState<{
    row: TaskRow;
    rowIndex: number;
  } | null>(null);
  const [selectedResponsavelForTimer, setSelectedResponsavelForTimer] = useState<string | null>(null);
  const [isSavingResponsavelForTimer, setIsSavingResponsavelForTimer] = useState(false);
  const [pendingStopTimer, setPendingStopTimer] = useState<
    {
      rowIndex: number;
      row: TaskRow;
      logId?: string | null;
      existingActivity?: string | null;
      startedAt?: number | null;
    } | null
  >(null);
  const [stopTimerActivityDescription, setStopTimerActivityDescription] = useState('');
  const [stopTimerError, setStopTimerError] = useState<string | null>(null);
  const [isSubmittingStopTimer, setIsSubmittingStopTimer] = useState(false);
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [editingFieldName, setEditingFieldName] = useState('');
  const [updatingFieldId, setUpdatingFieldId] = useState<string | null>(null);
  const [deletingFieldId, setDeletingFieldId] = useState<string | null>(null);
  const [groupBy, setGroupBy] = useState<GroupByKey>('');
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const expandedGroupsStorageKey = useMemo(
    () => (groupBy ? `${EXPANDED_GROUPS_STORAGE_PREFIX}${groupBy}` : ''),
    [groupBy]
  );
  const [activeTimers, setActiveTimers] = useState<Record<string, number>>({});
  const hasHydratedActiveTimersRef = useRef(false);
  const [timerTick, setTimerTick] = useState(0);
  const [successDialogData, setSuccessDialogData] = useState<{ task: Task; wasDraft: boolean } | null>(null);
  const [isSuccessDialogOpen, setIsSuccessDialogOpen] = useState(false);
  const [isTaskNameRequiredDialogOpen, setIsTaskNameRequiredDialogOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const activeTimersStorageKey = useMemo(
    () => `task-active-timers-${projectId}`,
    [projectId]
  );

  const openSortModalForColumn = useCallback(
    (columnKey: string, label: string) => {
      if (!SORTABLE_COLUMN_KEYS.has(columnKey)) {
        return;
      }
      setPendingSortColumn({
        key: columnKey,
        label,
        defaultDirection: DEFAULT_SORT_DIRECTIONS[columnKey] ?? 'asc',
      });
      setIsSortModalOpen(true);
    },
    [],
  );

  const closeSortModal = useCallback(() => {
    setIsSortModalOpen(false);
    setPendingSortColumn(null);
  }, []);

  const handleColumnHeaderClick = useCallback(
    (event: React.MouseEvent<HTMLTableCellElement>, column: ColumnDefinition) => {
      if (draggingColumn) {
        return;
      }
      if (!SORTABLE_COLUMN_KEYS.has(column.key)) {
        return;
      }
      const target = event.target as HTMLElement | null;
      if (target?.closest('[data-resize-handle="true"]')) {
        return;
      }
      openSortModalForColumn(column.key, getColumnLabel(column));
    },
    [draggingColumn, openSortModalForColumn],
  );

  useEffect(() => {
    if (typeof window === 'undefined') {
      hasHydratedActiveTimersRef.current = true;
      return;
    }

    const stored = window.localStorage.getItem(GROUP_BY_STORAGE_KEY);
    if (isValidGroupBy(stored)) {
      setGroupBy(stored);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      window.localStorage.setItem(GROUP_BY_STORAGE_KEY, groupBy);
    } catch (error) {
      console.warn('Não foi possível salvar preferências de agrupamento:', error);
    }
  }, [groupBy]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    if (!groupBy || !expandedGroupsStorageKey) {
      setExpandedGroups(prev => (Object.keys(prev).length === 0 ? prev : {}));
      return;
    }

    const stored = window.sessionStorage.getItem(expandedGroupsStorageKey);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as Record<string, boolean>;
        if (parsed && typeof parsed === 'object') {
          setExpandedGroups(parsed);
          return;
        }
      } catch (error) {
        console.error('Erro ao restaurar estado de grupos:', error);
      }
    }

    setExpandedGroups({});
  }, [expandedGroupsStorageKey, groupBy]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    if (!groupBy || !expandedGroupsStorageKey) {
      return;
    }

    try {
      window.sessionStorage.setItem(expandedGroupsStorageKey, JSON.stringify(expandedGroups));
    } catch (error) {
      console.warn('Não foi possível salvar estado de grupos de tarefas:', error);
    }
  }, [expandedGroups, expandedGroupsStorageKey, groupBy]);

  type ActiveTimersUpdater = ActiveTimerRecord | ((prev: ActiveTimerRecord) => ActiveTimerRecord);

  const applyActiveTimersUpdate = useCallback(
    (updater: ActiveTimersUpdater) => {
      setActiveTimers(prev => {
        const nextCandidate =
          typeof updater === 'function'
            ? (updater as (current: ActiveTimerRecord) => ActiveTimerRecord)(prev)
            : updater;

        const sanitizedNext = sanitizeActiveTimerRecord(nextCandidate);

        if (areActiveTimerRecordsEqual(prev, sanitizedNext)) {
          return prev;
        }

        return sanitizedNext;
      });
    },
    [],
  );

  useEffect(() => {
    if (!hasHydratedActiveTimersRef.current) {
      return;
    }

    persistActiveTimerRecord(activeTimersStorageKey, activeTimers);
    notifyProjectActiveTimersChange(projectId, Object.keys(activeTimers).length > 0);
  }, [activeTimers, activeTimersStorageKey, projectId]);

  const defaultClient = useMemo(() => {
    if (projectClient) {
      return projectClient;
    }
    if (tap?.cod_cliente) {
      return tap.cod_cliente;
    }
    return '';
  }, [projectClient, tap?.cod_cliente]);

  const stageOptions = useMemo(() => (
    stages.map(stage => ({ value: stage.id, label: stage.nome }))
  ), [stages]);

  const subStageOptionsByStage = useMemo(() => {
    const map = new Map<string, Array<{ value: string; label: string }>>();
    subStages.forEach(subStage => {
      const list = map.get(subStage.stage_id) ?? [];
      list.push({ value: subStage.id, label: subStage.nome });
      map.set(subStage.stage_id, list);
    });
    return map;
  }, [subStages]);

  const stageNameById = useMemo(() => {
    const map = new Map<string, string>();
    stages.forEach(stage => {
      map.set(stage.id, stage.nome);
    });
    return map;
  }, [stages]);

  const subStageNameById = useMemo(() => {
    const map = new Map<string, { label: string; stageId: string }>();
    subStages.forEach(subStage => {
      map.set(subStage.id, { label: subStage.nome, stageId: subStage.stage_id });
    });
    return map;
  }, [subStages]);

  useEffect(() => {
    if (timeLogsLoading) {
      return;
    }

    const tasksWithLogs = new Set<string>();
    const runningLogStartTimes = new Map<string, number>();

    timeLogs.forEach(log => {
      if (typeof log.task_id !== 'string' || log.task_id.length === 0) {
        return;
      }

      const taskId = log.task_id;
      tasksWithLogs.add(taskId);

      if (log.data_fim) {
        return;
      }

      const startedAt =
        typeof log.data_inicio === 'string' ? new Date(log.data_inicio).getTime() : Number.NaN;

      if (Number.isFinite(startedAt) && startedAt > 0) {
        runningLogStartTimes.set(taskId, startedAt);
      }
    });

    if (runningLogStartTimes.size === 0 && tasksWithLogs.size === 0) {
      return;
    }

    applyActiveTimersUpdate(prev => {
      let changed = false;
      const next = { ...prev };

      runningLogStartTimes.forEach((startTimestamp, taskId) => {
        if (next[taskId] !== startTimestamp) {
          next[taskId] = startTimestamp;
          changed = true;
        }
      });

      Object.keys(prev).forEach(taskId => {
        if (!runningLogStartTimes.has(taskId) && tasksWithLogs.has(taskId)) {
          delete next[taskId];
          changed = true;
        }
      });

      if (!changed) {
        return prev;
      }

      return next;
    });
  }, [timeLogs, timeLogsLoading, applyActiveTimersUpdate]);

  useEffect(() => {
    const validIds = new Set(
      editableRows
        .map(row => row.id)
        .filter((id): id is string => typeof id === 'string' && id.length > 0),
    );

    applyActiveTimersUpdate(prev => {
      if (validIds.size === 0) {
        return prev;
      }

      const filteredEntries = Object.entries(prev).filter(([taskId]) => validIds.has(taskId));
      if (filteredEntries.length === Object.keys(prev).length) {
        return prev;
      }

      return filteredEntries.reduce<Record<string, number>>((acc, [taskId, value]) => {
        acc[taskId] = value;
        return acc;
      }, {});
    });

  }, [applyActiveTimersUpdate, editableRows]);

  useEffect(() => {
    if (Object.keys(activeTimers).length === 0) {
      setTimerTick(0);
      return;
    }

    const interval = window.setInterval(() => {
      setTimerTick(Date.now());
    }, 1000);

    return () => window.clearInterval(interval);
  }, [activeTimers]);

  const formatDuration = useCallback((totalSeconds: number) => {
    const safeSeconds = Number.isFinite(totalSeconds) ? Math.max(0, Math.round(totalSeconds)) : 0;
    const hours = Math.floor(safeSeconds / 3600);
    const minutes = Math.floor((safeSeconds % 3600) / 60);
    const seconds = safeSeconds % 60;

    const pad = (value: number) => value.toString().padStart(2, '0');

    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }, []);

  const getStoredTempoTotalSeconds = useCallback((row: TaskRow): number => {
    const value = (row as TaskRow & { tempo_total?: unknown }).tempo_total;
    if (typeof value === 'number' && Number.isFinite(value)) {
      return Math.max(0, Math.round(value));
    }
    return 0;
  }, []);

  const getRowAccumulatedSeconds = useCallback(
    (row: TaskRow): number => {
      const storedSeconds = getStoredTempoTotalSeconds(row);

      if (!row.id) {
        return storedSeconds;
      }

      const hasLoggedTime = tasksWithTimeLogs.has(row.id);
      const minutes = getTaskTotalTime(row.id);
      const runningStart = activeTimers[row.id];
      const referenceNow = timerTick || Date.now();

      const numericMinutes = Number.isFinite(minutes) ? Math.max(0, minutes) : 0;
      const baseSeconds = hasLoggedTime ? Math.max(0, Math.round(numericMinutes * 60)) : null;
      const runningSeconds = runningStart ? Math.max(0, Math.round((referenceNow - runningStart) / 1000)) : 0;

      if (baseSeconds !== null) {
        return baseSeconds + runningSeconds;
      }

      return storedSeconds + runningSeconds;
    },
    [activeTimers, getStoredTempoTotalSeconds, getTaskTotalTime, tasksWithTimeLogs, timerTick],
  );

  const sortAccessors = useMemo<Record<string, (row: TaskRow) => unknown>>(
    () => ({
      // Ajuste este mapa com os campos que representam cada coluna ordenável do seu grid.
      task_id: row => row.task_id ?? '',
      tarefa: row => row.tarefa ?? '',
      prioridade: row => row.prioridade ?? '',
      status: row => row.status ?? '',
      cliente: row => row.cliente ?? '',
      responsavel: row => row.responsavel ?? '',
      data_inicio: row => row.data_inicio ?? null,
      data_vencimento: row => row.data_vencimento ?? null,
      descricao_tarefa: row => row.descricao_tarefa ?? '',
      solucao: row => row.solucao ?? '',
      percentual_conclusao: row => row.percentual_conclusao ?? null,
      tempo_total: row => getRowAccumulatedSeconds(row),
      modulo: row => row.modulo ?? '',
      area: row => row.area ?? '',
      categoria: row => row.categoria ?? '',
      etapa_projeto: row => row.etapa_projeto ?? '',
      sub_etapa_projeto: row => row.sub_etapa_projeto ?? '',
      criticidade: row => row.criticidade ?? '',
      escopo: row => row.escopo ?? '',
      cronograma: row => (typeof row.cronograma === 'boolean' ? Number(row.cronograma) : null),
    }),
    [getRowAccumulatedSeconds],
  );

  const sortValueNormalizers = useMemo<Record<string, (value: unknown, row: TaskRow) => unknown>>(
    () => ({
      prioridade: (value: unknown) => normalizePriorityWeight(value),
      data_inicio: (value: unknown) => {
        if (!value) {
          return null;
        }
        const date = new Date(value as string | number | Date);
        return Number.isNaN(date.getTime()) ? null : date;
      },
      data_vencimento: (value: unknown) => {
        if (!value) {
          return null;
        }
        const date = new Date(value as string | number | Date);
        return Number.isNaN(date.getTime()) ? null : date;
      },
      percentual_conclusao: (value: unknown) => {
        if (typeof value === 'number' && Number.isFinite(value)) {
          return value;
        }
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : null;
      },
      tempo_total: (_value: unknown, row: TaskRow) => getRowAccumulatedSeconds(row),
      cronograma: (value: unknown) =>
        typeof value === 'boolean'
          ? Number(value)
          : value === null || value === undefined
            ? null
            : Number(Boolean(value)),
    }),
    [getRowAccumulatedSeconds],
  );

  const preferencesStorageKey = useMemo(() => `task-table-preferences-${projectId}`, [projectId]);

  const { responsibleTimeSummaries, responsibleTimeSummaryMap } = useMemo<{
    responsibleTimeSummaries: ResponsibleTimeSummary[];
    responsibleTimeSummaryMap: Map<string, ResponsibleTimeSummary>;
  }>(() => {
    const assignments = editableRows
      .filter(row => row.id && typeof row.responsavel === 'string' && row.responsavel.trim().length > 0)
      .map(row => ({ taskId: row.id as string, responsavel: row.responsavel as string }));

    const baseMinutesByResponsavel = getResponsibleTotalTime(assignments);
    const aggregated = new Map<string, { label: string; seconds: number; isActive: boolean }>();

    Object.entries(baseMinutesByResponsavel).forEach(([label, minutes]) => {
      const normalized = label.trim().toLowerCase();
      if (!normalized) {
        return;
      }

      const safeMinutes = Number.isFinite(minutes) ? Math.max(0, minutes) : 0;
      aggregated.set(normalized, { label, seconds: Math.round(safeMinutes * 60), isActive: false });
    });

    editableRows.forEach(row => {
      if (!row.id) {
        return;
      }

      const responsavelName = typeof row.responsavel === 'string' ? row.responsavel.trim() : '';
      if (!responsavelName) {
        return;
      }

      const normalized = responsavelName.toLowerCase();
      const runningStart = activeTimers[row.id];
      const referenceNow = timerTick || Date.now();
      const runningSeconds = runningStart ? Math.max(0, Math.round((referenceNow - runningStart) / 1000)) : 0;
      const extras = runningSeconds;
      const isRunning = Boolean(runningStart);

      if (!aggregated.has(normalized)) {
        aggregated.set(normalized, { label: responsavelName, seconds: extras, isActive: isRunning });
        return;
      }

      const existing = aggregated.get(normalized)!;
      const nextSeconds = existing.seconds + extras;
      aggregated.set(normalized, {
        label: responsavelName || existing.label,
        seconds: nextSeconds,
        isActive: existing.isActive || isRunning,
      });
    });

    const allEntries = Array.from(aggregated.entries()).map(([normalized, entry]) => {
      const safeSeconds = Number.isFinite(entry.seconds) ? Math.max(0, Math.floor(entry.seconds)) : 0;
      return {
        normalized,
        label: entry.label,
        seconds: safeSeconds,
        minutes: Math.max(0, Math.round(safeSeconds / 60)),
        formatted: formatDuration(safeSeconds),
        isActive: entry.isActive,
      };
    });

    const summaryMap = new Map<string, ResponsibleTimeSummary>();
    allEntries.forEach(entry => {
      summaryMap.set(entry.normalized, {
        label: entry.label,
        seconds: entry.seconds,
        minutes: entry.minutes,
        formatted: entry.formatted,
        isActive: entry.isActive,
      });
    });

    const summaryArray = allEntries
      .filter(entry => entry.seconds > 0)
      .sort((a, b) => {
        if (a.isActive !== b.isActive) {
          return Number(b.isActive) - Number(a.isActive);
        }
        return b.seconds - a.seconds;
      })
      .map(({ normalized: _normalized, ...entry }) => entry);

    return { responsibleTimeSummaries: summaryArray, responsibleTimeSummaryMap: summaryMap };
  }, [
    editableRows,
    getResponsibleTotalTime,
    activeTimers,
    timerTick,
    formatDuration,
  ]);

  const getResponsibleTimeSummary = useCallback(
    (responsavel: string): ResponsibleTimeSummary | null => {
      const normalized = typeof responsavel === 'string' ? responsavel.trim().toLowerCase() : '';
      if (!normalized) {
        return null;
      }
      return responsibleTimeSummaryMap.get(normalized) ?? null;
    },
    [responsibleTimeSummaryMap],
  );

  const sortedRows = useMemo<TaskRow[]>(() => {
    if (!sortRules.length) {
      return editableRows;
    }
    return multiSort(editableRows, sortRules, sortAccessors, {
      valueNormalizers: sortValueNormalizers,
      locale: 'pt-BR',
    });
  }, [editableRows, sortRules, sortAccessors, sortValueNormalizers]);

  const groupedTasks = useMemo(
    () => groupTasks(sortedRows, groupBy),
    [sortedRows, groupBy]
  );

  const rowIndexMap = useMemo(() => {
    const map = new WeakMap<TaskRow, number>();
    editableRows.forEach((row, index) => {
      map.set(row, index);
    });
    return map;
  }, [editableRows]);

  const sortedRowEntries = useMemo(() => {
    if (!sortRules.length) {
      return editableRows.map((row, index) => ({ row, index }));
    }
    return sortedRows
      .map(row => {
        const resolvedIndex = rowIndexMap.get(row) ?? editableRows.indexOf(row);
        if (resolvedIndex < 0) {
          return null;
        }
        return { row, index: resolvedIndex };
      })
      .filter((entry): entry is { row: TaskRow; index: number } => entry !== null);
  }, [editableRows, rowIndexMap, sortRules, sortedRows]);

  const toggleGroupValue = useCallback((value: string) => {
    setExpandedGroups(prev => {
      const current = prev[value];
      const nextState = current === undefined ? false : !current;
      return {
        ...prev,
        [value]: nextState,
      };
    });
  }, []);


  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const restoreFromStorage = () => {
      try {
        const restoredActive = readActiveTimerRecord(activeTimersStorageKey);
        applyActiveTimersUpdate(restoredActive);
        hasHydratedActiveTimersRef.current = true;
        persistActiveTimerRecord(activeTimersStorageKey, restoredActive);
        notifyProjectActiveTimersChange(projectId, Object.keys(restoredActive).length > 0);
      } catch (error) {
        console.error('Erro ao restaurar temporizadores ativos:', error);
        try {
          window.localStorage.removeItem(activeTimersStorageKey);
        } catch (error) {
          console.warn('Não foi possível limpar registros de temporizadores de tarefas:', error);
        }
        applyActiveTimersUpdate({});
        hasHydratedActiveTimersRef.current = true;
        notifyProjectActiveTimersChange(projectId, false);
      }
    };

    restoreFromStorage();

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== activeTimersStorageKey) {
        return;
      }
      restoreFromStorage();
    };

    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener('storage', handleStorage);
    };
  }, [activeTimersStorageKey, applyActiveTimersUpdate, projectId]);

  const activeTeamMembers = useMemo(() => {
    if (!projectAllocations.length) {
      return [] as Array<{ id: string; name: string }>;
    }

    const normalizedClient = defaultClient.trim().toLowerCase();
    const membersMap = new Map<string, { id: string; name: string }>();

    projectAllocations.forEach(allocation => {
      if (allocation.status_participacao !== 'Ativo') {
        return;
      }

      if (allocation.project_id !== projectId) {
        return;
      }

      const allocationClient = allocation.project?.cliente?.trim().toLowerCase();
      const allocationClientName = allocation.client?.nome?.trim().toLowerCase();

      if (
        normalizedClient &&
        allocationClient &&
        allocationClient !== normalizedClient &&
        allocationClientName !== normalizedClient
      ) {
        return;
      }

      const memberId = allocation.allocated_user_id;
      const memberName = allocation.user?.nome_completo?.trim();

      if (!memberId || !memberName) {
        return;
      }

      if (!membersMap.has(memberId)) {
        membersMap.set(memberId, { id: memberId, name: memberName });
      }
    });

    return Array.from(membersMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [projectAllocations, projectId, defaultClient]);

  const responsibleNameOptions = useMemo(
    () =>
      activeTeamMembers
        .map(member => member.name)
        .filter((name): name is string => typeof name === 'string' && name.trim().length > 0),
    [activeTeamMembers],
  );

  const baseColumns = useMemo<ColumnDefinition[]>(() => ([
    { key: 'task_id', label: 'ID', width: '80px' },
    { key: 'tarefa', label: 'Tarefa', width: '220px' },
    { key: 'prioridade', label: 'Prioridade', width: '120px' },
    { key: 'status', label: 'Status', width: '150px' },
    { key: 'cliente', label: 'Cliente', width: '150px' },
    { key: 'responsavel', label: 'Responsável', width: '150px' },
    { key: 'data_inicio', label: 'Início', width: '120px' },
    { key: 'data_vencimento', label: 'Vencimento', width: '120px' },
    { key: 'descricao_tarefa', label: 'Descrição Tarefa', width: '240px' },
    { key: 'solucao', label: 'Atividade', width: '240px' },
    { key: 'percentual_conclusao', label: '% Conclusão', width: '100px' },
    { key: 'tempo_total', label: 'Tempo Total', width: '120px' },
    { key: 'modulo', label: 'Módulo', width: '150px' },
    { key: 'area', label: 'Área', width: '150px' },
    { key: 'categoria', label: 'Categoria', width: '150px' },
    { key: 'etapa_projeto', label: 'Etapa do Projeto', width: '170px' },
    { key: 'sub_etapa_projeto', label: 'Sub-Etapa', width: '170px' },
    { key: 'criticidade', label: 'Criticidade', width: '120px' },
    { key: 'escopo', label: 'Escopo', width: '150px' },
    { key: 'cronograma', label: 'Cronograma?', width: '140px' },
  ]), []);

  const customFieldColumns = useMemo<ColumnDefinition[]>(() => (
    customFields.map(field => {
      let width = '180px';
      if (field.field_type === 'text_long') {
        width = '240px';
      } else if (field.field_type === 'checkbox') {
        width = '140px';
      }

      return {
        key: `custom_${field.id}`,
        label: field.field_name,
        width,
        isCustom: true,
        field,
      } as ColumnDefinition;
    })
  ), [customFields]);

  const allColumns = useMemo<ColumnDefinition[]>(() => ([
    ...baseColumns,
    ...customFieldColumns,
  ]), [baseColumns, customFieldColumns]);

  const columnLabelMap = useMemo(() => {
    return allColumns.reduce<Map<string, ColumnDefinition>>((map, column) => {
      map.set(column.label, column);
      return map;
    }, new Map());
  }, [allColumns]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const columnKeys = allColumns.map(column => column.key);

    try {
      const stored = window.localStorage.getItem(preferencesStorageKey);
      if (!stored) {
        setIsLoadedPreferences(true);
        return;
      }

      const parsed = JSON.parse(stored) as {
        version?: number;
        hiddenColumns?: string[];
        order?: string[];
        widths?: Record<string, number>;
        density?: 'comfortable' | 'condensed';
      } | null;

      if (parsed?.version !== TASK_TABLE_PREFERENCES_VERSION) {
        setIsLoadedPreferences(true);
        return;
      }

      if (parsed?.hiddenColumns && Array.isArray(parsed.hiddenColumns)) {
        const sanitizedHidden = parsed.hiddenColumns.filter(key => columnKeys.includes(key));
        setHiddenColumns(sanitizedHidden);
      }

      if (parsed?.order && Array.isArray(parsed.order)) {
        setColumnOrder(parsed.order);
      }

      if (parsed?.widths && typeof parsed.widths === 'object') {
        const sanitizedWidths = Object.entries(parsed.widths).reduce<Record<string, number>>((acc, [key, value]) => {
          if (columnKeys.includes(key) && typeof value === 'number' && Number.isFinite(value) && value > 0) {
            acc[key] = value;
          }
          return acc;
        }, {});
        setColumnWidths(sanitizedWidths);
      }

      if (parsed?.density === 'condensed') {
        setIsCondensedView(true);
      }
    } catch (error) {
      console.warn('Não foi possível carregar preferências da tabela de tarefas:', error);
    } finally {
      setIsLoadedPreferences(true);
    }
  }, [preferencesStorageKey, allColumns]);

  useEffect(() => {
    if (!isLoadedPreferences || typeof window === 'undefined') {
      return;
    }

    const payload = JSON.stringify({
      version: TASK_TABLE_PREFERENCES_VERSION,
      hiddenColumns,
      order: columnOrder,
      widths: columnWidths,
      density: isCondensedView ? 'condensed' : 'comfortable',
    });

    try {
      window.localStorage.setItem(preferencesStorageKey, payload);
    } catch (error) {
      console.warn('Não foi possível salvar preferências da tabela de tarefas:', error);
    }
  }, [hiddenColumns, columnOrder, columnWidths, isCondensedView, preferencesStorageKey, isLoadedPreferences]);

  // Filtrar status baseado no tipo da TAP
  const filteredStatuses = useMemo(() => {
    if (!statuses.length) return [];

    const tipoMap: Record<TAP['tipo'], 'tarefa_projeto' | 'tarefa_suporte' | 'tarefa_avulso'> = {
      PROJETO: 'tarefa_projeto',
      SUPORTE: 'tarefa_suporte',
      AVULSO: 'tarefa_avulso',
    };

    const normalizeTipoAplicacao = (value: Status['tipo_aplicacao'] | string | null | undefined): string[] => {
      if (Array.isArray(value)) {
        return value
          .map(option => (typeof option === 'string' ? option.trim() : ''))
          .filter((option): option is string => option.length > 0);
      }

      if (typeof value === 'string') {
        try {
          const parsed = JSON.parse(value);
          if (Array.isArray(parsed)) {
            return parsed
              .map(option => (typeof option === 'string' ? option.trim() : ''))
              .filter((option): option is string => option.length > 0);
          }
        } catch {
          // Valor não é um JSON válido, tentar quebrar por vírgula
        }

        return value
          .split(',')
          .map(option => option.trim())
          .filter(option => option.length > 0);
      }

      return [];
    };

    const rawTipoStatus = tap?.tipo ? tipoMap[tap.tipo] : undefined;
    const normalizedTipoStatus = rawTipoStatus?.toLowerCase();

    const filtered = statuses.filter(status => {
      if (!status?.ativo) {
        return false;
      }

      const tiposAplicacao = normalizeTipoAplicacao(
        (status as Status & { tipo_aplicacao?: Status['tipo_aplicacao'] | string | null | undefined }).tipo_aplicacao
      ).map(tipo => tipo.toLowerCase());

      if (!tiposAplicacao.length || !normalizedTipoStatus) {
        return false;
      }

      return tiposAplicacao.includes(normalizedTipoStatus);
    });

    const seen = new Set<string>();

    return filtered.filter(status => {
      const key = status.nome?.trim().toLowerCase();

      if (!key) {
        return true;
      }

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    });
  }, [tap?.tipo, statuses]);

  const defaultStatusName = useMemo(() => {
    if (filteredStatuses.length > 0) {
      return filteredStatuses[0].nome ?? '';
    }

    return '';
  }, [filteredStatuses]);

  const sanitizeTaskForSave = useCallback(
    (row: TaskRow): Partial<TaskFormData> => {
      const {
        _isNew,
        _tempId,
        id,
        task_id,
        isDraft,
        created_at,
        updated_at,
        user_id,
        tempo_total,
        ...rest
      } = row as TaskRow & { tempo_total?: unknown };

      const payload: Partial<TaskFormData> = {};

      Object.entries(rest).forEach(([key, value]) => {
        if (key === 'data_inicio') {
          return;
        }

        if (value === undefined || value === null) {
          return;
        }

        if (typeof value === 'string') {
          const trimmed = value.trim();
          if (trimmed.length === 0) {
            if (key === 'project_id') {
              return;
            }
            (payload as Record<string, unknown>)[key] = null;
            return;
          }
          (payload as Record<string, unknown>)[key] = trimmed;
          return;
        }

        if (typeof value === 'number') {
          if (!Number.isNaN(value)) {
            (payload as Record<string, unknown>)[key] = value;
          }
          return;
        }

        if (typeof value === 'boolean') {
          (payload as Record<string, unknown>)[key] = value;
          return;
        }

        (payload as Record<string, unknown>)[key] = value;
      });

      payload.tarefa = typeof row.tarefa === 'string' ? row.tarefa.trim() : '';
      payload.status =
        typeof row.status === 'string' && row.status.trim().length > 0
          ? row.status.trim()
          : defaultStatusName || '';

      if (typeof task_id === 'string' && task_id.trim().length > 0) {
        payload.task_id = task_id.trim();
      }
      payload.prioridade = (row.prioridade as Task['prioridade']) ?? 'Média';
      payload.cronograma = Boolean(row.cronograma);
      payload.percentual_conclusao =
        typeof row.percentual_conclusao === 'number' && Number.isFinite(row.percentual_conclusao)
          ? row.percentual_conclusao
          : 0;
      payload.nivel = typeof row.nivel === 'number' ? row.nivel : 0;
      payload.ordem = typeof row.ordem === 'number' ? row.ordem : 0;
      payload.custom_fields = row.custom_fields ?? {};

      if (!payload.cliente && defaultClient) {
        payload.cliente = defaultClient;
      }

      if (!payload.project_id && projectId) {
        payload.project_id = projectId;
      }

      if (row.data_vencimento instanceof Date) {
        payload.data_vencimento = row.data_vencimento.toISOString().slice(0, 10);
      }

      const dateFields: Array<keyof TaskFormData> = [
        'data_prevista_entrega',
        'data_entrega',
        'data_prevista_validacao',
        'data_identificacao_ticket',
      ];
      dateFields.forEach(field => {
        const value = row[field];
        if (value instanceof Date) {
          payload[field] = value.toISOString();
        }
      });

      return payload;
    },
    [defaultClient, defaultStatusName, projectId],
  );

  const getNextTaskIdentifier = useCallback((rows: TaskRow[] = editableRows) => {
    let highest = 0;

    tasks.forEach(task => {
      highest = Math.max(highest, extractTaskNumber(task.task_id));
    });

    rows.forEach(row => {
      if (typeof row.task_id === 'string') {
        highest = Math.max(highest, extractTaskNumber(row.task_id));
      }
    });

    return `TSK-${highest + 1}`;
  }, [editableRows, tasks]);

  const computeHasPendingChanges = useCallback(
    (rows: TaskRow[]): boolean => {
      return rows.some(row => {
        if (row._isNew || row.isDraft || !row.id) {
          return true;
        }

        const original = tasks.find(task => task.id === row.id);
        if (!original) {
          return true;
        }

        const sanitizedRow = sanitizeTaskForSave(row);
        const normalizedOriginal: TaskRow = {
          ...original,
          custom_fields: original.custom_fields ?? {},
        };
        const sanitizedOriginal = sanitizeTaskForSave(normalizedOriginal);

        return !deepEqual(sanitizedRow, sanitizedOriginal);
      });
    },
    [sanitizeTaskForSave, tasks],
  );

  const logTaskChange = useCallback(
    async ({
      operation,
      task,
      before,
      after,
    }: {
      operation: 'INSERT' | 'UPDATE';
      task: Task;
      before: Partial<TaskFormData> | null;
      after: Partial<TaskFormData>;
    }) => {
      const serializeForJson = (value: unknown) => {
        if (value === undefined) {
          return null;
        }

        try {
          const json = JSON.stringify(value ?? null);
          if (typeof json !== 'string') {
            return null;
          }
          return JSON.parse(json);
        } catch (error) {
          console.error('Erro ao serializar dados de auditoria de tarefa:', error);
          return null;
        }
      };

      if (!task.id) {
        return;
      }

      const shouldFallbackToLegacySnapshot = (error: PostgrestError | null) => {
        if (!error) {
          return false;
        }

        if (error.code === 'PGRST204') {
          return true;
        }

        const message = error.message?.toLowerCase?.() ?? '';
        return message.includes("'de'") || message.includes('de column') || message.includes("'para'");
      };

      const shouldFallbackToDirectInsert = (error: PostgrestError | null) => {
        if (!error) {
          return false;
        }

        if (error.code === 'PGRST100' || error.code === '42883') {
          return true;
        }

        const message = error.message?.toLowerCase?.() ?? '';
        return message.includes('insert_log_audit_task');
      };

      try {
        const basePayload = {
          task_id: task.id,
          audit_operation: operation,
          audit_user: user?.id ?? null,
        };

        const serializedBefore = before ? serializeForJson(before) : null;
        const serializedAfter = serializeForJson(after);
        const serializedSnapshot = serializeForJson({
          ...task,
          custom_fields: task.custom_fields ?? {},
        });

        const rpcPayload = {
          _task_id: task.id,
          _audit_operation: operation,
          _de: serializedBefore,
          _para: serializedAfter,
          _task_snapshot: serializedSnapshot,
        };

        const rpcResult = await supabase.rpc('insert_log_audit_task', rpcPayload);

        if (rpcResult.error) {
          if (!shouldFallbackToDirectInsert(rpcResult.error)) {
            console.error('Erro ao registrar auditoria de tarefa:', rpcResult.error);
            return;
          }

          const { error } = await supabase.from('log_audit_tasks').insert({
            ...basePayload,
            de: serializedBefore,
            para: serializedAfter,
            task_snapshot: serializedSnapshot,
          });

          if (error) {
            if (!shouldFallbackToLegacySnapshot(error)) {
              console.error('Erro ao registrar auditoria de tarefa:', error);
              return;
            }

            const fallbackResult = await supabase.from('log_audit_tasks').insert({
              ...basePayload,
              task_snapshot: serializedSnapshot,
            });

            if (fallbackResult.error) {
              console.error('Erro ao registrar auditoria de tarefa (modo legado):', fallbackResult.error);
            }
          }
        }
      } catch (error) {
        console.error('Erro inesperado ao registrar auditoria de tarefa:', error);
      }
    },
    [user],
  );

  // Inicializar rows com as tasks existentes
  const createBlankRow = useCallback((order: number, taskIdentifier?: string): TaskRow => ({
    _isNew: true,
    isDraft: true,
    _tempId: `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    project_id: projectId,
    task_id: taskIdentifier ?? '',
    tarefa: '',
    descricao_tarefa: '',
    solucao: '',
    prioridade: 'Média',
    status: defaultStatusName || '',
    cliente: defaultClient || undefined,
    data_vencimento: format(new Date(), 'yyyy-MM-dd'),
    percentual_conclusao: 0,
    nivel: 0,
    ordem: order,
    custom_fields: {},
    tempo_total: 0,
    cronograma: false,
  }), [projectId, defaultClient, defaultStatusName]);

  useEffect(() => {
    setEditableRows(prev => {
      const pendingNewRows = prev.filter(row => row._isNew || row.isDraft);
      const normalizedTasks: TaskRow[] = tasks.map(task => ({
        ...task,
        custom_fields: task.custom_fields ?? {},
        _isNew: false,
        isDraft: false,
      }));

      if (pendingNewRows.length > 0) {
        const normalizedTaskIds = new Set(
          normalizedTasks
            .map(taskRow => taskRow.id)
            .filter((value): value is string => typeof value === 'string' && value.length > 0),
        );
        const normalizedTaskIdentifiers = new Set(
          normalizedTasks
            .map(taskRow => (typeof taskRow.task_id === 'string' ? taskRow.task_id.trim() : ''))
            .filter(identifier => identifier.length > 0),
        );

        const filteredPendingRows = pendingNewRows.filter(row => {
          if (row.id && normalizedTaskIds.has(row.id)) {
            return false;
          }

          if (typeof row.task_id === 'string') {
            const trimmed = row.task_id.trim();
            if (trimmed.length > 0 && normalizedTaskIdentifiers.has(trimmed)) {
              return false;
            }
          }

          return true;
        });

        if (filteredPendingRows.length !== pendingNewRows.length) {
          return [...normalizedTasks, ...filteredPendingRows];
        }
      }

      if (
        pendingNewRows.length === 0 &&
        normalizedTasks.length === prev.length &&
        normalizedTasks.every((taskRow, index) => {
          const previous = prev[index];
          return (
            previous &&
            !(previous._isNew || previous.isDraft) &&
            previous.id === taskRow.id
          );
        })
      ) {
        return prev;
      }

      return [...normalizedTasks, ...pendingNewRows];
    });
  }, [tasks]);

  const tasksLength = tasks.length;

  useEffect(() => {
    if (loading) return;
    if (tasksLength > 0) return;
    if (editableRows.length > 0) return;

    const prepareInitialRow = () => {
      const identifier = getNextTaskIdentifier();
      setEditableRows([createBlankRow(0, identifier)]);
      setHasChanges(true);
    };

    prepareInitialRow();

  }, [loading, tasksLength, editableRows.length, createBlankRow, getNextTaskIdentifier]);

  useEffect(() => {
    const pending = computeHasPendingChanges(editableRows);
    setHasChanges(prev => (prev === pending ? prev : pending));
  }, [computeHasPendingChanges, editableRows]);

  useEffect(() => {
    let modified = false;
    setEditableRows(prev => {
      if (!prev.length) return prev;
      const [first, ...rest] = prev;
      if (!(first._isNew || first.isDraft)) return prev;

      const updatedFirst = { ...first };

      if (defaultClient && defaultClient !== first.cliente) {
        updatedFirst.cliente = defaultClient;
        modified = true;
      }

      if (defaultStatusName && defaultStatusName !== first.status) {
        updatedFirst.status = defaultStatusName;
        modified = true;
      }

      if (!modified) return prev;

      return [updatedFirst, ...rest];
    });

    if (modified) {
      setHasChanges(true);
    }
  }, [defaultClient, defaultStatusName]);

  useEffect(() => {
    const columnKeys = allColumns.map(column => column.key);

    setColumnOrder(prev => {
      if (!prev.length) {
        return columnKeys;
      }

      const filtered = prev.filter(key => columnKeys.includes(key));
      const missing = columnKeys.filter(key => !filtered.includes(key));
      const next = [...filtered, ...missing];

      if (next.length === prev.length && next.every((key, index) => key === prev[index])) {
        return prev;
      }

      return next;
    });

    setColumnWidths(prev => {
      const validEntries = Object.entries(prev).filter(([key]) => columnKeys.includes(key));
      if (validEntries.length === Object.entries(prev).length) {
        return prev;
      }

      return validEntries.reduce<Record<string, number>>((accumulator, [key, value]) => {
        accumulator[key] = value;
        return accumulator;
      }, {});
    });
  }, [allColumns]);

  const orderedColumnKeys = useMemo(() => {
    if (!columnOrder.length) {
      return allColumns.map(column => column.key);
    }

    const keys = allColumns.map(column => column.key);
    const filtered = columnOrder.filter(key => keys.includes(key));
    const missing = keys.filter(key => !filtered.includes(key));
    return [...filtered, ...missing];
  }, [allColumns, columnOrder]);

  const orderedColumns = useMemo(
    () =>
      orderedColumnKeys
        .map(key => allColumns.find(column => column.key === key) ?? null)
        .filter((column): column is ColumnDefinition => Boolean(column)),
    [orderedColumnKeys, allColumns],
  );

  const visibleColumns = orderedColumns.filter(col => !hiddenColumns.includes(col.key));

  const formatCustomFieldValueForExport = useCallback((row: TaskRow, column: Extract<ColumnDefinition, { isCustom: true }>) => {
    const customValue = row.custom_fields?.[column.field.field_name];

    switch (column.field.field_type) {
      case 'checkbox':
        return customValue ? 'Sim' : 'Não';
      case 'monetary': {
        const numeric = typeof customValue === 'number'
          ? customValue
          : typeof customValue === 'string'
            ? Number(customValue)
            : undefined;
        if (typeof numeric === 'number' && !Number.isNaN(numeric)) {
          return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(numeric);
        }
        return '-';
      }
      case 'percentage': {
        const numeric = typeof customValue === 'number'
          ? customValue
          : typeof customValue === 'string'
            ? Number(customValue)
            : undefined;
        if (typeof numeric === 'number' && !Number.isNaN(numeric)) {
          return `${numeric}%`;
        }
        return '-';
      }
      default: {
        if (Array.isArray(customValue)) {
          return customValue.length > 0 ? customValue.join(', ') : '-';
        }
        if (customValue === null || customValue === undefined) {
          return '-';
        }
        if (typeof customValue === 'boolean') {
          return customValue ? 'Sim' : 'Não';
        }
        const text = String(customValue).trim();
        return text.length > 0 ? text : '-';
      }
    }
  }, []);

  const formatColumnValueForExport = useCallback((row: TaskRow, column: ColumnDefinition): string => {
    if ('isCustom' in column && column.isCustom) {
      return formatCustomFieldValueForExport(row, column);
    }

    const value = row[column.key as keyof TaskRow];
    const isEmptyString = typeof value === 'string' && value.trim() === '';
    const isNullish = value === null || value === undefined;

    switch (column.key) {
      case 'task_id': {
        const taskIdValue = typeof row.task_id === 'string' ? row.task_id.trim() : '';
        if (taskIdValue) {
          return taskIdValue;
        }
        return row.isDraft || row._isNew ? 'Novo' : '-';
      }
      case 'tempo_total': {
        const storedSeconds = getStoredTempoTotalSeconds(row);
        if (!row.id) {
          return formatDuration(storedSeconds);
        }
        const totalSeconds = getRowAccumulatedSeconds(row);
        const formattedDuration = formatDuration(totalSeconds);
        const isRunning = Boolean(row.id && activeTimers[row.id]);
        return isRunning ? `${formattedDuration} (Em andamento)` : formattedDuration;
      }
      case 'percentual_conclusao':
        return typeof value === 'number' ? `${value}%` : '0%';
      case 'cronograma':
        return value ? 'Sim' : 'Não';
      case 'etapa_projeto': {
        if (typeof value === 'string' && value.trim().length > 0) {
          return stageNameById.get(value) ?? value;
        }
        return '-';
      }
      case 'sub_etapa_projeto': {
        if (typeof value === 'string' && value.trim().length > 0) {
          return subStageNameById.get(value)?.label ?? value;
        }
        return '-';
      }
      case 'data_vencimento': {
        if (isNullish || isEmptyString) {
          return '-';
        }
        const date = new Date(String(value));
        if (Number.isNaN(date.getTime())) {
          return String(value);
        }
        try {
          return format(date, 'dd/MM/yyyy');
        } catch {
          return String(value);
        }
      }
      case 'data_inicio': {
        if (isNullish || isEmptyString) {
          return '-';
        }
        const date = new Date(String(value));
        if (Number.isNaN(date.getTime())) {
          return String(value);
        }
        try {
          return format(date, 'dd/MM/yyyy');
        } catch {
          return String(value);
        }
      }
      case 'escopo':
        if (value === 'Sim' || value === 'Não') {
          return value;
        }
        break;
      default:
        break;
    }

    if (isNullish) {
      return '-';
    }

    if (typeof value === 'boolean') {
      return value ? 'Sim' : 'Não';
    }

    const textValue = String(value).trim();
    return textValue.length > 0 ? textValue : '-';
  }, [
    activeTimers,
    formatCustomFieldValueForExport,
    formatDuration,
    getStoredTempoTotalSeconds,
    getRowAccumulatedSeconds,
    stageNameById,
    subStageNameById,
  ]);

  const handleExportToExcel = useCallback(() => {
    if (!editableRows.length) {
      toast({
        title: 'Nenhuma tarefa para exportar',
        description: 'Adicione ou carregue tarefas antes de exportar os dados.',
      });
      return;
    }

    if (!visibleColumns.length) {
      toast({
        title: 'Nenhuma coluna visível',
        description: 'Ative ao menos uma coluna para exportar o grid.',
      });
      return;
    }

    const headerRow = visibleColumns.map(column => column.label);
    const dataRows = editableRows.map(row => visibleColumns.map(column => formatColumnValueForExport(row, column)));

    const worksheet = XLSX.utils.aoa_to_sheet([headerRow, ...dataRows]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Tarefas');

    const timestamp = format(new Date(), 'yyyyMMdd-HHmmss');
    XLSX.writeFile(workbook, `tarefas-${timestamp}.xlsx`);

    toast({
      title: 'Exportação concluída',
      description: `${editableRows.length} ${editableRows.length === 1 ? 'tarefa' : 'tarefas'} exportada(s) com sucesso.`,
    });
  }, [
    editableRows,
    formatColumnValueForExport,
    toast,
    visibleColumns,
  ]);

  const parseCustomFieldValueForImport = useCallback((field: CustomField, rawValue: unknown) => {
    if (rawValue === null || rawValue === undefined || rawValue === '') {
      return undefined;
    }

    switch (field.field_type) {
      case 'checkbox': {
        const parsed = parseBooleanCell(rawValue);
        return parsed === null ? undefined : parsed;
      }
      case 'percentage': {
        const parsed = parsePercentageCell(rawValue);
        return parsed === null ? undefined : parsed;
      }
      case 'monetary': {
        const parsed = parseCurrencyCell(rawValue);
        return parsed === null ? undefined : parsed;
      }
      case 'numeric': {
        const parsed = parseNumericCell(rawValue);
        return parsed === null ? undefined : parsed;
      }
      case 'tags': {
        const tags = parseTagsCell(rawValue);
        return tags.length ? Array.from(new Set(tags)) : undefined;
      }
      default: {
        const text = String(rawValue).trim();
        return text.length ? text : undefined;
      }
    }
  }, []);

  const handleImportData = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleImportFileChange = useCallback(async (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const getCellValue = (row: Record<string, unknown>, label: string) => {
      if (Object.prototype.hasOwnProperty.call(row, label)) {
        return row[label];
      }

      const normalizedLabel = normalizeHeader(label);
      const matchKey = Object.keys(row).find(key => normalizeHeader(key) === normalizedLabel);
      if (matchKey) {
        return row[matchKey];
      }

      return undefined;
    };

    const getCellString = (row: Record<string, unknown>, label: string) => {
      const value = getCellValue(row, label);
      if (value === null || value === undefined) {
        return undefined;
      }

      if (typeof value === 'string') {
        const trimmed = value.trim();
        return trimmed.length > 0 ? trimmed : undefined;
      }

      if (typeof value === 'number') {
        return String(value);
      }

      return String(value).trim() || undefined;
    };

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

      const formattedRows = rows
        .map(row => {
          const tarefa = getCellString(row, 'Tarefa');
          if (!tarefa) {
            return null;
          }

          const payload: Partial<TaskFormData> = {
            project_id: projectId,
            tarefa,
          };

          const taskId = getCellString(row, 'ID');
          if (taskId) {
            payload.task_id = taskId;
          }

          const descricaoTarefa = getCellString(row, 'Descrição Tarefa');
          if (descricaoTarefa) {
            payload.descricao_tarefa = descricaoTarefa;
          }

          const solucao = getCellString(row, 'Atividade');
          if (solucao) {
            payload.solucao = solucao;
          }

          const prioridade = getCellString(row, 'Prioridade');
          if (prioridade) {
            payload.prioridade = prioridade as Task['prioridade'];
          }

          const status = getCellString(row, 'Status');
          if (status) {
            payload.status = status;
          }

          const cliente = getCellString(row, 'Cliente');
          if (cliente) {
            payload.cliente = cliente;
          }

          const responsavel = getCellString(row, 'Responsável');
          if (responsavel) {
            payload.responsavel = responsavel;
          }

          const modulo = getCellString(row, 'Módulo');
          if (modulo) {
            payload.modulo = modulo;
          }

          const area = getCellString(row, 'Área');
          if (area) {
            payload.area = area;
          }

          const categoria = getCellString(row, 'Categoria');
          if (categoria) {
            payload.categoria = categoria;
          }

          const etapaProjeto = getCellString(row, 'Etapa do Projeto');
          if (etapaProjeto) {
            payload.etapa_projeto = etapaProjeto;
          }

          const subEtapa = getCellString(row, 'Sub-Etapa');
          if (subEtapa) {
            payload.sub_etapa_projeto = subEtapa;
          }

          const criticidade = getCellString(row, 'Criticidade');
          if (criticidade) {
            payload.criticidade = criticidade;
          }

          const escopo = getCellString(row, 'Escopo');
          if (escopo) {
            payload.escopo = escopo;
          }

          const cronogramaCell = getCellValue(row, 'Cronograma?');
          const cronograma = parseBooleanCell(cronogramaCell);
          if (cronograma !== null) {
            payload.cronograma = cronograma;
          }

          const percentual = parsePercentageCell(getCellValue(row, '% Conclusão'));
          if (percentual !== null) {
            payload.percentual_conclusao = percentual;
          }

          const startDateCell = getCellValue(row, 'Início') ?? getCellValue(row, 'Data Início');
          const startDate = parseExcelDate(startDateCell);
          const dueDate = parseExcelDate(getCellValue(row, 'Vencimento'));
          if (dueDate) {
            payload.data_vencimento = dueDate;
          }

          const customValues: Record<string, unknown> = {};
          columnLabelMap.forEach((column, label) => {
            if (!('isCustom' in column) || !column.isCustom) {
              return;
            }

            const rawValue = getCellValue(row, label);
            if (rawValue === undefined) {
              return;
            }

            const parsedValue = parseCustomFieldValueForImport(column.field, rawValue);
            if (parsedValue !== undefined) {
              customValues[column.field.field_name] = parsedValue;
            }
          });

          if (Object.keys(customValues).length > 0) {
            payload.custom_fields = customValues;
          }

          return payload;
        })
        .filter((row): row is Partial<TaskFormData> => Boolean(row));

      if (formattedRows.length === 0) {
        toast({
          title: 'Nenhum dado válido encontrado',
          description: 'Verifique se a planilha segue o modelo de importação.',
          variant: 'destructive',
        });
        return;
      }

      let createdCount = 0;
      let failedCount = 0;

      for (const payload of formattedRows) {
        try {
          const result = await createTaskMutation(payload);
          if (result) {
            createdCount += 1;
          }
        } catch (error) {
          console.error('Erro ao importar tarefa', error);
          failedCount += 1;
        }
      }

      if (createdCount > 0) {
        toast({
          title: 'Importação concluída',
          description: `${createdCount} tarefa${createdCount === 1 ? '' : 's'} importada${
            createdCount === 1 ? '' : 's'
          } com sucesso.${
            failedCount
              ? ` ${failedCount} registro${failedCount === 1 ? '' : 's'} não pôde${
                failedCount === 1 ? '' : 'ram'
              } ser importado${failedCount === 1 ? '' : 's'}.`
              : ''
          }`,
        });
      } else {
        toast({
          title: 'Nenhum dado importado',
          description: 'Não foi possível importar os dados da planilha.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Erro ao importar dados de tarefas', error);
      toast({
        title: 'Erro ao importar dados',
        description: 'Não foi possível ler a planilha informada.',
        variant: 'destructive',
      });
    } finally {
      if (event.target) {
        event.target.value = '';
      }
      setIsImporting(false);
    }
  }, [
    columnLabelMap,
    createTaskMutation,
    parseCustomFieldValueForImport,
    projectId,
    toast,
  ]);


  const toggleColumn = useCallback((columnKey: string) => {
    setHiddenColumns(prev => {
      if (prev.includes(columnKey)) {
        return prev.filter(key => key !== columnKey);
      }

      const nextHidden = [...prev, columnKey];
      const visibleCount = allColumns.reduce((count, column) => {
        return nextHidden.includes(column.key) ? count : count + 1;
      }, 0);

      if (visibleCount <= 0) {
        return prev;
      }

      return nextHidden;
    });
  }, [allColumns]);

  const getColumnBaseWidth = useCallback(
    (columnKey: string) => {
      const column = allColumns.find(item => item.key === columnKey);
      if (column?.width) {
        const parsed = Number.parseInt(column.width, 10);
        if (!Number.isNaN(parsed)) {
          return parsed;
        }
      }
      return 140;
    },
    [allColumns],
  );

  const getColumnWidth = useCallback(
    (columnKey: string) => {
      const storedWidth = columnWidths[columnKey];
      return storedWidth ?? getColumnBaseWidth(columnKey);
    },
    [columnWidths, getColumnBaseWidth],
  );

  const handleResizeStart = useCallback(
    (event: React.MouseEvent<HTMLDivElement>, columnKey: string) => {
      event.preventDefault();
      event.stopPropagation();

      const initialX = event.clientX;
      const initialWidth = getColumnWidth(columnKey);

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const delta = moveEvent.clientX - initialX;
        const nextWidth = Math.max(80, initialWidth + delta);
        setColumnWidths(prev => {
          if (prev[columnKey] === nextWidth) {
            return prev;
          }

          return {
            ...prev,
            [columnKey]: nextWidth,
          };
        });
      };

      const handleMouseUp = () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    },
    [getColumnWidth],
  );

  const handleAutoResizeColumn = useCallback((columnKey: string) => {
    const column = allColumns.find(item => item.key === columnKey);
    if (!column) {
      return;
    }

    const normalizeValue = (value: unknown): string => {
      if (value === null || value === undefined) {
        return '';
      }
      if (Array.isArray(value)) {
        return value.filter(item => item !== undefined && item !== null).join(', ');
      }
      if (typeof value === 'boolean') {
        return value ? 'Sim' : 'Não';
      }
      const date = new Date(String(value));
      if (!Number.isNaN(date.getTime()) && typeof value === 'string' && value.includes('-')) {
        try {
          return format(date, 'dd/MM/yyyy');
        } catch (error) {
          console.error('Erro ao formatar data ao ajustar coluna:', error);
        }
      }
      return String(value);
    };

    const getCustomFieldText = (field: CustomField, row: TaskRow): string => {
      const customValue = row.custom_fields?.[field.field_name];

      switch (field.field_type) {
        case 'checkbox':
          return customValue ? 'Sim' : 'Não';
        case 'monetary': {
          const numeric = typeof customValue === 'number'
            ? customValue
            : typeof customValue === 'string'
              ? Number(customValue)
              : undefined;
          if (typeof numeric === 'number' && !Number.isNaN(numeric)) {
            return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(numeric);
          }
          return '';
        }
        case 'percentage': {
          const numeric = typeof customValue === 'number'
            ? customValue
            : typeof customValue === 'string'
              ? Number(customValue)
              : undefined;
          if (typeof numeric === 'number' && !Number.isNaN(numeric)) {
            return `${numeric}%`;
          }
          return '';
        }
        default:
          return normalizeValue(customValue);
      }
    };

    const getRowText = (row: TaskRow): string => {
      if ('isCustom' in column && column.isCustom) {
        return getCustomFieldText(column.field, row);
      }

      const value = row[column.key as keyof TaskRow];

      switch (column.key) {
        case 'task_id':
          return row.isDraft || row._isNew ? 'Novo' : normalizeValue(value);
        case 'percentual_conclusao':
          return typeof value === 'number' ? `${value}%` : '';
        case 'tempo_total': {
          const storedSeconds = getStoredTempoTotalSeconds(row);
          const totalSeconds = row.id ? getRowAccumulatedSeconds(row) : storedSeconds;
          const hours = Math.floor(totalSeconds / 3600);
          const mins = Math.floor((totalSeconds % 3600) / 60);
          return `${hours}h ${mins}m`;
        }
        case 'data_inicio':
        case 'data_vencimento': {
          if (!value) {
            return '';
          }
          const date = new Date(String(value));
          if (!Number.isNaN(date.getTime())) {
            try {
              return format(date, 'dd/MM/yyyy');
            } catch (error) {
              console.error('Erro ao formatar data ao ajustar coluna:', error);
            }
          }
          return String(value);
        }
        default:
          return normalizeValue(value);
      }
    };

    const headerLength = column.label.length;
    const contentLength = editableRows.reduce((maxLength, row) => {
      const text = getRowText(row);
      return Math.max(maxLength, text.length);
    }, headerLength);

    const averageCharacterWidth = 7;
    const padding = 48;
    const baseWidth = getColumnBaseWidth(columnKey);
    const minimalWidth = Math.max(80, Math.min(baseWidth, 120));
    let computedWidth = Math.round(contentLength * averageCharacterWidth + padding);

    if ('isCustom' in column && column.isCustom && column.field.field_type === 'checkbox') {
      computedWidth = Math.max(computedWidth, 120);
    }

    computedWidth = Math.max(computedWidth, minimalWidth);
    computedWidth = Math.min(computedWidth, 600);

    setColumnWidths(prev => {
      if (prev[columnKey] === computedWidth) {
        return prev;
      }
      return {
        ...prev,
        [columnKey]: computedWidth,
      };
    });
  }, [allColumns, editableRows, getColumnBaseWidth, getRowAccumulatedSeconds]);

  const handleDragStart = useCallback((event: React.DragEvent<HTMLTableCellElement>, columnKey: string) => {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', columnKey);
    setDraggingColumn(columnKey);
  }, []);

  const handleDragEnter = useCallback(
    (event: React.DragEvent<HTMLTableCellElement>, targetKey: string) => {
      event.preventDefault();
      if (!draggingColumn || draggingColumn === targetKey) {
        return;
      }
      setDragOverColumn(targetKey);
    },
    [draggingColumn],
  );

  const handleDragOver = useCallback((event: React.DragEvent<HTMLTableCellElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLTableCellElement>, targetKey: string) => {
      event.preventDefault();
      const sourceKey = event.dataTransfer.getData('text/plain') || draggingColumn;

      if (!sourceKey || sourceKey === targetKey) {
        setDraggingColumn(null);
        setDragOverColumn(null);
        return;
      }

      setColumnOrder(prev => {
        if (!prev.length) {
          return prev;
        }

        const next = [...prev];
        const sourceIndex = next.indexOf(sourceKey);
        const targetIndex = next.indexOf(targetKey);

        if (sourceIndex === -1 || targetIndex === -1) {
          return prev;
        }

        next.splice(sourceIndex, 1);
        next.splice(targetIndex, 0, sourceKey);

        if (next.length === prev.length && next.every((key, index) => key === prev[index])) {
          return prev;
        }

        return next;
      });

      setDraggingColumn(null);
      setDragOverColumn(null);
    },
    [draggingColumn],
  );

  const handleDragEnd = useCallback(() => {
    setDraggingColumn(null);
    setDragOverColumn(null);
  }, []);

  const updateCell = (index: number, field: string, value: unknown) => {
    setEditableRows(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value as TaskRow[keyof TaskRow] };
      return updated;
    });
    setHasChanges(true);
  };

  const applyResponsavelToRow = useCallback(
    (row: TaskRow, value: string | undefined, preservedUserId?: string | null): TaskRow => {
      const trimmed = typeof value === 'string' ? value.trim() : '';

      if (!trimmed) {
        return { ...row, responsavel: undefined, user_id: null };
      }

      const matchingMember = activeTeamMembers.find(member => member.name === trimmed);

      if (matchingMember?.id) {
        return { ...row, responsavel: trimmed, user_id: matchingMember.id };
      }

      return {
        ...row,
        responsavel: trimmed,
        user_id: preservedUserId ?? (typeof row.user_id === 'string' ? row.user_id : null),
      };
    },
    [activeTeamMembers],
  );

  const updateResponsavel = useCallback(
    (index: number, value: string | undefined, preservedUserId?: string | null) => {
      let didChange = false;

      setEditableRows(prev => {
        if (index < 0 || index >= prev.length) {
          return prev;
        }

        const next = [...prev];
        const currentRow = next[index];

        if (!currentRow) {
          return prev;
        }

        const fallbackUserId =
          preservedUserId ?? (typeof currentRow.user_id === 'string' ? currentRow.user_id : null);

        const updatedRow = applyResponsavelToRow(currentRow, value, fallbackUserId);

        if (
          currentRow.responsavel === updatedRow.responsavel &&
          currentRow.user_id === updatedRow.user_id
        ) {
          return prev;
        }

        next[index] = updatedRow;
        didChange = true;
        return next;
      });

      if (didChange) {
        setHasChanges(true);
      }
    },
    [applyResponsavelToRow],
  );

  const closeResponsavelDialog = useCallback(() => {
    setPendingResponsavelAssignment(null);
    setSelectedResponsavelForTimer(null);
  }, []);

  const closeStopTimerDialog = useCallback(() => {
    setPendingStopTimer(null);
    setStopTimerActivityDescription('');
    setStopTimerError(null);
  }, []);

  const openStopTimerDialog = useCallback(
    (row: TaskRow, rowIndex: number) => {
      if (!row.id) {
        toast({
          title: 'Atenção',
          description: 'Salve a tarefa antes de finalizar o apontamento.',
          variant: 'destructive',
        });
        return;
      }

      const runningLog = timeLogs.find(log => log.task_id === row.id && !log.data_fim);

      if (!activeTimers[row.id] && !runningLog) {
        toast({
          title: 'Nenhum apontamento em andamento',
          description: 'Inicie o cronômetro desta tarefa para registrar a atividade.',
        });
        return;
      }

      if (!activeTimers[row.id] && runningLog?.data_inicio) {
        const startedAt = new Date(runningLog.data_inicio).getTime();
        if (Number.isFinite(startedAt)) {
          applyActiveTimersUpdate(prev => {
            if (prev[row.id!]) {
              return prev;
            }
            return { ...prev, [row.id!]: startedAt };
          });
        }
      }

      const startedAtTimestamp = typeof row.id === 'string' ? activeTimers[row.id] ?? null : null;

      setPendingStopTimer({
        rowIndex,
        row,
        logId: runningLog?.id ?? null,
        existingActivity: runningLog?.atividade ?? null,
        startedAt: startedAtTimestamp,
      });
      const existingDescription =
        typeof runningLog?.atividade === 'string' && runningLog.atividade.trim().length > 0
          ? runningLog.atividade
          : '';
      setStopTimerActivityDescription(existingDescription ?? '');
      setStopTimerError(null);
    },
    [activeTimers, timeLogs, toast, applyActiveTimersUpdate],
  );

  interface StopTimerOptions {
    rowIndex?: number;
    statusAfterStop?: string | null;
    activityDescription?: string | null;
    timeLogId?: string | null;
    existingActivity?: string | null;
    startedAtMs?: number | null;
    allowCreateIfMissing?: boolean;
  }

  const handleStopTimer = async (row: TaskRow, options?: StopTimerOptions) => {
    if (!row.id) {
      toast({
        title: 'Atenção',
        description: 'Salve a tarefa antes de finalizar o apontamento.',
        variant: 'destructive',
      });
      return false;
    }

    const removeActiveTimer = () => {
      applyActiveTimersUpdate(prev => {
        if (!prev[row.id!]) {
          return prev;
        }
        const next = { ...prev };
        delete next[row.id!];
        return next;
      });
    };

    const activityDescription = options?.activityDescription?.trim();

    if (!activityDescription) {
      toast({
        title: 'Descrição obrigatória',
        description: 'Informe a descrição da atividade para finalizar o apontamento.',
        variant: 'destructive',
      });
      return false;
    }

    try {
      const { data: taskRecord } = await getTaskById(row.id);
      const resolvedUserId = await resolveResponsibleUserId(taskRecord);

      const activeLogId = options?.timeLogId
        ? options.timeLogId
        : await (async () => {
            const { data: activeLog, error } = await supabase
              .from('time_logs')
              .select('id')
              .eq('task_id', taskRecord.id)
              .eq('user_id', resolvedUserId)
              .is('data_fim', null)
              .maybeSingle();

            if (error) {
              throw error;
            }

            return activeLog?.id ?? null;
          })();

      if (!activeLogId) {
        toast({
          title: 'Nenhum apontamento em andamento',
          description: 'Inicie o cronômetro desta tarefa para registrar a atividade.',
        });
        return false;
      }

      await stopTaskTimer(activeLogId, activityDescription);

      removeActiveTimer();

      if (options?.statusAfterStop && typeof options.rowIndex === 'number') {
        updateCell(options.rowIndex, 'status', options.statusAfterStop);
      }

      await refreshTimeLogs();

      const { data: totalMinutes } = await sumDailyMinutes(resolvedUserId, new Date().toISOString());
      if (totalMinutes > 600) {
        toast({
          title: 'Atenção',
          description: 'Você ultrapassou 10h de apontamentos hoje.',
        });
      }

      return true;
    } catch (error) {
      console.error('Erro ao finalizar apontamento de tempo:', error);
      const description =
        error instanceof Error ? error.message : 'Não foi possível finalizar o apontamento.';
      toast({ title: 'Erro ao finalizar apontamento', description, variant: 'destructive' });
      return false;
    }
  };

  const handleConfirmStopTimerDialog = useCallback(async () => {
    if (!pendingStopTimer) {
      return;
    }

    const trimmedDescription = stopTimerActivityDescription.trim();
    if (!trimmedDescription) {
      setStopTimerError('Informe a atividade realizada para finalizar o apontamento.');
      return;
    }

    const { rowIndex, row: storedRow } = pendingStopTimer;
    const currentRow = editableRows[rowIndex] ?? storedRow;

    if (!currentRow || !currentRow.id) {
      setStopTimerError('Não foi possível identificar a tarefa selecionada.');
      return;
    }

    setIsSubmittingStopTimer(true);
    setStopTimerError(null);

    try {
      const didStop = await handleStopTimer(currentRow, {
        rowIndex,
        activityDescription: trimmedDescription,
        timeLogId: pendingStopTimer.logId ?? null,
        existingActivity:
          typeof pendingStopTimer.existingActivity === 'string'
            ? pendingStopTimer.existingActivity
            : null,
        startedAtMs: pendingStopTimer.startedAt ?? null,
        allowCreateIfMissing: true,
      });

      if (didStop) {
        closeStopTimerDialog();
      } else {
        setStopTimerError('Não foi possível registrar o tempo. Tente novamente.');
      }
    } finally {
      setIsSubmittingStopTimer(false);
    }
  }, [closeStopTimerDialog, editableRows, handleStopTimer, pendingStopTimer, stopTimerActivityDescription]);

  const handleStopDialogOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        closeStopTimerDialog();
      }
    },
    [closeStopTimerDialog],
  );

  const startTimer = useCallback(
    async (row: TaskRow) => {
      if (!row.id) {
        toast({
          title: 'Atenção',
          description: 'Salve a tarefa antes de iniciar o apontamento de tempo.',
          variant: 'destructive',
        });
        return;
      }

      try {
        const { data: taskRecord } = await getTaskById(row.id);

        if (!canStartTimer(taskRecord)) {
          toast({
            title: 'Responsável obrigatório',
            description: 'Defina o user_id da tarefa ou um responsável vinculado a um usuário válido.',
            variant: 'destructive',
          });
          return;
        }

        const resolvedUserId = await resolveResponsibleUserId(taskRecord);
        const { data: startedLog } = await startTaskTimer(taskRecord.id, taskRecord.project_id, resolvedUserId);

        const referenceStart = startedLog?.data_inicio
          ? new Date(startedLog.data_inicio).getTime()
          : Date.now();

        applyActiveTimersUpdate(prev => {
          if (prev[taskRecord.id]) {
            return prev;
          }
          return { ...prev, [taskRecord.id]: referenceStart };
        });
      } catch (error) {
        console.error('Erro ao iniciar apontamento de tempo:', error);
        const description =
          error instanceof Error ? error.message : 'Não foi possível iniciar o apontamento.';
        toast({ title: 'Erro ao iniciar apontamento', description, variant: 'destructive' });
      }
    },
    [applyActiveTimersUpdate, getTaskById, resolveResponsibleUserId, startTaskTimer, toast],
  );

  const handleConfirmResponsavelAssignment = async () => {
    if (!pendingResponsavelAssignment || !selectedResponsavelForTimer) {
      return;
    }

    const trimmedResponsavel = selectedResponsavelForTimer.trim();
    if (!trimmedResponsavel) {
      return;
    }

    const { row, rowIndex } = pendingResponsavelAssignment;
    const previousResponsavel = typeof row.responsavel === 'string' ? row.responsavel : null;
    const previousUserId = typeof row.user_id === 'string' ? row.user_id : null;

    const applyLocalResponsavelUpdate = (value: string | null, userIdOverride?: string | null) => {
      updateResponsavel(rowIndex, value ?? undefined, userIdOverride ?? previousUserId ?? null);
    };

    setIsSavingResponsavelForTimer(true);

    try {
      applyLocalResponsavelUpdate(trimmedResponsavel);

      if (row.id) {
        const updated = await updateTask(row.id, { responsavel: trimmedResponsavel });
        if (!updated) {
          applyLocalResponsavelUpdate(previousResponsavel, previousUserId);
          return;
        }
      }

      await startTimer({ ...row, responsavel: trimmedResponsavel });
      closeResponsavelDialog();
    } catch (error) {
      console.error('Erro ao associar responsável antes de iniciar o cronômetro:', error);
      applyLocalResponsavelUpdate(previousResponsavel, previousUserId);
      toast({
        title: 'Erro ao definir responsável',
        description: 'Não foi possível associar o responsável selecionado. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsSavingResponsavelForTimer(false);
    }
  };

  const addNewRow = useCallback(() => {
    const nextTaskId = getNextTaskIdentifier();

    try {
      setEditableRows(prev => [...prev, createBlankRow(prev.length, nextTaskId)]);
      setHasChanges(true);
    } catch (error) {
      console.error('Erro ao preparar nova tarefa em rascunho:', error);
      toast({
        title: 'Erro ao preparar tarefa',
        description: 'Não foi possível preparar a nova tarefa. Tente novamente.',
        variant: 'destructive',
      });
    }
  }, [createBlankRow, editableRows, getNextTaskIdentifier, toast]);

  const handleToolbarAddTask = useCallback(() => {
    setActiveView('table');
    addNewRow();
  }, [addNewRow]);

  const performDeleteRow = useCallback(
    async (index: number): Promise<boolean> => {
      const row = editableRows[index];
      if (!row) {
        return false;
      }

      if (deletingRowIndex !== null) {
        return false;
      }

      const rowId = row.id ?? null;

      setDeletingRowIndex(index);

      try {
        if (rowId) {
          const success = await deleteTask(rowId);
          if (!success) {
            return false;
          }
        }

        setEditableRows(prev => prev.filter((_, i) => i !== index));
        setHasChanges(true);

        if (rowId) {
          applyActiveTimersUpdate(prev => {
            if (!prev[rowId]) {
              return prev;
            }

            const next = { ...prev };
            delete next[rowId];
            return next;
          });
        } else {
          toast({
            title: 'Rascunho removido',
            description: 'A tarefa em rascunho foi removida.',
          });
        }

        return true;
      } catch (error) {
        console.error('Erro ao excluir tarefa:', error);

        if (!rowId) {
          toast({
            title: 'Erro ao excluir tarefa',
            description: 'Não foi possível remover esta tarefa. Tente novamente.',
            variant: 'destructive',
          });
        }

        return false;
      } finally {
        setDeletingRowIndex(null);
      }
    },
    [applyActiveTimersUpdate, deleteTask, deletingRowIndex, editableRows, setHasChanges, toast],
  );

  const handleConfirmDeleteRow = useCallback(async () => {
    if (pendingDeleteRowIndex === null) {
      return;
    }

    const rowExists = editableRows[pendingDeleteRowIndex] !== undefined;
    if (!rowExists) {
      setPendingDeleteRowIndex(null);
      return;
    }

    const success = await performDeleteRow(pendingDeleteRowIndex);
    if (success) {
      setPendingDeleteRowIndex(null);
      return;
    }

    // Mesmo em caso de erro, fechar o diálogo após exibir a notificação apropriada.
    setPendingDeleteRowIndex(null);
  }, [editableRows, pendingDeleteRowIndex, performDeleteRow]);

  interface SaveRowOptions {
    suppressSuccessDialog?: boolean;
  }

  const handleSaveRow = useCallback(async (index: number, options: SaveRowOptions = {}) => {
    let row = editableRows[index];
    if (!row) {
      return null;
    }

    if (savingRowIndexRef.current !== null) {
      if (savingRowIndexRef.current === index && savingRowPromiseRef.current) {
        return savingRowPromiseRef.current;
      }

      const inFlight = savingRowPromiseRef.current;
      if (inFlight) {
        try {
          await inFlight;
        } catch {
          // Ignorar erros já tratados no fluxo original antes de prosseguir.
        }
      }

      row = editableRows[index];
      if (!row) {
        return null;
      }
    }

    const trimmedName = typeof row.tarefa === 'string' ? row.tarefa.trim() : '';
    if (!trimmedName) {
      setIsTaskNameRequiredDialogOpen(true);
      return null;
    }

    const executeSave = async (): Promise<Task | null> => {
      setSavingRowIndex(index);
      savingRowIndexRef.current = index;

      try {
        let rowToSave = row;
        const wasDraft = !rowToSave.id || rowToSave._isNew || rowToSave.isDraft;
        const normalizedOriginal: TaskRow | null = rowToSave.id
          ? (() => {
              const existing = tasks.find(taskItem => taskItem.id === rowToSave.id);
              if (!existing) {
                return null;
              }
              return {
                ...existing,
                custom_fields: existing.custom_fields ?? {},
              };
            })()
          : null;

        const sanitizedOriginal = normalizedOriginal ? sanitizeTaskForSave(normalizedOriginal) : null;
        const auditOperation: 'INSERT' | 'UPDATE' = wasDraft ? 'INSERT' : 'UPDATE';

        if (!row.task_id || row.task_id.trim().length === 0) {
          const generatedId = getNextTaskIdentifier();
          rowToSave = { ...row, task_id: generatedId };
          setEditableRows(prev =>
            prev.map((prevRow, idx) => {
              if (idx !== index) {
                return prevRow;
              }
              return { ...prevRow, task_id: generatedId };
            }),
          );
        }

        const payload = sanitizeTaskForSave(rowToSave);
        let savedTask: Task | null = null;

        if (!rowToSave.id || rowToSave._isNew || rowToSave.isDraft) {
          savedTask = await createTaskMutation(payload);
        } else {
          savedTask = await updateTask(rowToSave.id, payload);
        }

        if (!savedTask) {
          return null;
        }

        await ensureGapForTask(savedTask);

        setEditableRows(prev =>
          prev.map((prevRow, idx) => {
            if (idx !== index) {
              return prevRow;
            }
            return {
              ...savedTask,
              custom_fields: savedTask.custom_fields ?? {},
              _isNew: false,
              isDraft: false,
            };
          }),
        );

        if (!options.suppressSuccessDialog) {
          setSuccessDialogData({ task: savedTask, wasDraft });
          setIsSuccessDialogOpen(true);
          toast({
            title: wasDraft ? 'Tarefa criada' : 'Tarefa atualizada',
            description: 'Tarefa gravada com sucesso no Supabase.',
          });
        }

        const normalizedSavedTask: TaskRow = {
          ...savedTask,
          custom_fields: savedTask.custom_fields ?? {},
        };
        const sanitizedAfter = sanitizeTaskForSave(normalizedSavedTask);

        await logTaskChange({
          operation: auditOperation,
          task: savedTask,
          before: sanitizedOriginal,
          after: sanitizedAfter,
        });

        await refreshTasks();

        if (wasDraft) {
          addNewRow();
        }
        return savedTask;
      } catch (error) {
        console.error('Erro ao salvar tarefa individual:', error);
        toast({
          title: 'Erro ao salvar tarefa',
          description: 'Não foi possível salvar esta tarefa. Tente novamente.',
          variant: 'destructive',
        });
        return null;
      } finally {
        if (savingRowIndexRef.current === index) {
          savingRowIndexRef.current = null;
        }
        setSavingRowIndex(current => (current === index ? null : current));
      }
    };

    const saveOperation = executeSave();
    savingRowPromiseRef.current = saveOperation;

    try {
      const result = await saveOperation;
      return result;
    } finally {
      if (savingRowPromiseRef.current === saveOperation) {
        savingRowPromiseRef.current = null;
      }
    }
  }, [
    addNewRow,
    createTaskMutation,
    editableRows,
    ensureGapForTask,
    getNextTaskIdentifier,
    logTaskChange,
    refreshTasks,
    sanitizeTaskForSave,
    tasks,
    toast,
    updateTask,
  ]);

  const handleStartTimer = useCallback(
    async (row: TaskRow, rowIndex: number) => {
      let targetRow: TaskRow = row;

      if (!targetRow.id) {
        const savedTask = await handleSaveRow(rowIndex, { suppressSuccessDialog: true });
        if (!savedTask) {
          return;
        }

        targetRow = {
          ...savedTask,
          custom_fields: savedTask.custom_fields ?? {},
        };
      }

      if (!hasAssignedResponsible(targetRow, { allowedResponsibleNames: responsibleNameOptions })) {
        setPendingResponsavelAssignment({ row: targetRow, rowIndex });
        setSelectedResponsavelForTimer(null);
        return;
      }

      await startTimer(targetRow);
    },
    [
      handleSaveRow,
      hasAssignedResponsible,
      responsibleNameOptions,
      setPendingResponsavelAssignment,
      setSelectedResponsavelForTimer,
      startTimer,
    ],
  );

  const handleSuccessDialogDismiss = useCallback(() => {
    setIsSuccessDialogOpen(false);
    setSuccessDialogData(null);
  }, []);

  const handleTaskNameRequiredDialogClose = useCallback(() => {
    setIsTaskNameRequiredDialogOpen(false);
  }, []);


  const updateCustomFieldValue = (index: number, fieldName: string, value: unknown) => {
    setEditableRows(prev => {
      const updated = [...prev];
      const currentRow = { ...updated[index] };
      const customValues: Record<string, unknown> = { ...(currentRow.custom_fields || {}) };

      const isEmptyValue = (val: unknown) => {
        if (typeof val === 'boolean') return false;
        if (typeof val === 'number') return Number.isNaN(val);
        if (Array.isArray(val)) return val.length === 0;
        if (val === undefined || val === null) return true;
        if (typeof val === 'string') return val.trim() === '';
        return false;
      };

      if (isEmptyValue(value)) {
        delete customValues[fieldName];
      } else {
        customValues[fieldName] = value;
      }

      currentRow.custom_fields = customValues;
      updated[index] = currentRow;
      return updated;
    });
    setHasChanges(true);
  };

  const renderEditableCell = (row: TaskRow, rowIndex: number, column: ColumnDefinition) => {
    if ('isCustom' in column && column.isCustom) {
      const field = column.field;
      const customValue = row.custom_fields?.[field.field_name];

      switch (field.field_type) {
        case 'checkbox':
          return (
            <div className="flex justify-center">
              <Checkbox
                checked={Boolean(customValue)}
                onCheckedChange={(checked) => updateCustomFieldValue(rowIndex, field.field_name, Boolean(checked))}
              />
            </div>
          );
        case 'text':
        case 'text_short':
          return (
            <Input
              value={typeof customValue === 'string' ? customValue : ''}
              onChange={(e) => {
                const value = e.target.value.slice(0, 200);
                updateCustomFieldValue(rowIndex, field.field_name, value);
              }}
              className="h-8 text-xs"
              placeholder="Digite um valor"
              maxLength={200}
            />
          );
        case 'text_long':
          return (
            <Textarea
              value={typeof customValue === 'string' ? customValue : ''}
              onChange={(e) => {
                const value = e.target.value.slice(0, 5000);
                updateCustomFieldValue(rowIndex, field.field_name, value);
              }}
              className="min-h-[40px] text-xs resize-y"
              rows={isCondensedView ? 2 : 3}
              maxLength={5000}
              placeholder="Digite um valor"
            />
          );
        case 'dropdown':
          return (
            <Select
              value={typeof customValue === 'string' ? customValue : ''}
              onValueChange={(val) => updateCustomFieldValue(rowIndex, field.field_name, val)}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Selecionar" />
              </SelectTrigger>
              <SelectContent>
                {Array.from(new Set((field.field_options || [])
                  .filter((opt): opt is string => typeof opt === 'string' && opt.trim().length > 0)))
                  .map(option => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          );
        case 'tags': {
          const tagsValue = Array.isArray(customValue)
            ? customValue
            : typeof customValue === 'string'
              ? customValue.split(',').map(tag => tag.trim()).filter(Boolean)
              : [];
          return (
            <Input
              value={tagsValue.join(', ')}
              onChange={(e) => {
                const values = e.target.value
                  .split(',')
                  .map(tag => tag.trim())
                  .filter(Boolean);
                updateCustomFieldValue(rowIndex, field.field_name, values);
              }}
              className="h-8 text-xs"
              placeholder="tag1, tag2"
            />
          );
        }
        case 'numeric':
          return (
            <Input
              type="number"
              value={typeof customValue === 'number' ? customValue : ''}
              onChange={(e) => {
                const parsedValue = e.target.value === '' ? undefined : Number(e.target.value);
                const normalizedValue = typeof parsedValue === 'number' && !Number.isNaN(parsedValue)
                  ? parsedValue
                  : undefined;
                updateCustomFieldValue(rowIndex, field.field_name, normalizedValue);
              }}
              className="h-8 text-xs"
            />
          );
        case 'monetary': {
          const numericValue = typeof customValue === 'number'
            ? customValue
            : typeof customValue === 'string'
              ? Number(customValue)
              : undefined;
          return (
            <CurrencyInput
              value={typeof numericValue === 'number' && !Number.isNaN(numericValue) ? numericValue : ''}
              onChange={(val) => {
                if (!val) {
                  updateCustomFieldValue(rowIndex, field.field_name, undefined);
                  return;
                }
                const parsed = Number(val);
                updateCustomFieldValue(
                  rowIndex,
                  field.field_name,
                  Number.isNaN(parsed) ? undefined : parsed,
                );
              }}
              className="h-8 text-xs"
            />
          );
        }
        case 'percentage':
          return (
            <PercentageInput
              value={typeof customValue === 'number' ? customValue : customValue || ''}
              onChange={(val) => {
                if (!val) {
                  updateCustomFieldValue(rowIndex, field.field_name, undefined);
                  return;
                }
                const parsedValue = Number(val);
                const normalizedValue = Number.isNaN(parsedValue)
                  ? undefined
                  : Math.min(Math.max(parsedValue, 0), 100);
                updateCustomFieldValue(rowIndex, field.field_name, normalizedValue);
              }}
              className="h-8 text-xs"
            />
          );
        default:
          return (
            <Input
              value={typeof customValue === 'string' ? customValue : ''}
              onChange={(e) => updateCustomFieldValue(rowIndex, field.field_name, e.target.value)}
              className="h-8 text-xs"
              placeholder="Digite um valor"
            />
          );
      }
    }

    const value = row[column.key as keyof TaskRow];

    if (column.key === 'task_id') {
      const taskIdValue = typeof row.task_id === 'string' ? row.task_id.trim() : '';
      if (taskIdValue) {
        return <span className="text-xs font-medium text-foreground">{taskIdValue}</span>;
      }
      return (
        <span className="text-xs text-muted-foreground">
          {row.isDraft || row._isNew ? 'Novo' : String(value || '')}
        </span>
      );
    }

    if (column.key === 'cliente') {
      return (
        <Input
          value={String(value || '')}
          readOnly
          disabled
          className="h-8 text-xs cursor-not-allowed"
        />
      );
    }

    if (column.key === 'tempo_total') {
      const storedSeconds = getStoredTempoTotalSeconds(row);
      const totalSeconds = row.id ? getRowAccumulatedSeconds(row) : storedSeconds;
      const isRunning = Boolean(row.id && activeTimers[row.id]);

      return (
        <div className="flex flex-col text-xs">
          <span
            className={cn(
              'tabular-nums font-medium',
              isRunning ? 'font-bold text-red-600 dark:text-red-400' : 'text-foreground',
            )}
          >
            {formatDuration(totalSeconds)}
          </span>
          {isRunning ? (
            <span className="text-[10px] font-semibold uppercase text-red-500 dark:text-red-400">
              Cronometrando...
            </span>
          ) : null}
        </div>
      );
    }

    if (column.key === 'prioridade') {
      return (
        <Select
          value={value as string || 'Média'}
          onValueChange={(val) => updateCell(rowIndex, column.key, val)}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Baixa">Baixa</SelectItem>
            <SelectItem value="Média">Média</SelectItem>
            <SelectItem value="Alta">Alta</SelectItem>
            <SelectItem value="Crítica">Crítica</SelectItem>
          </SelectContent>
        </Select>
      );
    }

    if (column.key === 'status') {
      if (!filteredStatuses.length) {
        return (
          <Input
            value={typeof value === 'string' ? value : ''}
            onChange={(e) => updateCell(rowIndex, column.key, e.target.value)}
            className="h-8 text-xs"
            placeholder="Defina o status"
          />
        );
      }

      const hasMatchingStatus = typeof value === 'string'
        ? filteredStatuses.some(status => status.nome === value)
        : false;

      const currentStatus = hasMatchingStatus ? (value as string) : undefined;
      const placeholder = hasMatchingStatus
        ? undefined
        : typeof value === 'string' && value.trim().length > 0
          ? `${value} (inativo)`
          : 'Selecione';

      const normalizedStatusValue = typeof value === 'string' ? value.trim().toLowerCase() : undefined;
      const statusColor = normalizedStatusValue ? statusColorMap.get(normalizedStatusValue) : undefined;

      return (
        <Select
          value={currentStatus}
          onValueChange={(val) => updateCell(rowIndex, column.key, val)}
        >
          <SelectTrigger className="h-8 text-xs">
            <div className="flex w-full items-center gap-2">
              <span
                className="h-3 w-3 rounded-full border border-border/40"
                style={{ backgroundColor: statusColor ?? 'transparent' }}
              />
              <SelectValue
                placeholder={placeholder}
                className="flex-1 text-left [&>div]:flex [&>div]:items-center [&>div]:gap-2 [&>div>span:first-child]:hidden"
              />
            </div>
          </SelectTrigger>
          <SelectContent>
            {filteredStatuses
              .filter(status => typeof status.nome === 'string' && status.nome.trim().length > 0)
              .map(status => (
                <SelectItem key={status.id} value={status.nome}>
                  <div className="flex items-center gap-2">
                    <span
                      className="h-3 w-3 rounded-full border border-border/40"
                      style={{ backgroundColor: getStatusColorValue(status) }}
                    />
                    <span>{status.nome}</span>
                  </div>
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      );
    }

    if (column.key === 'percentual_conclusao') {
      return (
        <PercentageInput
          value={typeof value === 'number' ? value : ''}
          onChange={(val) => {
            if (!val) {
              updateCell(rowIndex, column.key, 0);
              return;
            }
            const parsed = Number(val);
            const normalized = Number.isNaN(parsed)
              ? 0
              : Math.min(Math.max(parsed, 0), 100);
            updateCell(rowIndex, column.key, normalized);
          }}
          className="h-8 text-xs"
        />
      );
    }

    if (column.key === 'criticidade') {
      return (
        <Select
          value={(value as string) || ''}
          onValueChange={(val) => updateCell(rowIndex, column.key, val)}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Selecione" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Baixa">Baixa</SelectItem>
            <SelectItem value="Média">Média</SelectItem>
            <SelectItem value="Alta">Alta</SelectItem>
            <SelectItem value="Crítica">Crítica</SelectItem>
          </SelectContent>
        </Select>
      );
    }

    if (column.key === 'escopo') {
      return (
        <Select
          value={(value as string) || ''}
          onValueChange={(val) => updateCell(rowIndex, column.key, val)}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Selecione" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Sim">Sim</SelectItem>
            <SelectItem value="Não">Não</SelectItem>
          </SelectContent>
        </Select>
      );
    }

    if (column.key === 'etapa_projeto') {
      const currentValue = typeof value === 'string' ? value : '';
      const hasValidStage = stageOptions.some(option => option.value === currentValue);
      return (
        <Select
          value={hasValidStage && currentValue ? currentValue : 'none'}
          onValueChange={(val) => {
            const normalized = val === 'none' ? undefined : val;
            updateCell(rowIndex, column.key, normalized);
            if (!normalized) {
              updateCell(rowIndex, 'sub_etapa_projeto', undefined);
            } else {
              const allowed = subStageOptionsByStage.get(normalized) ?? [];
              if (row.sub_etapa_projeto && !allowed.some(option => option.value === row.sub_etapa_projeto)) {
                updateCell(rowIndex, 'sub_etapa_projeto', undefined);
              }
            }
          }}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Selecionar etapa" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Sem etapa</SelectItem>
            {stageOptions.map(option => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
            {!hasValidStage && currentValue ? (
              <SelectItem value={currentValue} disabled>
                {currentValue} (inativa)
              </SelectItem>
            ) : null}
          </SelectContent>
        </Select>
      );
    }

    if (column.key === 'sub_etapa_projeto') {
      const stageId = typeof row.etapa_projeto === 'string' ? row.etapa_projeto : undefined;
      const options = stageId ? subStageOptionsByStage.get(stageId) ?? [] : [];
      const currentValue = typeof value === 'string' ? value : '';
      const hasValidSubStage = options.some(option => option.value === currentValue);
      return (
        <Select
          value={hasValidSubStage && currentValue ? currentValue : 'none'}
          onValueChange={(val) => updateCell(rowIndex, column.key, val === 'none' ? undefined : val)}
          disabled={!stageId || options.length === 0}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder={stageId ? 'Selecionar sub-etapa' : 'Selecione uma etapa'} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Sem sub-etapa</SelectItem>
            {options.map(option => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
            {!hasValidSubStage && currentValue ? (
              <SelectItem value={currentValue} disabled>
                {currentValue} (inativa)
              </SelectItem>
            ) : null}
          </SelectContent>
        </Select>
      );
    }

    if (column.key === 'cronograma') {
      const currentValue = Boolean(value);
      return (
        <Select
          value={currentValue ? 'sim' : 'nao'}
          onValueChange={(val) => updateCell(rowIndex, column.key, val === 'sim')}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Selecione" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="sim">Sim</SelectItem>
            <SelectItem value="nao">Não</SelectItem>
          </SelectContent>
        </Select>
      );
    }

    if (column.key === 'responsavel') {
      const responsavelOptions = activeTeamMembers;
      const currentValue = typeof value === 'string' ? value : '';
      const hasMatchingMember = responsavelOptions.some(member => member.name === currentValue);
      const isRunning = Boolean(row.id && activeTimers[row.id]);

      return (
        <Select
          value={hasMatchingMember ? currentValue : currentValue ? 'custom' : 'unassigned'}
          onValueChange={val => {
            if (val === 'unassigned' || val === 'custom') {
              updateResponsavel(rowIndex, undefined);
              return;
            }
            updateResponsavel(rowIndex, val);
          }}
        >
          <SelectTrigger
            className={cn(
              'h-8 text-xs',
              isRunning &&
                'border border-amber-300/80 bg-amber-50 text-amber-900 shadow-sm dark:border-amber-400/60 dark:bg-amber-400/20 dark:text-amber-100'
            )}
          >
            <SelectValue
              placeholder={responsavelOptions.length ? 'Selecione' : 'Sem membros disponíveis'}
              className={cn(isRunning && 'text-amber-900 dark:text-amber-100')}
            />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="unassigned">Sem responsável</SelectItem>
            {responsavelOptions.map(member => (
              <SelectItem key={member.id} value={member.name}>
                {member.name}
              </SelectItem>
            ))}
            {!hasMatchingMember && currentValue ? (
              <SelectItem disabled value="custom">
                {currentValue} (fora da equipe ativa)
              </SelectItem>
            ) : null}
          </SelectContent>
        </Select>
      );
    }

    if (column.key === 'data_inicio' || column.key === 'data_vencimento') {
      const normalizedValue = (() => {
        if (typeof value === 'string') {
          return value;
        }
        if (value instanceof Date && !Number.isNaN(value.getTime())) {
          return format(value, 'yyyy-MM-dd');
        }
        return undefined;
      })();

      return (
        <DatePicker
          value={normalizedValue}
          onChange={(val) => updateCell(rowIndex, column.key, val || undefined)}
          className="h-8 px-2 text-xs"
          showTodayButton
        />
      );
    }

    if (column.key === 'descricao_tarefa' || column.key === 'solucao') {
      return (
        <Textarea
          value={typeof value === 'string' ? value : ''}
          onChange={event => updateCell(rowIndex, column.key, event.target.value)}
          className="min-h-[60px] text-xs"
          placeholder={column.key === 'descricao_tarefa' ? 'Descreva a tarefa' : 'Descreva a atividade'}
        />
      );
    }

    if (column.key === 'modulo') {
      return (
        <CreatableSelect
          value={value as string || ''}
          onValueChange={async (val) => {
            if (!modulos.find(m => m.nome === val)) {
              await createModulo(val);
            }
            updateCell(rowIndex, column.key, val);
          }}
          options={modulos.map(m => m.nome)}
          placeholder="Selecionar módulo..."
          className="h-8 text-xs"
        />
      );
    }

    if (column.key === 'area') {
      return (
        <CreatableSelect
          value={value as string || ''}
          onValueChange={async (val) => {
            if (!areas.find(a => a.nome === val)) {
              await createArea(val);
            }
            updateCell(rowIndex, column.key, val);
          }}
          options={areas.map(a => a.nome)}
          placeholder="Selecionar área..."
          className="h-8 text-xs"
        />
      );
    }

    if (column.key === 'categoria') {
      return (
        <CreatableSelect
          value={value as string || ''}
          onValueChange={async (val) => {
            if (!categorias.find(c => c.nome === val)) {
              await createCategoria(val);
            }
            updateCell(rowIndex, column.key, val);
          }}
          options={categorias.map(c => c.nome)}
          placeholder="Selecionar categoria..."
          className="h-8 text-xs"
        />
      );
    }

    return (
      <Input
        value={String(value || '')}
        onChange={(e) => updateCell(rowIndex, column.key, e.target.value)}
        className="h-8 text-xs"
        placeholder={column.key === 'tarefa' ? 'Digite a tarefa' : ''}
      />
    );
  };

  const renderTaskSummaryValue = useCallback((row: TaskRow, column: ColumnDefinition): React.ReactNode => {
    if (!row) {
      return <span className="text-muted-foreground">-</span>;
    }

    if ('isCustom' in column && column.isCustom) {
      const customValue = row.custom_fields?.[column.field.field_name];

      if (column.field.field_type === 'checkbox') {
        return <span>{customValue ? 'Sim' : 'Não'}</span>;
      }

      if (Array.isArray(customValue)) {
        return customValue.length > 0
          ? customValue.join(', ')
          : <span className="text-muted-foreground">-</span>;
      }

      if (customValue === undefined || customValue === null || customValue === '') {
        return <span className="text-muted-foreground">-</span>;
      }

      if (column.field.field_type === 'monetary') {
        const numeric = typeof customValue === 'number'
          ? customValue
          : typeof customValue === 'string'
            ? Number(customValue)
            : undefined;
        if (typeof numeric === 'number' && !Number.isNaN(numeric)) {
          return <span>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(numeric)}</span>;
        }
      }

      if (column.field.field_type === 'percentage') {
        const numeric = typeof customValue === 'number'
          ? customValue
          : typeof customValue === 'string'
            ? Number(customValue)
            : undefined;
        if (typeof numeric === 'number' && !Number.isNaN(numeric)) {
          return <span>{`${numeric}%`}</span>;
        }
      }

      return <span>{String(customValue)}</span>;
    }

    const value = row[column.key as keyof TaskRow];
    const isEmptyString = typeof value === 'string' && value.trim() === '';
    const isNullish = value === null || value === undefined;

    if (column.key === 'task_id') {
      const taskIdValue = typeof row.task_id === 'string' ? row.task_id.trim() : '';
      if (taskIdValue) {
        return <span>{taskIdValue}</span>;
      }
      if (row.isDraft || row._isNew) {
        return <span className="text-muted-foreground">Novo</span>;
      }
      return <span className="text-muted-foreground">-</span>;
    }

    if (column.key === 'tempo_total') {
      if (!row.id) return <span className="text-muted-foreground">-</span>;
      const totalSeconds = getRowAccumulatedSeconds(row);
      const isRunning = Boolean(activeTimers[row.id]);
      return (
        <span className="flex items-center gap-1">
          <span
            className={cn(
              'tabular-nums font-medium',
              isRunning ? 'font-bold text-red-600 dark:text-red-400' : undefined,
            )}
          >
            {formatDuration(totalSeconds)}
          </span>
          {isRunning ? (
            <span className="text-[11px] font-semibold uppercase text-red-500 dark:text-red-400">
              Em andamento
            </span>
          ) : null}
        </span>
      );
    }

    if (column.key === 'percentual_conclusao') {
      if (typeof value === 'number') {
        return <span>{`${value}%`}</span>;
      }
      return <span className="text-muted-foreground">0%</span>;
    }

    if (column.key === 'cronograma') {
      return <span>{value ? 'Sim' : 'Não'}</span>;
    }

    if (column.key === 'etapa_projeto') {
      if (typeof value === 'string') {
        const stageName = stageNameById.get(value) ?? value;
        return <span>{stageName}</span>;
      }
      return <span className="text-muted-foreground">-</span>;
    }

    if (column.key === 'sub_etapa_projeto') {
      if (typeof value === 'string') {
        const subStageInfo = subStageNameById.get(value);
        return <span>{subStageInfo?.label ?? value}</span>;
      }
      return <span className="text-muted-foreground">-</span>;
    }

    if (column.key === 'data_inicio' || column.key === 'data_vencimento') {
      if (isNullish || isEmptyString) {
        return <span className="text-muted-foreground">-</span>;
      }

      const date = new Date(String(value));
      if (Number.isNaN(date.getTime())) {
        return <span>{String(value)}</span>;
      }

      return <span>{format(date, 'dd/MM/yyyy')}</span>;
    }

    if (column.key === 'escopo') {
      if (value === 'Sim' || value === 'Não') {
        return <span>{value}</span>;
      }
    }

    if (isNullish || isEmptyString) {
      return <span className="text-muted-foreground">-</span>;
    }

    return <span>{String(value)}</span>;
  }, [
    getRowAccumulatedSeconds,
    activeTimers,
    timerTick,
    formatDuration,
    stageNameById,
    subStageNameById,
  ]);

  const handleCloseTaskDialog = useCallback(() => {
    setTaskDialogState(null);
    taskDialogForm.reset(taskDialogDefaultValues);
  }, [taskDialogDefaultValues, taskDialogForm]);

  const isTaskDialogOpen = Boolean(taskDialogState);
  const currentDialogTask = taskDialogState?.task ?? null;
  const currentDialogMode = taskDialogState?.mode ?? 'view';
  const dialogViewValues = useMemo<TaskDialogFormValues>(() => {
    if (currentDialogTask) {
      return mapTaskToDialogValues(currentDialogTask);
    }
    return taskDialogForm.getValues();
  }, [currentDialogTask, taskDialogForm]);

  const renderViewFieldContent = useCallback(
    (field: TaskDialogField): React.ReactNode => {
      const raw = dialogViewValues[field.name];

      if (field.type === 'boolean') {
        return raw ? 'Sim' : 'Não';
      }

      if (raw === null || raw === undefined || raw === '') {
        return <span className="text-muted-foreground">—</span>;
      }

      if (field.type === 'date') {
        const formatted = formatDateForInput(String(raw));
        if (!formatted) {
          return String(raw);
        }
        const parsed = new Date(formatted);
        return Number.isNaN(parsed.getTime()) ? formatted : format(parsed, 'dd/MM/yyyy');
      }

      if (field.type === 'datetime') {
        return formatDateTimeForDisplay(String(raw));
      }

      if (field.type === 'json') {
        const valueString = typeof raw === 'string' ? raw : JSON.stringify(raw, null, 2);
        let normalized = valueString;
        try {
          normalized = JSON.stringify(JSON.parse(valueString), null, 2);
        } catch (error) {
          normalized = valueString;
        }
        return (
          <pre className="max-h-48 overflow-auto whitespace-pre-wrap text-xs">{normalized}</pre>
        );
      }

      return String(raw);
    },
    [dialogViewValues],
  );

  const handleOpenTaskDialog = useCallback(
    async (row: TaskRow, mode: 'view' | 'edit') => {
      if (!row.id) {
        toast({
          title: 'Salve a tarefa',
          description: 'É necessário salvar a tarefa antes de visualizar ou editar os detalhes.',
          variant: 'destructive',
        });
        return;
      }

      setTaskDialogLoading(true);
      try {
        const { data } = await getTaskById(row.id);
        const formValues = mapTaskToDialogValues(data);
        taskDialogForm.reset(formValues);
        setTaskDialogState({ mode, task: data });
      } catch (error) {
        console.error('Erro ao carregar detalhes da tarefa:', error);
        const description =
          error instanceof Error
            ? error.message
            : 'Não foi possível carregar os detalhes da tarefa.';
        toast({ title: 'Erro', description, variant: 'destructive' });
      } finally {
        setTaskDialogLoading(false);
      }
    },
    [getTaskById, taskDialogForm, toast],
  );

  const handleOpenTaskFromGantt = useCallback(
    (index: number) => {
      if (!editableRows[index]) {
        return;
      }
      void handleOpenTaskDialog(editableRows[index], 'view');
    },
    [editableRows, handleOpenTaskDialog],
  );

  const handleTaskDialogSubmit = taskDialogForm.handleSubmit(async values => {
    setTaskDialogLoading(true);
    try {
      let patch: Partial<TasksRow>;
      try {
        patch = buildTaskPatchFromFormValues(values);
      } catch (parseError) {
        if (parseError instanceof CustomFieldsParseError) {
          taskDialogForm.setError('custom_fields', { type: 'manual', message: parseError.message });
          return;
        }
        throw parseError;
      }

      if (currentDialogTask?.id) {
        const { data: updatedTask } = await updateTaskRecord(currentDialogTask.id, patch);
        toast({
          title: 'Sucesso',
          description: 'Tarefa gravada com sucesso no Supabase.',
        });
        taskDialogForm.reset(mapTaskToDialogValues(updatedTask));
      } else {
        const resolvedUserId =
          sanitizeStringField(values.user_id ?? null) ?? (user?.id ?? null);

        if (!resolvedUserId) {
          taskDialogForm.setError('user_id', {
            type: 'manual',
            message: 'Informe o usuário responsável (user_id) da tarefa.',
          });
          return;
        }

        const insertPayload: TaskInsertPayload = {
          ...patch,
          user_id: resolvedUserId,
        } as TaskInsertPayload;

        const { data: createdTask } = await insertTask(insertPayload);

        if (createdTask?.id) {
          const { data: fetchedTask } = await getTaskById(createdTask.id);
          taskDialogForm.reset(mapTaskToDialogValues(fetchedTask));
        }

        toast({
          title: 'Sucesso',
          description: 'Tarefa gravada com sucesso no Supabase.',
        });
      }

      await refreshTasks();
      handleCloseTaskDialog();
    } catch (error) {
      console.error('Erro ao salvar tarefa pelo diálogo:', error);
      const description =
        error instanceof Error ? error.message : 'Não foi possível salvar a tarefa.';
      toast({ title: 'Erro', description, variant: 'destructive' });
    } finally {
      setTaskDialogLoading(false);
    }
  });

  const resetFieldDialogState = () => {
    setSelectedFieldType(null);
    setFieldName('');
    setFieldOptionsInput('');
    setIsFieldRequired(false);
    setFieldSearch('');
    setEditingFieldId(null);
    setEditingFieldName('');
    setUpdatingFieldId(null);
    setDeletingFieldId(null);
  };

  const handleCreateCustomField = async () => {
    if (!selectedFieldType || !fieldName.trim()) {
      toast({
        title: 'Preencha os dados obrigatórios',
        description: 'Informe o nome do campo personalizado.',
        variant: 'destructive',
      });
      return;
    }

    if ((selectedFieldType === 'dropdown' || selectedFieldType === 'tags') && !fieldOptionsInput.trim()) {
      toast({
        title: 'Adicione opções para o campo',
        description: 'Campos de lista suspensa ou rótulos precisam de opções.',
        variant: 'destructive',
      });
      return;
    }

    const fieldOptions = fieldOptionsInput
      .split('\n')
      .map(option => option.trim())
      .filter(Boolean);

    setIsCreatingField(true);

    const result = await createCustomField({
      field_name: fieldName.trim(),
      field_type: selectedFieldType,
      field_options: (selectedFieldType === 'dropdown' || selectedFieldType === 'tags') ? fieldOptions : undefined,
      is_required: isFieldRequired,
    });

    setIsCreatingField(false);

    if (result) {
      resetFieldDialogState();
      setIsCustomFieldDialogOpen(false);
    }
  };

  const handleStartEditingField = (field: CustomField) => {
    setEditingFieldId(field.id);
    setEditingFieldName(field.field_name);
  };

  const handleCancelEditingField = () => {
    setEditingFieldId(null);
    setEditingFieldName('');
  };

  const handleSaveFieldEdits = async () => {
    if (!editingFieldId) {
      return;
    }

    const trimmedName = editingFieldName.trim();
    if (!trimmedName) {
      toast({
        title: 'Informe um nome válido',
        description: 'O nome do campo personalizado não pode estar em branco.',
        variant: 'destructive',
      });
      return;
    }

    setUpdatingFieldId(editingFieldId);
    const result = await updateCustomField(editingFieldId, { field_name: trimmedName });
    setUpdatingFieldId(null);

    if (result) {
      handleCancelEditingField();
    }
  };

  const handleDeleteField = async (fieldId: string) => {
    setDeletingFieldId(fieldId);
    const success = await deleteCustomField(fieldId);
    setDeletingFieldId(null);

    if (success && editingFieldId === fieldId) {
      handleCancelEditingField();
    }
  };

  const filteredFieldTypes = useMemo(() => {
    if (!fieldSearch.trim()) return CUSTOM_FIELD_TYPES;
    const normalizedSearch = fieldSearch.toLowerCase();
    return CUSTOM_FIELD_TYPES.filter(option =>
      option.label.toLowerCase().includes(normalizedSearch) ||
      option.description.toLowerCase().includes(normalizedSearch)
    );
  }, [fieldSearch]);

  const renderTaskRow = (row: TaskRow, index: number, highlightClass?: string) => {
    const isRunning = Boolean(row.id && activeTimers[row.id]);
    const isDraftRow = !row.id || row._isNew || row.isDraft;
    const isSavingRow = savingRowIndex === index;
    const isDeletingRow = deletingRowIndex === index;

    const originalTask = row.id ? tasks.find(task => task.id === row.id) : null;
    const normalizedOriginal = originalTask
      ? { ...originalTask, custom_fields: originalTask.custom_fields ?? {} }
      : null;
    const sanitizedRow = sanitizeTaskForSave(row);
    const sanitizedOriginal = normalizedOriginal ? sanitizeTaskForSave(normalizedOriginal) : null;
    const hasRowChanges = !sanitizedOriginal || !deepEqual(sanitizedRow, sanitizedOriginal);
    const trimmedRowName = typeof row.tarefa === 'string' ? row.tarefa.trim() : '';
    const canPersistRow = trimmedRowName.length > 0 && hasRowChanges;
    const startButtonState = getStartTimerButtonState(row, {
      isSaving: isSavingRow,
      isRunning,
      allowedResponsibleNames: responsibleNameOptions,
    });

    return (
      <TableRow
        key={row.id || row._tempId || index}
        className={cn(
          'border-b border-border/60 text-[10px] transition-colors',
          isCondensedView ? 'h-8' : 'h-9',
          highlightClass ? cn(highlightClass, 'hover:brightness-95') : 'bg-background hover:bg-muted/40'
        )}
      >
        <TableCell
          className={cn(
            'sticky left-0 z-20 px-2',
            highlightClass ? ['bg-inherit', 'border-l-4 border-l-primary/40'] : 'bg-background',
            isCondensedView ? 'py-1' : 'py-1.5'
          )}
          style={{ width: '210px', minWidth: '210px' }}
        >
          <TooltipProvider delayDuration={200}>
            <div className="flex flex-wrap items-center gap-1.5">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(TASK_ACTION_ICON_BASE_CLASS, TASK_ACTION_ICON_VARIANTS.view)}
                    onClick={() => void handleOpenTaskDialog(row, 'view')}
                    aria-label="Visualizar resumo da tarefa"
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Visualizar tarefa</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(TASK_ACTION_ICON_BASE_CLASS, TASK_ACTION_ICON_VARIANTS.edit)}
                    onClick={() => void handleOpenTaskDialog(row, 'edit')}
                    aria-label="Editar tarefa"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Editar tarefa</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(TASK_ACTION_ICON_BASE_CLASS, TASK_ACTION_ICON_VARIANTS.save)}
                    onClick={() => void handleSaveRow(index)}
                    disabled={isSavingRow || !canPersistRow}
                    aria-label="Salvar tarefa"
                  >
                    {isSavingRow ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Salvar tarefa</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      TASK_ACTION_ICON_BASE_CLASS,
                      TASK_ACTION_ICON_VARIANTS.start,
                      startButtonState.reason === 'noResponsible' && 'pointer-events-none'
                    )}
                    onClick={() => void handleStartTimer(row, index)}
                    disabled={startButtonState.disabled}
                    aria-label="Iniciar apontamento"
                  >
                    <Play className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {(() => {
                    switch (startButtonState.reason) {
                      case 'noResponsible':
                        return 'Associe um responsável para iniciar';
                      case 'missingName':
                        return 'Informe a tarefa antes de iniciar';
                      case 'saving':
                        return 'Aguarde concluir o salvamento';
                      case 'running':
                        return 'Já existe um apontamento em andamento';
                      default:
                        return 'Iniciar apontamento';
                    }
                  })()}
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(TASK_ACTION_ICON_BASE_CLASS, TASK_ACTION_ICON_VARIANTS.stop)}
                    disabled={isDraftRow || isSavingRow || !isRunning}
                    onClick={() => openStopTimerDialog(row, index)}
                    aria-label="Encerrar apontamento"
                  >
                    <Square className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Encerrar apontamento</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(TASK_ACTION_ICON_BASE_CLASS, TASK_ACTION_ICON_VARIANTS.delete)}
                    onClick={() => setPendingDeleteRowIndex(index)}
                    aria-label="Excluir tarefa"
                    disabled={isDeletingRow}
                  >
                    {isDeletingRow ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Excluir tarefa</TooltipContent>
              </Tooltip>
            </div>
          </TooltipProvider>
        </TableCell>
        {visibleColumns.map(col => {
          const width = getColumnWidth(col.key);
          return (
            <TableCell
              key={col.key}
              className={cn(
                'px-2 align-middle text-[10px]',
                isCondensedView ? 'py-0.5' : 'py-1'
              )}
              style={{ width: `${width}px`, minWidth: `${width}px` }}
            >
              {renderEditableCell(row, index, col)}
            </TableCell>
          );
        })}
      </TableRow>
    );
  };

  const successTask = successDialogData?.task ?? null;
  const successDialogTitle = successDialogData
    ? successDialogData.wasDraft
      ? 'Tarefa criada'
      : 'Tarefa atualizada'
    : null;
  const successDialogCreatedAt = successTask?.created_at
    ? format(new Date(successTask.created_at), 'dd/MM/yyyy HH:mm')
    : null;
  const isResponsavelDialogOpen = Boolean(pendingResponsavelAssignment);
  const pendingResponsavelRow = pendingResponsavelAssignment?.row ?? null;
  const isStopTimerDialogOpen = Boolean(pendingStopTimer);
  const stopTimerDialogRow = useMemo(() => {
    if (!pendingStopTimer) {
      return null;
    }
    const latest = editableRows[pendingStopTimer.rowIndex];
    return latest ?? pendingStopTimer.row;
  }, [editableRows, pendingStopTimer]);
  const stopTimerDialogTaskId = stopTimerDialogRow?.id ?? pendingStopTimer?.row.id ?? null;
  const stopTimerDialogTaskCode = stopTimerDialogRow?.task_id ?? pendingStopTimer?.row.task_id ?? null;
  const stopTimerDialogTaskName = (() => {
    const rawName =
      (typeof stopTimerDialogRow?.tarefa === 'string' && stopTimerDialogRow.tarefa) ||
      (typeof pendingStopTimer?.row.tarefa === 'string' ? pendingStopTimer.row.tarefa : null);
    if (typeof rawName !== 'string') {
      return null;
    }
    const trimmed = rawName.trim();
    return trimmed.length > 0 ? trimmed : null;
  })();
  const isDeleteDialogOpen = pendingDeleteRowIndex !== null;
  const deleteDialogRow =
    pendingDeleteRowIndex !== null ? editableRows[pendingDeleteRowIndex] ?? null : null;
  const deleteDialogTaskCode =
    typeof deleteDialogRow?.task_id === 'string' && deleteDialogRow.task_id.trim().length > 0
      ? deleteDialogRow.task_id
      : null;
  const deleteDialogTaskName = (() => {
    if (!deleteDialogRow) {
      return null;
    }

    const rawName = typeof deleteDialogRow.tarefa === 'string' ? deleteDialogRow.tarefa : null;
    if (!rawName) {
      return null;
    }

    const trimmed = rawName.trim();
    return trimmed.length > 0 ? trimmed : null;
  })();
  const isDeleteDialogProcessing =
    typeof pendingDeleteRowIndex === 'number' && deletingRowIndex === pendingDeleteRowIndex;
  const stopTimerDialogSessionSeconds = stopTimerDialogTaskId
    ? (() => {
        const start = activeTimers[stopTimerDialogTaskId];
        if (!start) {
          return 0;
        }
        const reference = timerTick || Date.now();
        return Math.max(0, Math.round((reference - start) / 1000));
      })()
    : 0;
  const stopTimerDialogSessionFormatted = formatDuration(stopTimerDialogSessionSeconds);
  const stopTimerDialogTotalSeconds = stopTimerDialogRow ? getRowAccumulatedSeconds(stopTimerDialogRow) : null;
  const stopTimerDialogTotalFormatted =
    typeof stopTimerDialogTotalSeconds === 'number' ? formatDuration(stopTimerDialogTotalSeconds) : null;

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col gap-4 overflow-hidden">
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls"
        id="task-management-import"
        className="hidden"
        onChange={handleImportFileChange}
      />
      <SortModal
        isOpen={isSortModalOpen}
        onClose={closeSortModal}
        rules={sortRules}
        onAddRule={addRule}
        onToggleDirection={toggleDirection}
        onRemoveRule={removeRule}
        onReorderRules={reorderRules}
        onClearAll={clearAll}
        pendingColumn={pendingSortColumn}
      />
      <Card className="flex min-h-0 min-w-0 w-full flex-1 flex-col overflow-hidden rounded-3xl">
        <CardHeader className="sticky top-0 z-40 flex flex-col gap-4 border-b border-border/60 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/75 lg:flex-row lg:flex-wrap lg:items-start lg:justify-between rounded-t-3xl">
          <div className="space-y-2">
            <div>
              <CardTitle>Gestão de Tarefas</CardTitle>
              <CardDescription>
                Centralize o cadastro das tarefas, personalize campos e acompanhe o andamento do projeto com uma visão consistente.
              </CardDescription>
            </div>
            <div>
              {hasChanges ? (
                <Badge variant="outline" className="border-amber-500/50 bg-amber-500/10 text-amber-700">
                  Alterações não salvas
                </Badge>
              ) : (
                <span className="text-sm text-muted-foreground">Tudo sincronizado</span>
              )}
            </div>
            {responsibleTimeSummaries.length > 0 ? (
              <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                <span className="font-medium text-foreground">Tempo por responsável:</span>
                {responsibleTimeSummaries.slice(0, 4).map(summary => (
                  <span
                    key={summary.label}
                    className={cn(
                      'rounded-full px-2 py-1 text-[10px]',
                      summary.isActive
                        ? 'border border-amber-200 bg-amber-100/90 text-amber-900 shadow-sm dark:border-amber-400/60 dark:bg-amber-400/15 dark:text-amber-200'
                        : 'bg-muted text-foreground'
                    )}
                  >
                    {summary.label}: {summary.formatted}
                  </span>
                ))}
                {responsibleTimeSummaries.length > 4 ? (
                  <span className="rounded-full bg-muted px-2 py-1 text-[10px] text-foreground">
                    +{responsibleTimeSummaries.length - 4}
                  </span>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="flex w-full max-w-full flex-wrap items-center gap-2 justify-start xl:w-auto xl:justify-end">
            <Button
              size="sm"
              onClick={handleToolbarAddTask}
              className="flex items-center gap-2"
            >
              <PlusCircle className="h-4 w-4" />
              Nova tarefa
            </Button>

            <ToggleGroup
              type="single"
              size="sm"
              variant="outline"
              value={activeView}
              onValueChange={value => {
                if (value === 'table' || value === 'gantt') {
                  setActiveView(value);
                }
              }}
              className="rounded-lg border border-border/60 bg-muted/30 p-1"
              aria-label="Selecionar visualização das tarefas"
            >
              <ToggleGroupItem
                value="table"
                className="flex items-center gap-2 px-3 text-sm data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                aria-label="Visualização em lista"
              >
                <TableIcon className="h-4 w-4" />
                <span className="hidden sm:inline">Lista</span>
              </ToggleGroupItem>
              <ToggleGroupItem
                value="gantt"
                className="flex items-center gap-2 px-3 text-sm data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                aria-label="Visualização em Gantt"
              >
                <GanttChart className="h-4 w-4" />
                <span className="hidden sm:inline">Gantt</span>
              </ToggleGroupItem>
            </ToggleGroup>

            <Dialog
              open={isCustomFieldDialogOpen}
              onOpenChange={(open) => {
                setIsCustomFieldDialogOpen(open);
                if (!open) {
                  resetFieldDialogState();
                }
              }}
            >
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                  <PlusSquare className="h-4 w-4 mr-2" />
                  Novo campo
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Criar campo personalizado</DialogTitle>
                </DialogHeader>
                {!selectedFieldType ? (
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="field-search">Pesquise campos novos ou existentes</Label>
                      <Input
                        id="field-search"
                        value={fieldSearch}
                        onChange={event => setFieldSearch(event.target.value)}
                        placeholder="Digite para filtrar os tipos de campos"
                      />
                    </div>
                    <ScrollArea className="h-72 rounded-md border">
                      <div className="p-4 space-y-3">
                        {filteredFieldTypes.map(option => {
                          const Icon = option.icon;
                          return (
                            <button
                              key={option.type}
                              type="button"
                              onClick={() => setSelectedFieldType(option.type)}
                              className="flex w-full items-start gap-3 rounded-md border border-border/60 p-3 text-left transition hover:border-primary hover:bg-primary/5"
                            >
                              <span className="mt-1">
                                <Icon className="h-5 w-5 text-primary" />
                              </span>
                              <span>
                                <span className="block text-sm font-medium">{option.label}</span>
                                <span className="block text-xs text-muted-foreground">{option.description}</span>
                              </span>
                            </button>
                          );
                        })}
                        {filteredFieldTypes.length === 0 && (
                          <p className="text-center text-sm text-muted-foreground">Nenhum tipo encontrado para sua busca.</p>
                        )}
                      </div>
                    </ScrollArea>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium">Campos personalizados criados</h4>
                        {customFields.length > 0 && (
                          <span className="text-xs text-muted-foreground">
                            {customFields.length} {customFields.length === 1 ? 'campo' : 'campos'}
                          </span>
                        )}
                      </div>
                      {customFields.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          Nenhum campo personalizado foi criado ainda.
                        </p>
                      ) : (
                        <ScrollArea className="h-48 rounded-md border">
                          <div className="divide-y">
                            {customFields.map(field => {
                              const typeInfo = CUSTOM_FIELD_TYPES.find(option => option.type === field.field_type);
                              const fallbackLabel = (() => {
                                switch (field.field_type) {
                                  case 'text':
                                  case 'text_short':
                                    return 'Texto curto';
                                  case 'text_long':
                                    return 'Texto longo';
                                  default:
                                    return field.field_type;
                                }
                              })();
                              const typeLabel = typeInfo?.label ?? fallbackLabel;

                              const isEditing = editingFieldId === field.id;
                              const isUpdating = updatingFieldId === field.id;
                              const isDeleting = deletingFieldId === field.id;

                              return (
                                <div
                                  key={field.id}
                                  className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between"
                                >
                                  <div className="flex-1 space-y-1">
                                    {isEditing ? (
                                      <>
                                        <Label htmlFor={`edit-field-${field.id}`} className="sr-only">
                                          Nome do campo
                                        </Label>
                                        <Input
                                          id={`edit-field-${field.id}`}
                                          value={editingFieldName}
                                          onChange={event => setEditingFieldName(event.target.value)}
                                          placeholder="Nome do campo"
                                          autoFocus
                                        />
                                        <p className="text-xs text-muted-foreground">
                                          {typeLabel}
                                          {field.is_required ? ' • Obrigatório' : ''}
                                        </p>
                                      </>
                                    ) : (
                                      <>
                                        <p className="text-sm font-medium">{field.field_name}</p>
                                        <p className="text-xs text-muted-foreground">
                                          {typeLabel}
                                          {field.is_required ? ' • Obrigatório' : ''}
                                        </p>
                                      </>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 self-end sm:self-auto">
                                    {isEditing ? (
                                      <>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={handleCancelEditingField}
                                          disabled={isUpdating}
                                        >
                                          Cancelar
                                        </Button>
                                        <Button
                                          size="sm"
                                          onClick={handleSaveFieldEdits}
                                          disabled={isUpdating || !editingFieldName.trim()}
                                        >
                                          {isUpdating ? (
                                            <>
                                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                              Salvando...
                                            </>
                                          ) : (
                                            'Salvar'
                                          )}
                                        </Button>
                                      </>
                                    ) : (
                                      <>
                                        <Button
                                          size="icon"
                                          variant="ghost"
                                          onClick={() => handleStartEditingField(field)}
                                          disabled={isDeleting}
                                        >
                                          <Pencil className="h-4 w-4" />
                                          <span className="sr-only">Editar campo</span>
                                        </Button>
                                        <Button
                                          size="icon"
                                          variant="ghost"
                                          className="text-destructive hover:text-destructive"
                                          onClick={() => handleDeleteField(field.id)}
                                          disabled={isDeleting || isUpdating}
                                        >
                                          {isDeleting ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                          ) : (
                                            <Trash2 className="h-4 w-4" />
                                          )}
                                          <span className="sr-only">Excluir campo</span>
                                        </Button>
                                      </>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </ScrollArea>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" onClick={() => setSelectedFieldType(null)}>
                          <PlusCircle className="h-4 w-4 rotate-45" />
                          Voltar
                        </Button>
                        <span className="text-sm text-muted-foreground">
                          Configurando campo do tipo{' '}
                          <span className="font-medium">{CUSTOM_FIELD_TYPES.find(option => option.type === selectedFieldType)?.label}</span>
                        </span>
                      </div>
                      <div className="grid gap-4">
                        <div className="grid gap-2">
                          <Label htmlFor="field-name">Nome do campo</Label>
                          <Input
                            id="field-name"
                            value={fieldName}
                            onChange={(event) => setFieldName(event.target.value)}
                            placeholder="Ex.: Data de aprovação"
                          />
                          {selectedFieldType === 'text_short' && (
                            <p className="text-xs text-muted-foreground">
                              Este campo aceitará textos de até 200 caracteres por tarefa.
                            </p>
                          )}
                          {selectedFieldType === 'text_long' && (
                            <p className="text-xs text-muted-foreground">
                              Este campo aceitará textos extensos de até 5000 caracteres por tarefa.
                            </p>
                          )}
                        </div>
                        {(selectedFieldType === 'dropdown' || selectedFieldType === 'tags') && (
                          <div className="grid gap-2">
                            <Label htmlFor="field-options">Opções (uma por linha)</Label>
                            <Textarea
                              id="field-options"
                              value={fieldOptionsInput}
                              onChange={(event) => setFieldOptionsInput(event.target.value)}
                              placeholder={`Ex.:\nOpção 1\nOpção 2\nOpção 3`}
                              rows={5}
                            />
                            <span className="text-xs text-muted-foreground">
                              Essas opções ficarão disponíveis para seleção nas tarefas.
                            </span>
                          </div>
                        )}
                        <div className="flex items-center justify-between rounded-md border border-border/60 px-3 py-2">
                          <div>
                            <Label htmlFor="field-required" className="text-sm">Campo obrigatório</Label>
                            <p className="text-xs text-muted-foreground">Defina se o preenchimento desse campo é obrigatório.</p>
                          </div>
                          <Switch
                            id="field-required"
                            checked={isFieldRequired}
                            onCheckedChange={setIsFieldRequired}
                          />
                        </div>
                      </div>
                      <DialogFooter className="gap-2">
                        <Button
                          variant="outline"
                          onClick={() => {
                            resetFieldDialogState();
                            setIsCustomFieldDialogOpen(false);
                          }}
                        >
                          Cancelar
                        </Button>
                        <Button onClick={handleCreateCustomField} disabled={isCreatingField}>
                          {isCreatingField ? 'Criando...' : 'Criar campo'}
                        </Button>
                      </DialogFooter>
                    </div>
                  )}
                </DialogContent>
              </Dialog>

              <Popover>
                <PopoverTrigger asChild>
                  <Button size="sm" variant="outline">
                    <Settings className="h-4 w-4 mr-2" />
                    Colunas
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 max-h-80 overflow-y-auto">
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Mostrar/Ocultar Colunas</h4>
                    {allColumns.map(col => (
                      <div key={col.key} className="flex items-center space-x-2">
                        <Checkbox
                          id={`col-${col.key}`}
                          checked={!hiddenColumns.includes(col.key)}
                          onCheckedChange={() => toggleColumn(col.key)}
                        />
                        <label htmlFor={`col-${col.key}`} className="cursor-pointer text-sm">
                          {col.label}
                        </label>
                      </div>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>

              <Button
                size="sm"
                variant="outline"
                onClick={handleExportToExcel}
                disabled={editableRows.length === 0 || visibleColumns.length === 0}
              >
                <Download className="h-4 w-4 mr-2" />
                Exportar modelo
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={handleImportData}
                disabled={isImporting}
                className="flex items-center"
              >
                {isImporting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}
                {isImporting ? 'Importando...' : 'Importar dados'}
              </Button>

              {activeView === 'table' ? (
                <Button
                  size="sm"
                  variant={isCondensedView ? 'default' : 'outline'}
                  onClick={() => setIsCondensedView(prev => !prev)}
                  aria-pressed={isCondensedView}
                >
                  <TableIcon className="h-4 w-4 mr-2" />
                  {isCondensedView ? 'Visão padrão' : 'Visão condensada'}
                </Button>
              ) : null}

            </div>
          </CardHeader>
          <CardContent className="flex flex-1 min-h-0 min-w-0 flex-col gap-4 overflow-hidden bg-background pt-4">
            {activeView === 'table' ? (
              <>
                <div className="flex flex-wrap items-center gap-3">
                  <Label htmlFor="task-group-by" className="text-sm font-medium text-muted-foreground">
                    Agrupar por
                  </Label>
                  <Select
                    value={groupBy || 'none'}
                    onValueChange={value => setGroupBy(value === 'none' ? '' : (value as GroupByKey))}
                  >
                    <SelectTrigger id="task-group-by" className="w-64">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sem agrupamento</SelectItem>
                      <SelectItem value="responsavel">Responsável</SelectItem>
                      <SelectItem value="prioridade">Prioridade</SelectItem>
                      <SelectItem value="status">Status</SelectItem>
                      <SelectItem value="cliente">Cliente</SelectItem>
                      <SelectItem value="modulo">Módulo</SelectItem>
                      <SelectItem value="area">Área</SelectItem>
                      <SelectItem value="percentualConclusao">% Conclusão</SelectItem>
                      <SelectItem value="vencimento">Vencimento (Data)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="relative min-h-0 min-w-0 w-full flex-1 overflow-hidden rounded-2xl border border-border/60">
                  <div className="h-full w-full overflow-auto">
                    <div className="min-w-full">
                      <Table className="w-full min-w-max caption-bottom text-[10px]">
                    <TableHeader className="sticky top-0 z-20 bg-background">
                      <TableRow className={cn(isCondensedView ? 'h-8' : 'h-10')}>
                        {/* Coluna de ações mantida fixa à esquerda para navegação durante a rolagem */}
                        <TableHead
                          className={cn(
                            'sticky left-0 z-30 select-none border-r border-border/60 bg-background px-2 font-semibold text-muted-foreground text-[10px]',
                            isCondensedView ? 'h-8 py-1.5' : 'h-10 py-2'
                          )}
                          style={{ width: '180px', minWidth: '180px' }}
                        >
                          Ações
                        </TableHead>
                        {/* Cabeçalhos com suporte a reordenação e redimensionamento persistente */}
                        {visibleColumns.map(column => {
                          const width = getColumnWidth(column.key);
                          const isSortable = SORTABLE_COLUMN_KEYS.has(column.key);
                          const activeRule = getRuleForKey(column.key);
                          const position = activeRule ? rulePositions.get(column.key) : undefined;

                          return (
                            <TableHead
                              key={column.key}
                              draggable
                              onDragStart={event => handleDragStart(event, column.key)}
                              onDragEnter={event => handleDragEnter(event, column.key)}
                              onDragOver={handleDragOver}
                              onDrop={event => handleDrop(event, column.key)}
                              onDragEnd={handleDragEnd}
                              onDoubleClick={() => handleAutoResizeColumn(column.key)}
                              onClick={event => handleColumnHeaderClick(event, column)}
                              className={cn(
                                'group relative select-none border-r border-border/60 bg-background px-2 text-left font-semibold text-muted-foreground transition-colors text-[10px]',
                                isCondensedView ? 'h-8 py-1.5' : 'h-10 py-2',
                                draggingColumn === column.key && 'opacity-70',
                                dragOverColumn === column.key && 'ring-2 ring-inset ring-primary/40',
                                isSortable && 'cursor-pointer hover:bg-muted/40',
                              )}
                              style={{ width: `${width}px`, minWidth: `${width}px` }}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="truncate">{column.label}</span>
                                {activeRule && position ? (
                                  <HeaderSortBadge position={position} direction={activeRule.direction} />
                                ) : null}
                              </div>
                              {/* Handle para redimensionamento manual das colunas */}
                              <div
                                data-resize-handle="true"
                                className="absolute right-0 top-0 h-full w-1 cursor-col-resize select-none rounded-sm bg-transparent transition-colors group-hover:bg-primary/30"
                                onMouseDown={event => handleResizeStart(event, column.key)}
                                onDoubleClick={event => {
                                  event.stopPropagation();
                                  handleAutoResizeColumn(column.key);
                                }}
                              />
                            </TableHead>
                          );
                        })}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        <TableRow>
                          <TableCell
                            colSpan={visibleColumns.length + 1}
                            className={cn('py-8 text-center text-[10px]')}
                          >
                            Carregando...
                          </TableCell>
                        </TableRow>
                      ) : editableRows.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={visibleColumns.length + 1}
                            className={cn('py-8 text-center text-[10px]')}
                          >
                            <p className="text-muted-foreground">Nenhuma tarefa. Clique em "Adicionar Tarefa" para registrar a primeira.</p>
                          </TableCell>
                        </TableRow>
                      ) : groupBy === '' ? (
                        sortedRowEntries.map(({ row, index }) => renderTaskRow(row, index))
                      ) : (
                        groupedTasks.map((group, groupIndex) => {
                          const isExpanded = expandedGroups[group.value] ?? true;
                          const groupLabel = resolveGroupLabel(groupBy);
                          const summary =
                            groupBy === 'responsavel'
                              ? getResponsibleTimeSummary(group.key)
                              : null;

                          const renderedRows = !isExpanded
                            ? []
                            : group.items
                                .map(task => {
                                  const indexFromMap = rowIndexMap.get(task);
                                  const resolvedIndex = indexFromMap ?? editableRows.indexOf(task);
                                  if (resolvedIndex < 0) {
                                    return null;
                                  }
                                  return renderTaskRow(task, resolvedIndex);
                                })
                                .filter((row): row is ReturnType<typeof renderTaskRow> => row !== null);

                          return (
                            <React.Fragment key={`group-${group.value}`}>
                              <TableRow className="border-none bg-transparent">
                                <TableCell colSpan={visibleColumns.length + 1} className="border-none bg-transparent p-0">
                                  <div
                                    role="button"
                                    tabIndex={0}
                                    aria-expanded={isExpanded}
                                    onClick={() => toggleGroupValue(group.value)}
                                    onKeyDown={event => {
                                      if (event.key === 'Enter' || event.key === ' ') {
                                        event.preventDefault();
                                        toggleGroupValue(group.value);
                                      }
                                    }}
                                    className={cn(
                                      'rounded-xl p-2 px-3 mb-2 border shadow-sm bg-gradient-to-r from-slate-800 to-slate-700 text-slate-100 flex items-center justify-between cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-slate-100/70',
                                      groupIndex === 0 ? 'mt-2' : 'mt-4'
                                    )}
                                  >
                                    <div className="flex flex-col gap-2 text-xs md:flex-row md:items-center md:gap-3 md:text-sm">
                                      <span className="font-semibold">
                                        {groupLabel}: <span className="font-bold">{group.key}</span>
                                      </span>
                                      <div className="flex flex-wrap items-center gap-2">
                                        <Badge
                                          variant="secondary"
                                          className="border border-slate-100/20 bg-slate-900/30 text-slate-100"
                                        >
                                          {group.count} tarefa{group.count === 1 ? '' : 's'}
                                        </Badge>
                                        {summary ? (
                                          <span
                                            className={cn(
                                              'text-[11px]',
                                              summary.isActive
                                                ? 'text-amber-200 font-semibold'
                                                : 'text-slate-200/80'
                                            )}
                                          >
                                            Tempo: {summary.formatted}
                                          </span>
                                        ) : null}
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-slate-100 hover:bg-slate-900/40 hover:text-slate-100"
                                        onClick={event => {
                                          event.stopPropagation();
                                          toggleGroupValue(group.value);
                                        }}
                                      >
                                        {isExpanded ? (
                                          <ChevronDown className="h-4 w-4" />
                                        ) : (
                                          <ChevronRight className="h-4 w-4" />
                                        )}
                                        <span className="sr-only">
                                          {isExpanded ? 'Recolher grupo' : 'Expandir grupo'}
                                        </span>
                                      </Button>
                                    </div>
                                  </div>
                                </TableCell>
                              </TableRow>
                              {renderedRows}
                            </React.Fragment>
                          );
                        })
                      )}
                      {!loading && (
                        <TableRow
                          className={cn(
                            'cursor-pointer border-b border-border/60 bg-background hover:bg-muted/30 text-[10px]',
                            isCondensedView ? 'h-8' : 'h-9',
                          )}
                          onClick={() => {
                            addNewRow();
                          }}
                        >
                          <TableCell
                            colSpan={visibleColumns.length + 1}
                            className={cn('px-3 text-primary text-[10px]', isCondensedView ? 'py-1.5' : 'py-2')}
                          >
                            <div className="flex items-center gap-2">
                              <PlusCircle className="h-3.5 w-3.5" />
                              <button
                                type="button"
                                className="font-medium text-primary hover:underline disabled:opacity-60"
                                onClick={event => {
                                  event.stopPropagation();
                                  addNewRow();
                                }}
                              >
                                Adicionar Tarefa
                              </button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          </>
        ) : (
          <TaskGanttView
            tasks={editableRows}
            isLoading={loading}
            onTaskClick={(_, index) => handleOpenTaskFromGantt(index)}
          />
        )}
      </CardContent>
      </Card>
      <Dialog open={isStopTimerDialogOpen} onOpenChange={handleStopDialogOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Finalizar apontamento</DialogTitle>
            <DialogDescription>
              Informe qual atividade foi realizada durante o período cronometrado antes de salvar o tempo.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-md border border-border/60 bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              {stopTimerDialogTaskName ? (
                <p className="font-medium text-foreground">{stopTimerDialogTaskName}</p>
              ) : null}
              {stopTimerDialogTaskCode ? (
                <p className="mt-1">ID: {stopTimerDialogTaskCode}</p>
              ) : null}
              <div className="mt-3 space-y-1 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground">Sessão atual</span>
                  <span>{stopTimerDialogSessionFormatted}</span>
                </div>
                {stopTimerDialogTotalFormatted ? (
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-foreground">Tempo total acumulado</span>
                    <span>{stopTimerDialogTotalFormatted}</span>
                  </div>
                ) : null}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="stop-timer-activity">Atividade realizada</Label>
              <Textarea
                id="stop-timer-activity"
                value={stopTimerActivityDescription}
                onChange={event => setStopTimerActivityDescription(event.target.value)}
                placeholder="Descreva o que foi executado neste período"
                rows={4}
              />
              {stopTimerError ? <p className="text-xs text-destructive">{stopTimerError}</p> : null}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeStopTimerDialog} disabled={isSubmittingStopTimer}>
              Cancelar
            </Button>
            <Button onClick={() => void handleConfirmStopTimerDialog()} disabled={isSubmittingStopTimer}>
              {isSubmittingStopTimer ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Registrar atividade
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={isResponsavelDialogOpen}
        onOpenChange={open => {
          if (!open) {
            closeResponsavelDialog();
          }
        }}
      >
        {pendingResponsavelAssignment ? (
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Atribuir responsável</DialogTitle>
              <DialogDescription>
                Esta tarefa está sem responsável. Selecione um responsável para iniciar o apontamento de tempo.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {pendingResponsavelRow ? (
                <div className="rounded-md border border-border/60 bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                  <p className="font-medium text-foreground">
                    {pendingResponsavelRow.tarefa && pendingResponsavelRow.tarefa.trim().length > 0
                      ? pendingResponsavelRow.tarefa
                      : 'Tarefa sem título'}
                  </p>
                  {pendingResponsavelRow.task_id ? (
                    <p className="mt-1 text-[11px] text-muted-foreground/80">
                      ID: {pendingResponsavelRow.task_id}
                    </p>
                  ) : null}
                </div>
              ) : null}
              <div className="space-y-2">
                <Label htmlFor="responsavel-select">Responsável</Label>
                <Select
                  value={selectedResponsavelForTimer ?? undefined}
                  onValueChange={value => setSelectedResponsavelForTimer(value)}
                  disabled={activeTeamMembers.length === 0}
                >
                  <SelectTrigger id="responsavel-select" className="h-9 text-sm">
                    <SelectValue placeholder={
                      activeTeamMembers.length ? 'Selecione um responsável' : 'Nenhum membro disponível'
                    }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {activeTeamMembers.map(member => (
                      <SelectItem key={member.id} value={member.name}>
                        {member.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={closeResponsavelDialog}>
                Cancelar
              </Button>
              <Button
                onClick={() => void handleConfirmResponsavelAssignment()}
                disabled={!selectedResponsavelForTimer || isSavingResponsavelForTimer}
                className="flex items-center gap-2"
              >
                {isSavingResponsavelForTimer ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
                Iniciar
              </Button>
            </DialogFooter>
          </DialogContent>
        ) : null}
      </Dialog>
      <Dialog
        open={isTaskDialogOpen}
        onOpenChange={open => {
          if (!open) {
            handleCloseTaskDialog();
          }
        }}
      >
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>
              {currentDialogMode === 'view' ? 'Resumo da tarefa' : 'Editar tarefa'}
            </DialogTitle>
            {currentDialogTask ? (
              <DialogDescription>
                Código: {currentDialogTask.task_id} · ID interno: {currentDialogTask.id}
              </DialogDescription>
            ) : null}
          </DialogHeader>
          {taskDialogLoading ? (
            <div className="flex min-h-[200px] items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : currentDialogMode === 'view' ? (
            currentDialogTask ? (
              <>
                <ScrollArea className="max-h-[60vh] pr-2">
                  <div className="grid gap-4 sm:grid-cols-2">
                    {TASK_DIALOG_FIELDS.map(field => (
                      <div key={field.name as string} className="space-y-1">
                        <span className="text-xs font-medium text-muted-foreground">{field.label}</span>
                        <div className="rounded-md border border-border/60 bg-muted/40 px-3 py-2 text-sm">
                          {renderViewFieldContent(field)}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
                <DialogFooter className="mt-4">
                  <Button variant="outline" onClick={handleCloseTaskDialog}>Fechar</Button>
                </DialogFooter>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Selecione uma tarefa para visualizar os detalhes.
              </p>
            )
          ) : (
            <Form {...taskDialogForm}>
              <form
                onSubmit={event => {
                  event.preventDefault();
                  void handleTaskDialogSubmit();
                }}
                className="space-y-4"
              >
                <ScrollArea className="max-h-[60vh] pr-2">
                  <div className="grid gap-4 sm:grid-cols-2">
                    {TASK_DIALOG_FIELDS.map(field => (
                      <FormField
                        key={field.name as string}
                        control={taskDialogForm.control}
                        name={field.name}
                        render={({ field: formField }) => (
                          <FormItem className="space-y-1">
                            <FormLabel>{field.label}</FormLabel>
                            <FormControl>
                              {field.type === 'boolean' ? (
                                <div className="flex items-center space-x-2">
                                  <Switch
                                    checked={Boolean(formField.value)}
                                    onCheckedChange={checked => formField.onChange(checked)}
                                    disabled={field.readOnly}
                                  />
                                  <span className="text-xs text-muted-foreground">
                                    {Boolean(formField.value) ? 'Sim' : 'Não'}
                                  </span>
                                </div>
                              ) : field.type === 'textarea' || field.type === 'json' ? (
                                <Textarea
                                  {...formField}
                                  value={formField.value ?? ''}
                                  onChange={event => formField.onChange(event.target.value)}
                                  rows={field.type === 'json' ? 6 : 4}
                                  disabled={field.readOnly}
                                />
                              ) : field.type === 'date' ? (
                                <Input
                                  type="date"
                                  value={formField.value ? formatDateForInput(String(formField.value)) : ''}
                                  onChange={event => formField.onChange(event.target.value || null)}
                                  disabled={field.readOnly}
                                />
                              ) : field.type === 'datetime' ? (
                                <Input
                                  value={formField.value ? formatDateTimeForDisplay(String(formField.value)) : ''}
                                  readOnly
                                  disabled
                                />
                              ) : field.type === 'number' ? (
                                <Input
                                  type="number"
                                  value={formField.value ?? ''}
                                  onChange={event =>
                                    formField.onChange(event.target.value === '' ? null : event.target.value)
                                  }
                                  disabled={field.readOnly}
                                />
                              ) : (
                                <Input
                                  value={formField.value ?? ''}
                                  onChange={event => formField.onChange(event.target.value)}
                                  disabled={field.readOnly}
                                />
                              )}
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    ))}
                  </div>
                </ScrollArea>
                <DialogFooter className="gap-2">
                  <Button type="button" variant="outline" onClick={handleCloseTaskDialog}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={taskDialogLoading}>
                    {taskDialogLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Salvar alterações
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={isTaskNameRequiredDialogOpen}
        onOpenChange={open => {
          if (!open) {
            handleTaskNameRequiredDialogClose();
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Nome da tarefa obrigatório</AlertDialogTitle>
            <AlertDialogDescription>
              O campo nome da tarefa é obrigatório.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={handleTaskNameRequiredDialogClose}>OK</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={open => {
          if (!open) {
            setPendingDeleteRowIndex(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteDialogRow?.id ? (
                <>
                  Tem certeza de que deseja excluir{' '}
                  <span className="font-semibold">{deleteDialogTaskName ?? 'esta tarefa'}</span>
                  {deleteDialogTaskCode ? ` (${deleteDialogTaskCode})` : ''}?
                  <br />
                  A exclusão só será concluída se todos os apontamentos estiverem com status pendente e não aprovados.
                </>
              ) : (
                <>Deseja descartar este rascunho de tarefa? Esta ação não pode ser desfeita.</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleteDialogProcessing}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void handleConfirmDeleteRow()}
              disabled={isDeleteDialogProcessing}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleteDialogProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Excluir tarefa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog
        open={isSuccessDialogOpen}
        onOpenChange={open => {
          if (!open) {
            handleSuccessDialogDismiss();
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{successDialogTitle ?? 'Tarefa salva'}</AlertDialogTitle>
            <AlertDialogDescription>
              <div className="space-y-2 text-sm">
                <p>Tarefa gravada com sucesso no Supabase.</p>
                {successTask ? (
                  <div className="grid gap-1">
                    {successDialogCreatedAt ? (
                      <p>
                        <span className="font-semibold">Data de criação:</span> {successDialogCreatedAt}
                      </p>
                    ) : null}
                    <p>
                      <span className="font-semibold">Número da tarefa:</span> {successTask.task_id}
                    </p>
                    <p>
                      <span className="font-semibold">Tarefa:</span> {successTask.tarefa}
                    </p>
                    <p>
                      <span className="font-semibold">Status:</span> {successTask.status}
                    </p>
                  </div>
                ) : null}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={handleSuccessDialogDismiss}>OK</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
