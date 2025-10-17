import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Settings, Save, Trash2, PlusCircle, PlusSquare, Type, Hash, Percent, Coins, ListChecks, Tags, CheckSquare, Pencil, Eye, Table as TableIcon, Loader2, Play, Pause, Square, FileWarning } from 'lucide-react';
import { format } from 'date-fns';
import { CustomField, Task, TaskFormData } from '@/types/task';
import type { Status } from '@/types/status';
import type { TAP } from '@/types/tap';
import { useTasks } from '@/hooks/useTasks';
import { useTAP } from '@/hooks/useTAP';
import { useStatus } from '@/hooks/useStatus';
import { useModulos } from '@/hooks/useModulos';
import { useAreas } from '@/hooks/useAreas';
import { useCategorias } from '@/hooks/useCategorias';
import { useTimeLogs } from '@/hooks/useTimeLogs';
import { useUserRoles } from '@/hooks/useUserRoles';
import { useToast } from '@/hooks/use-toast';
import { useProjectAllocations } from '@/hooks/useProjectAllocations';
import { useProjectStages } from '@/hooks/useProjectStages';
import { useGaps } from '@/hooks/useGaps';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { getStatusColorValue } from '@/lib/status-colors';

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

type GroupingKey =
  | 'none'
  | 'prioridade'
  | 'data_vencimento'
  | 'status'
  | 'responsavel'
  | 'percentual_conclusao'
  | 'modulo'
  | 'area'
  | 'categoria'
  | 'criticidade'
  | 'escopo'
  | 'etapa_projeto'
  | 'sub_etapa_projeto'
  | 'cronograma';

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
  'h-8 w-8 rounded-full text-white shadow-sm transition-transform duration-200 hover:scale-105 hover:text-white focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-60 disabled:hover:scale-100';

const TASK_ACTION_ICON_VARIANTS = {
  start: 'bg-emerald-500 hover:bg-emerald-600 focus-visible:ring-emerald-500 disabled:bg-emerald-300 disabled:text-emerald-700',
  pause: 'bg-amber-500 hover:bg-amber-600 focus-visible:ring-amber-500 disabled:bg-amber-300 disabled:text-amber-700',
  stop: 'bg-rose-500 hover:bg-rose-600 focus-visible:ring-rose-500 disabled:bg-rose-300 disabled:text-rose-700',
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

const GROUP_HIGHLIGHT_CLASSES = [
  'bg-primary/10 dark:bg-primary/20',
  'bg-amber-100/40 dark:bg-amber-500/15',
  'bg-emerald-100/40 dark:bg-emerald-500/15',
  'bg-sky-100/40 dark:bg-sky-500/15',
  'bg-rose-100/40 dark:bg-rose-500/15',
] as const;

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
  const { getTaskTotalTime, getResponsibleTotalTime, createTimeLog, refreshTimeLogs } = useTimeLogs(projectId);
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
  const [savingRowIndex, setSavingRowIndex] = useState<number | null>(null);
  const [deletingRowIndex, setDeletingRowIndex] = useState<number | null>(null);
  const [isCustomFieldDialogOpen, setIsCustomFieldDialogOpen] = useState(false);
  const [selectedFieldType, setSelectedFieldType] = useState<CustomField['field_type'] | null>(null);
  const [fieldName, setFieldName] = useState('');
  const [fieldOptionsInput, setFieldOptionsInput] = useState('');
  const [isFieldRequired, setIsFieldRequired] = useState(false);
  const [fieldSearch, setFieldSearch] = useState('');
  const [isCreatingField, setIsCreatingField] = useState(false);
  const [activeTaskDialog, setActiveTaskDialog] = useState<{ mode: 'view' | 'edit'; index: number } | null>(null);
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [editingFieldName, setEditingFieldName] = useState('');
  const [updatingFieldId, setUpdatingFieldId] = useState<string | null>(null);
  const [deletingFieldId, setDeletingFieldId] = useState<string | null>(null);
  const [grouping, setGrouping] = useState<GroupingKey>('none');
  const [activeTimers, setActiveTimers] = useState<Record<string, number>>({});
  const [pausedDurations, setPausedDurations] = useState<Record<string, number>>({});
  const [timerTick, setTimerTick] = useState(0);
  const activeTimersStorageKey = useMemo(
    () => `task-active-timers-${projectId}`,
    [projectId]
  );

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
    const validIds = new Set(
      editableRows
        .map(row => row.id)
        .filter((id): id is string => typeof id === 'string' && id.length > 0),
    );

    if (validIds.size === 0) {
      if (Object.keys(activeTimers).length === 0 && Object.keys(pausedDurations).length === 0) {
        return;
      }
    }

    setActiveTimers(prev => {
      const filteredEntries = Object.entries(prev).filter(([taskId]) => validIds.has(taskId));
      if (filteredEntries.length === Object.keys(prev).length) {
        return prev;
      }

      return filteredEntries.reduce<Record<string, number>>((acc, [taskId, value]) => {
        acc[taskId] = value;
        return acc;
      }, {});
    });

    setPausedDurations(prev => {
      const filteredEntries = Object.entries(prev).filter(([taskId]) => validIds.has(taskId));
      if (filteredEntries.length === Object.keys(prev).length) {
        return prev;
      }

      return filteredEntries.reduce<Record<string, number>>((acc, [taskId, value]) => {
        acc[taskId] = value;
        return acc;
      }, {});
    });
  }, [editableRows]);

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
    const safeSeconds = Number.isFinite(totalSeconds) ? Math.max(0, Math.floor(totalSeconds)) : 0;
    const hours = Math.floor(safeSeconds / 3600);
    const minutes = Math.floor((safeSeconds % 3600) / 60);
    const seconds = safeSeconds % 60;

    const pad = (value: number) => value.toString().padStart(2, '0');

    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }, []);

  const getRowAccumulatedSeconds = useCallback(
    (row: TaskRow): number => {
      if (!row.id) {
        return 0;
      }

      const minutes = getTaskTotalTime(row.id);
      const runningStart = activeTimers[row.id];
      const pausedMilliseconds = pausedDurations[row.id] ?? 0;
      const referenceNow = timerTick || Date.now();

      const baseSeconds = Number.isFinite(minutes) ? Math.max(0, Math.floor(minutes * 60)) : 0;
      const runningSeconds = runningStart ? Math.max(0, Math.floor((referenceNow - runningStart) / 1000)) : 0;
      const pausedSeconds = Math.max(0, Math.floor(pausedMilliseconds / 1000));

      return baseSeconds + runningSeconds + pausedSeconds;
    },
    [activeTimers, getTaskTotalTime, pausedDurations, timerTick],
  );

  const preferencesStorageKey = useMemo(() => `task-table-preferences-${projectId}`, [projectId]);

  const { responsibleTimeSummaries, responsibleTimeSummaryMap } = useMemo(() => {
    const assignments = editableRows
      .filter(row => row.id && typeof row.responsavel === 'string' && row.responsavel.trim().length > 0)
      .map(row => ({ taskId: row.id as string, responsavel: row.responsavel as string }));

    const baseMinutesByResponsavel = getResponsibleTotalTime(assignments);
    const aggregated = new Map<string, { label: string; seconds: number }>();

    Object.entries(baseMinutesByResponsavel).forEach(([label, minutes]) => {
      const normalized = label.trim().toLowerCase();
      if (!normalized) {
        return;
      }

      const safeMinutes = Number.isFinite(minutes) ? Math.max(0, minutes) : 0;
      aggregated.set(normalized, { label, seconds: Math.floor(safeMinutes * 60) });
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
      const runningSeconds = runningStart ? Math.max(0, Math.floor((referenceNow - runningStart) / 1000)) : 0;
      const pausedSeconds = Math.max(0, Math.floor((pausedDurations[row.id] ?? 0) / 1000));
      const extras = runningSeconds + pausedSeconds;

      if (!aggregated.has(normalized)) {
        aggregated.set(normalized, { label: responsavelName, seconds: extras });
        return;
      }

      const existing = aggregated.get(normalized)!;
      const nextSeconds = existing.seconds + extras;
      aggregated.set(normalized, {
        label: responsavelName || existing.label,
        seconds: nextSeconds,
      });
    });

    const allEntries = Array.from(aggregated.values()).map(entry => {
      const safeSeconds = Number.isFinite(entry.seconds) ? Math.max(0, Math.floor(entry.seconds)) : 0;
      return {
        label: entry.label,
        seconds: safeSeconds,
        minutes: Math.max(0, Math.round(safeSeconds / 60)),
        formatted: formatDuration(safeSeconds),
      };
    });

    const summaryMap = new Map<string, { label: string; seconds: number; minutes: number; formatted: string }>();
    allEntries.forEach(entry => {
      summaryMap.set(entry.label.trim().toLowerCase(), entry);
    });

    const summaryArray = allEntries
      .filter(entry => entry.seconds > 0)
      .sort((a, b) => b.seconds - a.seconds);

    return { responsibleTimeSummaries: summaryArray, responsibleTimeSummaryMap: summaryMap };
  }, [
    editableRows,
    getResponsibleTotalTime,
    activeTimers,
    pausedDurations,
    timerTick,
    formatDuration,
  ]);

  const getResponsibleTimeSummary = useCallback(
    (responsavel: string) => {
      const normalized = typeof responsavel === 'string' ? responsavel.trim().toLowerCase() : '';
      if (!normalized) {
        return null;
      }
      return responsibleTimeSummaryMap.get(normalized) ?? null;
    },
    [responsibleTimeSummaryMap],
  );


  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      const stored = window.localStorage.getItem(activeTimersStorageKey);
      if (!stored) {
        return;
      }

      const parsed = JSON.parse(stored);
      if (!parsed || typeof parsed !== 'object') {
        window.localStorage.removeItem(activeTimersStorageKey);
        return;
      }

      const sanitizeNumberRecord = (value: unknown): Record<string, number> => {
        if (!value || typeof value !== 'object') {
          return {};
        }

        return Object.entries(value as Record<string, unknown>)
          .filter(([, entryValue]) => typeof entryValue === 'number' && Number.isFinite(entryValue) && entryValue > 0)
          .reduce<Record<string, number>>((acc, [taskId, entryValue]) => {
            acc[taskId] = entryValue as number;
            return acc;
          }, {});
      };

      if ('active' in parsed || 'paused' in parsed) {
        const restoredActive = sanitizeNumberRecord((parsed as { active?: unknown }).active ?? {});
        const restoredPaused = sanitizeNumberRecord((parsed as { paused?: unknown }).paused ?? {});
        setActiveTimers(restoredActive);
        setPausedDurations(restoredPaused);
        if (Object.keys(restoredActive).length === 0 && Object.keys(restoredPaused).length === 0) {
          window.localStorage.removeItem(activeTimersStorageKey);
        }
        return;
      }

      const restoredActive = sanitizeNumberRecord(parsed);
      setActiveTimers(restoredActive);
      setPausedDurations({});

      if (Object.keys(restoredActive).length === 0) {
        window.localStorage.removeItem(activeTimersStorageKey);
      }
    } catch (error) {
      console.error('Erro ao restaurar temporizadores ativos:', error);
      window.localStorage.removeItem(activeTimersStorageKey);
      setActiveTimers({});
      setPausedDurations({});
    }
  }, [activeTimersStorageKey]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const hasActive = Object.keys(activeTimers).length > 0;
    const hasPaused = Object.keys(pausedDurations).length > 0;

    if (!hasActive && !hasPaused) {
      window.localStorage.removeItem(activeTimersStorageKey);
      return;
    }

    try {
      window.localStorage.setItem(
        activeTimersStorageKey,
        JSON.stringify({ active: activeTimers, paused: pausedDurations }),
      );
    } catch (error) {
      console.error('Erro ao persistir temporizadores ativos:', error);
    }
  }, [activeTimers, pausedDurations, activeTimersStorageKey]);

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

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      const stored = window.localStorage.getItem(preferencesStorageKey);
      if (!stored) {
        setIsLoadedPreferences(true);
        return;
      }

      const parsed = JSON.parse(stored) as {
        hiddenColumns?: string[];
        order?: string[];
        widths?: Record<string, number>;
        density?: 'comfortable' | 'condensed';
      } | null;

      if (parsed?.hiddenColumns && Array.isArray(parsed.hiddenColumns)) {
        setHiddenColumns(parsed.hiddenColumns);
      }

      if (parsed?.order && Array.isArray(parsed.order)) {
        setColumnOrder(parsed.order);
      }

      if (parsed?.widths && typeof parsed.widths === 'object') {
        setColumnWidths(parsed.widths);
      }

      if (parsed?.density === 'condensed') {
        setIsCondensedView(true);
      }
    } catch (error) {
      console.warn('Não foi possível carregar preferências da tabela de tarefas:', error);
    } finally {
      setIsLoadedPreferences(true);
    }
  }, [preferencesStorageKey]);

  useEffect(() => {
    if (!isLoadedPreferences || typeof window === 'undefined') {
      return;
    }

    const payload = JSON.stringify({
      hiddenColumns,
      order: columnOrder,
      widths: columnWidths,
      density: isCondensedView ? 'condensed' : 'comfortable',
    });

    window.localStorage.setItem(preferencesStorageKey, payload);
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

      payload.nome = typeof row.nome === 'string' ? row.nome.trim() : '';
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

  const getNextTaskIdentifier = useCallback(() => {
    let highest = 0;

    tasks.forEach(task => {
      highest = Math.max(highest, extractTaskNumber(task.task_id));
    });

    editableRows.forEach(row => {
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

  // Inicializar rows com as tasks existentes
  const createBlankRow = useCallback((order: number, taskIdentifier?: string): TaskRow => ({
    _isNew: true,
    isDraft: true,
    _tempId: `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    project_id: projectId,
    task_id: taskIdentifier ?? '',
    nome: '',
    prioridade: 'Média',
    status: defaultStatusName || '',
    cliente: defaultClient || undefined,
    data_vencimento: format(new Date(), 'yyyy-MM-dd'),
    percentual_conclusao: 0,
    nivel: 0,
    ordem: order,
    custom_fields: {},
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

  useEffect(() => {
    if (!activeTaskDialog) return;
    if (!editableRows[activeTaskDialog.index]) {
      setActiveTaskDialog(null);
    }
  }, [activeTaskDialog, editableRows]);

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

  const baseColumns = useMemo<ColumnDefinition[]>(() => ([
    { key: 'task_id', label: 'ID', width: '80px' },
    { key: 'nome', label: 'Nome', width: '200px' },
    { key: 'prioridade', label: 'Prioridade', width: '120px' },
    { key: 'status', label: 'Status', width: '150px' },
    { key: 'cliente', label: 'Cliente', width: '150px' },
    { key: 'responsavel', label: 'Responsável', width: '150px' },
    { key: 'data_vencimento', label: 'Vencimento', width: '120px' },
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

  const toggleColumn = (columnKey: string) => {
    setHiddenColumns(prev =>
      prev.includes(columnKey)
        ? prev.filter(k => k !== columnKey)
        : [...prev, columnKey]
    );
  };

  const getGroupingInfo = useCallback(
    (row: TaskRow): { key: string; label: string } => {
      switch (grouping) {
        case 'prioridade': {
          const value = row.prioridade?.trim();
          const key = value?.toLowerCase() ?? '__empty__';
          return { key, label: value ?? 'Sem prioridade' };
        }
        case 'data_vencimento': {
          const value = row.data_vencimento;
          if (!value) {
            return { key: '__empty__', label: 'Sem vencimento' };
          }
          const date = new Date(String(value));
          if (Number.isNaN(date.getTime())) {
            const trimmed = String(value).trim();
            const key = trimmed.toLowerCase() || '__empty__';
            return { key, label: trimmed || 'Sem vencimento' };
          }
          try {
            return { key: format(date, 'yyyy-MM-dd'), label: format(date, 'dd/MM/yyyy') };
          } catch (error) {
            console.error('Erro ao formatar data para agrupamento:', error);
            const fallback = String(value);
            const key = fallback.trim().toLowerCase() || '__empty__';
            return { key, label: fallback || 'Sem vencimento' };
          }
        }
        case 'status': {
          const value = row.status?.trim();
          const key = value?.toLowerCase() ?? '__empty__';
          return { key, label: value ?? 'Sem status' };
        }
        case 'responsavel': {
          const value = row.responsavel?.trim();
          const key = value?.toLowerCase() ?? '__empty__';
          return { key, label: value ?? 'Sem responsável' };
        }
        case 'percentual_conclusao': {
          const value = row.percentual_conclusao;
          if (typeof value === 'number' && Number.isFinite(value)) {
            const normalized = value;
            return { key: normalized.toString(), label: `${normalized}%` };
          }
          return { key: '__empty__', label: 'Sem conclusão' };
        }
        case 'modulo': {
          const value = row.modulo?.trim();
          const key = value?.toLowerCase() ?? '__empty__';
          return { key, label: value ?? 'Sem módulo' };
        }
        case 'area': {
          const value = row.area?.trim();
          const key = value?.toLowerCase() ?? '__empty__';
          return { key, label: value ?? 'Sem área' };
        }
        case 'categoria': {
          const value = row.categoria?.trim();
          const key = value?.toLowerCase() ?? '__empty__';
          return { key, label: value ?? 'Sem categoria' };
        }
        case 'criticidade': {
          const value = row.criticidade?.trim();
          const key = value?.toLowerCase() ?? '__empty__';
          return { key, label: value ?? 'Sem criticidade' };
        }
        case 'escopo': {
          const value = row.escopo?.trim();
          const key = value?.toLowerCase() ?? '__empty__';
          return { key, label: value ?? 'Sem escopo' };
        }
        case 'etapa_projeto': {
          const value = typeof row.etapa_projeto === 'string' ? row.etapa_projeto : undefined;
          const label = value ? stageNameById.get(value) ?? value : 'Sem etapa';
          const key = value ?? '__empty__';
          return { key, label };
        }
        case 'sub_etapa_projeto': {
          const value = typeof row.sub_etapa_projeto === 'string' ? row.sub_etapa_projeto : undefined;
          const subStage = value ? subStageNameById.get(value) : undefined;
          const label = subStage?.label ?? value ?? 'Sem sub-etapa';
          const key = value ?? '__empty__';
          return { key, label };
        }
        case 'cronograma': {
          const isCronograma = Boolean(row.cronograma);
          return { key: isCronograma ? 'sim' : 'nao', label: isCronograma ? 'Cronograma' : 'Sem cronograma' };
        }
        default:
          return { key: 'none', label: '' };
      }
    },
    [grouping, stageNameById, subStageNameById],
  );

  const groupedRows = useMemo(() => {
    if (grouping === 'none') {
      return null;
    }

    const groups = new Map<string, { key: string; label: string; rows: Array<{ row: TaskRow; index: number }> }>();

    editableRows.forEach((row, index) => {
      const info = getGroupingInfo(row);
      const mapKey = info.key || '__empty__';
      const existing = groups.get(mapKey);
      const entry = { row, index };

      if (existing) {
        existing.rows.push(entry);
      } else {
        groups.set(mapKey, { key: mapKey, label: info.label, rows: [entry] });
      }
    });

    return Array.from(groups.values());
  }, [editableRows, getGroupingInfo, grouping]);

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
          if (!row.id) {
            return '0h 0m';
          }
          const totalSeconds = getRowAccumulatedSeconds(row);
          const hours = Math.floor(totalSeconds / 3600);
          const mins = Math.floor((totalSeconds % 3600) / 60);
          return `${hours}h ${mins}m`;
        }
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

  const handleStartTimer = (row: TaskRow) => {
    if (!row.id) {
      toast({
        title: 'Atenção',
        description: 'Salve a tarefa antes de iniciar o apontamento de tempo.',
        variant: 'destructive',
      });
      return;
    }

    setActiveTimers(prev => {
      if (prev[row.id!]) {
        return prev;
      }
      return { ...prev, [row.id!]: Date.now() };
    });
  };

  const handlePauseTimer = (row: TaskRow) => {
    if (!row.id) {
      toast({
        title: 'Atenção',
        description: 'Salve a tarefa antes de pausar o apontamento.',
        variant: 'destructive',
      });
      return;
    }

    const start = activeTimers[row.id];
    if (!start) {
      return;
    }

    const elapsedMilliseconds = Math.max(0, Date.now() - start);

    setActiveTimers(prev => {
      const next = { ...prev };
      delete next[row.id!];
      return next;
    });

    setPausedDurations(prev => ({
      ...prev,
      [row.id!]: (prev[row.id!] ?? 0) + elapsedMilliseconds,
    }));
  };

  const handleStopTimer = async (row: TaskRow) => {
    if (!row.id) {
      toast({
        title: 'Atenção',
        description: 'Salve a tarefa antes de finalizar o apontamento.',
        variant: 'destructive',
      });
      return;
    }

    const start = activeTimers[row.id];
    const pausedMilliseconds = pausedDurations[row.id] ?? 0;

    if (!start && pausedMilliseconds <= 0) {
      return;
    }

    const now = Date.now();
    const runningMilliseconds = start ? Math.max(0, now - start) : 0;
    const totalMilliseconds = pausedMilliseconds + runningMilliseconds;

    if (totalMilliseconds <= 0) {
      toast({
        title: 'Sem tempo registrado',
        description: 'Inicie o cronômetro para registrar um novo apontamento.',
      });
      return;
    }

    const elapsedMinutes = Math.max(1, Math.round(totalMilliseconds / 60000));
    const startedAt = now - totalMilliseconds;

    const payload = {
      task_id: row.id,
      tempo_minutos: elapsedMinutes,
      tipo_inclusao: 'automatico' as const,
      status_aprovacao: 'aprovado' as const,
      data_inicio: new Date(startedAt).toISOString(),
      data_fim: new Date(now).toISOString(),
      observacoes: 'Registro automático pela Gestão de Tarefas',
    };

    const result = await createTimeLog(payload);
    if (result) {
      setActiveTimers(prev => {
        if (!prev[row.id!]) {
          return prev;
        }
        const next = { ...prev };
        delete next[row.id!];
        return next;
      });

      setPausedDurations(prev => {
        if (!prev[row.id!]) {
          return prev;
        }
        const next = { ...prev };
        delete next[row.id!];
        return next;
      });

      refreshTimeLogs();
    }
  };

  const navigateToGaps = (taskId?: string) => {
    if (!taskId) {
      toast({
        title: 'Atenção',
        description: 'Salve a tarefa para acessar a gestão de GAPs.',
        variant: 'destructive',
      });
      return;
    }

    navigate(`/projects-tap/${projectId}?tab=gaps&gapTaskId=${taskId}`);
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

  const deleteRow = useCallback(async (index: number) => {
    const row = editableRows[index];
    if (!row) {
      return;
    }

    const rowId = row.id;

    if (deletingRowIndex !== null) {
      return;
    }

    setDeletingRowIndex(index);

    try {
      if (row.id) {
        const success = await deleteTask(row.id);
        if (!success) {
          return;
        }
      }

      setEditableRows(prev => prev.filter((_, i) => i !== index));

      if (rowId) {
        setActiveTimers(prev => {
          if (!prev[rowId]) {
            return prev;
          }

          const next = { ...prev };
          delete next[rowId];
          return next;
        });

        setPausedDurations(prev => {
          if (!prev[rowId]) {
            return prev;
          }

          const next = { ...prev };
          delete next[rowId];
          return next;
        });
      }

      if (!rowId) {
        toast({
          title: 'Rascunho removido',
          description: 'A tarefa em rascunho foi removida.',
        });
      }
    } catch (error) {
      console.error('Erro ao excluir tarefa:', error);
      toast({
        title: 'Erro ao excluir tarefa',
        description: 'Não foi possível remover esta tarefa. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setDeletingRowIndex(null);
    }
  }, [deleteTask, deletingRowIndex, editableRows, toast]);

  const handleSaveRow = useCallback(async (index: number) => {
    const row = editableRows[index];
    if (!row) {
      return;
    }

    const trimmedName = typeof row.nome === 'string' ? row.nome.trim() : '';
    if (!trimmedName) {
      toast({
        title: 'Informe o nome da tarefa',
        description: 'Defina um título para a tarefa antes de salvar.',
        variant: 'destructive',
      });
      return;
    }

    if (savingRowIndex !== null) {
      return;
    }

    let rowToSave = row;
    const wasDraft = !rowToSave.id || rowToSave._isNew || rowToSave.isDraft;

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

    setSavingRowIndex(index);

    try {
      const payload = sanitizeTaskForSave(rowToSave);
      let savedTask: Task | null = null;

      if (!rowToSave.id || rowToSave._isNew || rowToSave.isDraft) {
        savedTask = await createTaskMutation(payload);
      } else {
        savedTask = await updateTask(rowToSave.id, payload);
      }

      if (!savedTask) {
        return;
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

      toast({
        title: wasDraft ? 'Tarefa criada' : 'Tarefa atualizada',
        description: 'A tarefa foi salva no Supabase e os apontamentos estão liberados.',
      });
    } catch (error) {
      console.error('Erro ao salvar tarefa individual:', error);
      toast({
        title: 'Erro ao salvar tarefa',
        description: 'Não foi possível salvar esta tarefa. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setSavingRowIndex(null);
    }
  }, [
    createTaskMutation,
    editableRows,
    ensureGapForTask,
    getNextTaskIdentifier,
    sanitizeTaskForSave,
    savingRowIndex,
    toast,
    updateTask,
  ]);


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
      if (!row.id) return <span className="text-xs text-muted-foreground">-</span>;

      const totalSeconds = getRowAccumulatedSeconds(row);
      const isRunning = Boolean(activeTimers[row.id]);
      const pausedMilliseconds = pausedDurations[row.id] ?? 0;
      const hasPausedTime = pausedMilliseconds > 0;
      const isPaused = hasPausedTime && !isRunning;

      return (
        <div className="flex flex-col text-xs">
          <span>{formatDuration(totalSeconds)}</span>
          {isRunning ? (
            <span className="text-[10px] text-muted-foreground">Cronometrando...</span>
          ) : null}
          {isPaused ? (
            <span className="text-[10px] text-muted-foreground">Pausado</span>
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

      return (
        <Select
          value={hasMatchingMember ? currentValue : currentValue ? 'custom' : 'unassigned'}
          onValueChange={(val) =>
            updateCell(
              rowIndex,
              column.key,
              val === 'unassigned' || val === 'custom' ? undefined : val
            )
          }
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder={responsavelOptions.length ? 'Selecione' : 'Sem membros disponíveis'} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="unassigned">Sem responsável</SelectItem>
            {responsavelOptions.map((member) => (
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

    if (column.key === 'data_vencimento') {
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
        placeholder={column.key === 'nome' ? 'Digite o nome da tarefa' : ''}
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
      const pausedMilliseconds = pausedDurations[row.id] ?? 0;
      const hasPausedTime = pausedMilliseconds > 0;
      const isPaused = hasPausedTime && !isRunning;
      return (
        <span>
          {formatDuration(totalSeconds)}
          {isRunning ? ' · Em andamento' : isPaused ? ' · Pausado' : ''}
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

    if (column.key === 'data_vencimento') {
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
    pausedDurations,
    timerTick,
    formatDuration,
    stageNameById,
    subStageNameById,
  ]);

  const closeTaskDialog = useCallback(() => setActiveTaskDialog(null), []);

  const activeDialogRow = activeTaskDialog ? editableRows[activeTaskDialog.index] : null;
  const isTaskDialogOpen = Boolean(activeTaskDialog && activeDialogRow);

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
    const pausedMilliseconds = row.id ? pausedDurations[row.id] ?? 0 : 0;
    const hasPausedTime = pausedMilliseconds > 0;
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
    const trimmedRowName = typeof row.nome === 'string' ? row.nome.trim() : '';
    const canPersistRow = trimmedRowName.length > 0 && hasRowChanges;

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
          <div className="flex flex-wrap items-center gap-1.5">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setActiveTaskDialog({ mode: 'view', index })}
              aria-label="Visualizar resumo da tarefa"
            >
              <Eye className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setActiveTaskDialog({ mode: 'edit', index })}
              aria-label="Editar tarefa"
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-primary hover:text-primary"
              onClick={() => navigateToGaps(row.id)}
              aria-label="Abrir gestão de GAPs"
            >
              <FileWarning className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                'h-8 w-8 focus-visible:ring-sky-500 disabled:text-muted-foreground',
                canPersistRow
                  ? 'text-sky-500 hover:text-sky-600'
                  : 'text-muted-foreground hover:text-muted-foreground'
              )}
              onClick={() => void handleSaveRow(index)}
              disabled={isSavingRow || !canPersistRow}
              aria-label="Salvar tarefa"
            >
              {isSavingRow ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={cn(TASK_ACTION_ICON_BASE_CLASS, TASK_ACTION_ICON_VARIANTS.start)}
              disabled={isDraftRow || isSavingRow || isRunning}
              onClick={() => handleStartTimer(row)}
              aria-label="Iniciar apontamento"
            >
              <Play className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={cn(TASK_ACTION_ICON_BASE_CLASS, TASK_ACTION_ICON_VARIANTS.pause)}
              disabled={isDraftRow || isSavingRow || !isRunning}
              onClick={() => handlePauseTimer(row)}
              aria-label="Pausar apontamento"
            >
              <Pause className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={cn(TASK_ACTION_ICON_BASE_CLASS, TASK_ACTION_ICON_VARIANTS.stop)}
              disabled={isDraftRow || isSavingRow || (!isRunning && !hasPausedTime)}
              onClick={() => handleStopTimer(row)}
              aria-label="Encerrar apontamento"
            >
              <Square className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={() => void deleteRow(index)}
              aria-label="Excluir tarefa"
              disabled={isDeletingRow}
            >
              {isDeletingRow ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
            </Button>
          </div>
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

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col gap-4 overflow-hidden">
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
                    className="rounded-full bg-muted px-2 py-1 text-[10px] text-foreground"
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
                variant={isCondensedView ? 'default' : 'outline'}
                onClick={() => setIsCondensedView(prev => !prev)}
                aria-pressed={isCondensedView}
              >
                <TableIcon className="h-4 w-4 mr-2" />
                {isCondensedView ? 'Visão padrão' : 'Visão condensada'}
              </Button>

            </div>
          </CardHeader>
          <CardContent className="flex flex-1 min-h-0 min-w-0 flex-col gap-4 overflow-hidden bg-background pt-4">
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
                              className={cn(
                                'group relative select-none border-r border-border/60 bg-background px-2 text-left font-semibold text-muted-foreground transition-colors text-[10px]',
                                isCondensedView ? 'h-8 py-1.5' : 'h-10 py-2',
                                draggingColumn === column.key && 'opacity-70',
                                dragOverColumn === column.key && 'ring-2 ring-inset ring-primary/40',
                              )}
                              style={{ width: `${width}px`, minWidth: `${width}px` }}
                            >
                              {column.label}
                              {/* Handle para redimensionamento manual das colunas */}
                              <div
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
                      ) : grouping === 'none' ? (
                        editableRows.map((row, index) => renderTaskRow(row, index))
                      ) : (
                        groupedRows?.map((group, groupIndex) => {
                          const highlightClass = GROUP_HIGHLIGHT_CLASSES[groupIndex % GROUP_HIGHLIGHT_CLASSES.length];
                          const rowHighlightClass = highlightClass;

                          return (
                            <React.Fragment key={`group-${group.key}`}>
                              <TableRow
                                className={cn(
                                  'text-[10px] text-muted-foreground border-y border-border/60',
                                  highlightClass
                                )}
                              >
                                <TableCell
                                  colSpan={visibleColumns.length + 1}
                                  className="border-l-4 border-l-primary/50 px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide"
                                >
                                  <div className="flex flex-col gap-1 text-foreground sm:flex-row sm:items-center sm:justify-between">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span className="truncate text-foreground">{group.label}</span>
                                      {grouping === 'responsavel' ? (() => {
                                        const summary = getResponsibleTimeSummary(group.label);
                                        if (!summary) {
                                          return null;
                                        }
                                        return (
                                          <span className="rounded-full bg-muted px-2 py-0.5 text-[9px] font-normal uppercase tracking-wide text-muted-foreground">
                                            Tempo: {summary.formatted}
                                          </span>
                                        );
                                      })() : null}
                                    </div>
                                    <span className="text-[10px] font-medium text-foreground/80">
                                      {group.rows.length} tarefa{group.rows.length > 1 ? 's' : ''}
                                    </span>
                                  </div>
                                </TableCell>
                              </TableRow>
                              {group.rows.map(item => renderTaskRow(item.row, item.index, rowHighlightClass))}
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
        </CardContent>
      </Card>
      <Dialog open={isTaskDialogOpen} onOpenChange={(open) => { if (!open) closeTaskDialog(); }}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              {activeTaskDialog?.mode === 'view' ? 'Resumo da tarefa' : 'Editar tarefa'}
            </DialogTitle>
          </DialogHeader>
          {activeDialogRow ? (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">
                  {activeDialogRow.nome && activeDialogRow.nome.trim().length > 0
                    ? activeDialogRow.nome
                    : 'Tarefa sem título'}
                </p>
              </div>
              <ScrollArea className="max-h-[60vh] pr-2">
                <div className="grid gap-4 sm:grid-cols-2">
                  {visibleColumns.map(column => (
                    <div key={column.key} className="space-y-1">
                      <span className="text-xs font-medium text-muted-foreground">{column.label}</span>
                      {activeTaskDialog?.mode === 'view' ? (
                        <div className="rounded-md border border-border/60 bg-muted/40 px-3 py-2 text-sm">
                          {renderTaskSummaryValue(activeDialogRow, column)}
                        </div>
                      ) : (
                        <div className="rounded-md border border-border/40 bg-background px-2 py-1">
                          {renderEditableCell(activeDialogRow, activeTaskDialog.index, column)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          ) : null}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={closeTaskDialog}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}