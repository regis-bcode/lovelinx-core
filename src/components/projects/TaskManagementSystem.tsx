import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import type { ChangeEvent } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { Settings, Download, Save, Trash2, Upload, PlusCircle, PlusSquare, Type, Hash, Percent, Coins, ListChecks, Tags, CheckSquare, Pencil, Eye, Table as TableIcon } from 'lucide-react';
import { format } from 'date-fns';
import { CustomField, Task } from '@/types/task';
import type { Status } from '@/types/status';
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
import * as XLSX from 'xlsx';
import { cn } from '@/lib/utils';

interface TaskManagementSystemProps {
  projectId: string;
  projectClient?: string;
}

type TaskRow = Partial<Task> & { _isNew?: boolean; _tempId?: string };

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

const CUSTOM_FIELD_TYPES: Array<{
  type: CustomField['field_type'];
  label: string;
  description: string;
  icon: React.ElementType;
}> = [
  {
    type: 'text',
    label: 'Texto personalizado',
    description: 'Capture informações em formato de texto curto.',
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

export function TaskManagementSystem({ projectId, projectClient }: TaskManagementSystemProps) {
  const { tasks, customFields, loading, createTask, updateTask, deleteTask, createCustomField } = useTasks(projectId);
  const { tap } = useTAP(projectId);
  const { statuses } = useStatus();
  const { modulos, createModulo } = useModulos();
  const { areas, createArea } = useAreas();
  const { categorias, createCategoria } = useCategorias();
  const { getTaskTotalTime } = useTimeLogs(projectId);
  const { allocations: projectAllocations } = useProjectAllocations(projectId);
  const { isGestor } = useUserRoles();
  const { toast } = useToast();

  const [editableRows, setEditableRows] = useState<TaskRow[]>([]);
  const [hiddenColumns, setHiddenColumns] = useState<string[]>([]);
  const [columnOrder, setColumnOrder] = useState<string[]>([]);
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const [draggingColumn, setDraggingColumn] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const [isLoadedPreferences, setIsLoadedPreferences] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [isCondensedView, setIsCondensedView] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isCustomFieldDialogOpen, setIsCustomFieldDialogOpen] = useState(false);
  const [selectedFieldType, setSelectedFieldType] = useState<CustomField['field_type'] | null>(null);
  const [fieldName, setFieldName] = useState('');
  const [fieldOptionsInput, setFieldOptionsInput] = useState('');
  const [isFieldRequired, setIsFieldRequired] = useState(false);
  const [fieldSearch, setFieldSearch] = useState('');
  const [isCreatingField, setIsCreatingField] = useState(false);
  const [activeTaskDialog, setActiveTaskDialog] = useState<{ mode: 'view' | 'edit'; index: number } | null>(null);

  const defaultClient = useMemo(() => {
    if (projectClient) {
      return projectClient;
    }
    if (tap?.cod_cliente) {
      return tap.cod_cliente;
    }
    return '';
  }, [projectClient, tap?.cod_cliente]);

  const preferencesStorageKey = useMemo(() => `task-table-preferences-${projectId}`, [projectId]);

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

    const tipoMap: Record<string, string> = {
      PROJETO: 'tarefa_projeto',
      SUPORTE: 'tarefa_suporte',
      AVULSO: 'tarefa_projeto', // Tratamos AVULSO como tarefa_projeto
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

    const tipoSynonyms: Record<string, string[]> = {
      'tarefa_projeto': ['tarefa_projeto', 'projeto', 'tarefa'],
      'tarefa_suporte': ['tarefa_suporte', 'suporte', 'tarefa'],
    };

    const rawTipoStatus = tap?.tipo ? tipoMap[tap.tipo] ?? tipoMap.PROJETO : tipoMap.PROJETO;
    const normalizedTipoStatus = rawTipoStatus?.toLowerCase();
    const allowedValues = normalizedTipoStatus
      ? tipoSynonyms[normalizedTipoStatus] ?? [normalizedTipoStatus]
      : null;

    return statuses.filter(status => {
      if (!status?.ativo) {
        return false;
      }

      const tiposAplicacao = normalizeTipoAplicacao(
        (status as Status & { tipo_aplicacao?: Status['tipo_aplicacao'] | string | null | undefined }).tipo_aplicacao
      ).map(tipo => tipo.toLowerCase());

      // Se o status não possui tipos configurados, mantemos disponível para evitar travamentos
      if (!tiposAplicacao.length || !allowedValues) {
        return true;
      }

      return tiposAplicacao.some(tipo => allowedValues.includes(tipo));
    });
  }, [tap?.tipo, statuses]);

  const defaultStatusName = useMemo(() => {
    if (filteredStatuses.length > 0) {
      return filteredStatuses[0].nome;
    }

    const fallback = statuses.find(status => status.ativo);
    return fallback?.nome ?? '';
  }, [filteredStatuses, statuses]);

  // Inicializar rows com as tasks existentes
  const createBlankRow = useCallback((order: number): TaskRow => ({
    _isNew: true,
    _tempId: `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    project_id: projectId,
    task_id: '',
    nome: '',
    prioridade: 'Média',
    status: defaultStatusName || '',
    cliente: defaultClient || undefined,
    percentual_conclusao: 0,
    nivel: 0,
    ordem: order,
    custom_fields: {},
  }), [projectId, defaultClient, defaultStatusName]);

  useEffect(() => {
    setEditableRows(tasks.map(t => ({ ...t, custom_fields: t.custom_fields || {} })));
    setHasChanges(false);
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

    setEditableRows([createBlankRow(0)]);
    setHasChanges(true);
  }, [loading, tasksLength, editableRows.length, createBlankRow]);

  useEffect(() => {
    let modified = false;
    setEditableRows(prev => {
      if (!prev.length) return prev;
      const [first, ...rest] = prev;
      if (!first._isNew) return prev;

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
    { key: 'criticidade', label: 'Criticidade', width: '120px' },
    { key: 'escopo', label: 'Escopo', width: '150px' },
  ]), []);

  const customFieldColumns = useMemo<ColumnDefinition[]>(() => (
    customFields.map(field => ({
      key: `custom_${field.id}`,
      label: field.field_name,
      width: '180px',
      isCustom: true,
      field,
    }))
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

  const addNewRow = () => {
    setEditableRows(prev => [...prev, createBlankRow(prev.length)]);
    setHasChanges(true);
  };

  const deleteRow = (index: number) => {
    setEditableRows(prev => prev.filter((_, i) => i !== index));
    setHasChanges(true);
  };

  const saveAllChanges = async () => {
    try {
      for (const row of editableRows) {
        if (row._isNew) {
          // Nova tarefa
          const { _isNew, _tempId, id, task_id, created_at, updated_at, user_id, ...taskData } = row;
          await createTask(taskData);
        } else if (row.id) {
          // Atualizar tarefa existente
          const { id, task_id, created_at, updated_at, user_id, ...taskData } = row;
          await updateTask(id, taskData);
        }
      }

      // Processar exclusões (tarefas que estavam em tasks mas não estão em editableRows)
      const currentIds = editableRows.filter(r => !r._isNew).map(r => r.id);
      const deletedTasks = tasks.filter(t => !currentIds.includes(t.id));
      for (const task of deletedTasks) {
        await deleteTask(task.id);
      }

      setHasChanges(false);
      toast({
        title: "Sucesso",
        description: "Todas as alterações foram salvas",
      });
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast({
        title: "Erro",
        description: "Erro ao salvar as alterações",
        variant: "destructive"
      });
    }
  };

  const exportToExcel = () => {
    const exportData = editableRows.map(task => {
      const row: Record<string, unknown> = {};
      allColumns.forEach(col => {
        if ('isCustom' in col && col.isCustom) {
          const customValue = task.custom_fields?.[col.field.field_name];
          if (Array.isArray(customValue)) {
            row[col.label] = customValue.join(', ');
          } else if (typeof customValue === 'boolean') {
            row[col.label] = customValue ? 'Sim' : 'Não';
          } else {
            row[col.label] = customValue ?? '';
          }
        } else {
          row[col.label] = task[col.key as keyof Task] ?? '';
        }
      });
      return row;
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Tarefas');
    XLSX.writeFile(wb, `tarefas-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  const handleExportTemplate = () => {
    const templateRow: Record<string, string> = {
      'Nome da Tarefa': '',
      'Prioridade': 'Média',
      'Status': filteredStatuses[0]?.nome || 'BACKLOG',
      'Cliente': defaultClient,
      'Responsável': '',
      'Vencimento (dd/mm/aaaa)': '',
      'Percentual de Conclusão (%)': '0',
      'Módulo': '',
      'Área': '',
      'Categoria': '',
      'Criticidade': '',
      'Escopo': '',
    };

    customFields.forEach(field => {
      templateRow[field.field_name] = '';
    });

    const worksheet = XLSX.utils.json_to_sheet([templateRow]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Modelo Tarefas');
    XLSX.writeFile(workbook, 'modelo-tarefas.xlsx');
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const parseDateValue = (value: unknown): string | undefined => {
    if (!value) return undefined;
    if (typeof value === 'number') {
      const ssf = XLSX.SSF as { parse_date_code?: (value: number) => { y: number; m: number; d: number } };
      const date = ssf.parse_date_code?.(value);
      if (!date) return undefined;
      const year = String(date.y).padStart(4, '0');
      const month = String(date.m).padStart(2, '0');
      const day = String(date.d).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }

    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) return undefined;

      const dateParts = trimmed.split(/[/\\]/);
      if (dateParts.length === 3) {
        const [day, month, year] = dateParts;
        if (day && month && year) {
          const isoYear = year.padStart(4, '0');
          const isoMonth = month.padStart(2, '0');
          const isoDay = day.padStart(2, '0');
          return `${isoYear}-${isoMonth}-${isoDay}`;
        }
      }

      const parsed = new Date(trimmed);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed.toISOString().split('T')[0];
      }
    }

    return undefined;
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.target;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

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

      const priorityOptions = ['Baixa', 'Média', 'Alta', 'Crítica'];
      const statusOptions = filteredStatuses.map(status => status.nome.toLowerCase());

      const formattedRows = rows.map<TaskRow | null>((row) => {
        const nome = String(row['Nome da Tarefa'] ?? row['Nome'] ?? '').trim();
        if (!nome) {
          return null;
        }

        const prioridadeValue = String(row['Prioridade'] ?? '').trim();
        const prioridade = priorityOptions.includes(prioridadeValue) ? prioridadeValue : 'Média';

        const statusValue = String(row['Status'] ?? '').trim();
        const status = statusOptions.includes(statusValue.toLowerCase())
          ? filteredStatuses.find(s => s.nome.toLowerCase() === statusValue.toLowerCase())?.nome || 'BACKLOG'
          : filteredStatuses[0]?.nome || 'BACKLOG';

        const clienteValue = String(row['Cliente'] ?? '').trim();
        const responsavelValue = String(row['Responsável'] ?? '').trim();
        const percentualValue = row['Percentual de Conclusão (%)'] ?? row['Percentual de Conclusão'] ?? row['% Conclusão'];
        const percentualNumber = typeof percentualValue === 'number'
          ? percentualValue
          : parseInt(String(percentualValue).replace(/[^0-9]/g, ''), 10);
        const percentualConclusao = Number.isFinite(percentualNumber)
          ? Math.min(Math.max(Number(percentualNumber), 0), 100)
          : 0;

        const customFieldValues: Record<string, unknown> = {};
        customFields.forEach(field => {
          const rawValue = row[field.field_name];
          if (rawValue === undefined || rawValue === null || rawValue === '') {
            return;
          }

          switch (field.field_type) {
            case 'numeric': {
              const numericValue = Number(rawValue);
              if (!Number.isNaN(numericValue)) {
                customFieldValues[field.field_name] = numericValue;
              }
              break;
            }
            case 'monetary': {
              const monetaryValue = typeof rawValue === 'number'
                ? rawValue
                : Number(String(rawValue).replace(/[^0-9,-]/g, '').replace(',', '.'));
              if (!Number.isNaN(monetaryValue)) {
                customFieldValues[field.field_name] = monetaryValue;
              }
              break;
            }
            case 'percentage': {
              const percentageValue = typeof rawValue === 'number'
                ? rawValue
                : Number(String(rawValue).replace(/[^0-9]/g, ''));
              if (!Number.isNaN(percentageValue)) {
                customFieldValues[field.field_name] = Math.min(Math.max(percentageValue, 0), 100);
              }
              break;
            }
            case 'checkbox': {
              if (typeof rawValue === 'boolean') {
                customFieldValues[field.field_name] = rawValue;
              } else {
                const normalized = String(rawValue).toLowerCase();
                customFieldValues[field.field_name] = ['true', 'sim', '1', 'yes', 'y'].includes(normalized);
              }
              break;
            }
            case 'tags': {
              if (Array.isArray(rawValue)) {
                const tagsValues = rawValue.map(value => String(value).trim()).filter(Boolean);
                if (tagsValues.length) {
                  customFieldValues[field.field_name] = tagsValues;
                }
              } else {
                const tagsValues = String(rawValue)
                  .split(/[,;\n]/)
                  .map(tag => tag.trim())
                  .filter(Boolean);
                if (tagsValues.length) {
                  customFieldValues[field.field_name] = tagsValues;
                }
              }
              break;
            }
            case 'dropdown': {
              const dropdownValue = String(rawValue).trim();
              if (dropdownValue) {
                customFieldValues[field.field_name] = dropdownValue;
              }
              break;
            }
            default: {
              customFieldValues[field.field_name] = String(rawValue).trim();
            }
          }
        });

        return {
          nome,
          prioridade: prioridade as Task["prioridade"],
          status,
          cliente: clienteValue || defaultClient || undefined,
          responsavel: responsavelValue || undefined,
          data_vencimento: parseDateValue(row['Vencimento (dd/mm/aaaa)'] ?? row['Vencimento'] ?? row['Data de Vencimento']),
          percentual_conclusao: percentualConclusao,
          modulo: String(row['Módulo'] ?? row['Modulo'] ?? '').trim() || undefined,
          area: String(row['Área'] ?? row['Area'] ?? '').trim() || undefined,
          categoria: String(row['Categoria'] ?? '').trim() || undefined,
          criticidade: String(row['Criticidade'] ?? '').trim() || undefined,
          escopo: String(row['Escopo'] ?? '').trim() || undefined,
          nivel: 0,
          ordem: tasks.length,
          custom_fields: customFieldValues,
        } as TaskRow;
      }).filter((row): row is TaskRow => row !== null);

      if (formattedRows.length === 0) {
        toast({
          title: 'Nenhum dado válido encontrado na planilha',
          variant: 'destructive',
        });
        return;
      }

      let createdCount = 0;
      let currentOrder = tasks.length;

      for (const row of formattedRows) {
        try {
          const { nivel, ordem, ...taskData } = row;
          const result = await createTask({
            ...taskData,
            nivel: 0,
            ordem: currentOrder,
            percentual_conclusao: row.percentual_conclusao ?? 0,
            custom_fields: row.custom_fields ?? {},
          });
          if (result) {
            createdCount += 1;
            currentOrder += 1;
          }
        } catch (error) {
          console.error('Erro ao importar tarefa', error);
        }
      }

      if (createdCount > 0) {
        toast({
          title: 'Importação concluída',
          description: `${createdCount} tarefa(s) importada(s) com sucesso!`,
        });
      } else {
        toast({
          title: 'Não foi possível importar os dados',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error(error);
      toast({
        title: 'Erro ao importar planilha',
        variant: 'destructive',
      });
    } finally {
      setIsImporting(false);
      if (input) {
        input.value = '';
      }
    }
  };

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
        case 'monetary':
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
        case 'percentage':
          return (
            <Input
              type="number"
              min="0"
              max="100"
              value={typeof customValue === 'number' ? customValue : ''}
              onChange={(e) => {
                const parsedValue = e.target.value === ''
                  ? undefined
                  : Math.min(Math.max(Number(e.target.value), 0), 100);
                const normalizedValue = typeof parsedValue === 'number' && !Number.isNaN(parsedValue)
                  ? parsedValue
                  : undefined;
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
      return <span className="text-xs text-muted-foreground">{row._isNew ? 'Novo' : String(value || '')}</span>;
    }

    if (column.key === 'tempo_total') {
      if (!row.id) return <span className="text-xs text-muted-foreground">-</span>;
      const minutes = getTaskTotalTime(row.id);
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return <span className="text-xs">{hours}h {mins}m</span>;
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

      return (
        <Select
          value={currentStatus}
          onValueChange={(val) => updateCell(rowIndex, column.key, val)}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            {filteredStatuses
              .filter(status => typeof status.nome === 'string' && status.nome.trim().length > 0)
              .map(status => (
                <SelectItem key={status.id} value={status.nome}>
                  {status.nome}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      );
    }

    if (column.key === 'percentual_conclusao') {
      return (
        <Input
          type="number"
          min="0"
          max="100"
          value={value as number || 0}
          onChange={(e) => updateCell(rowIndex, column.key, parseInt(e.target.value) || 0)}
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
      return (
        <Input
          type="date"
          value={value as string || ''}
          onChange={(e) => updateCell(rowIndex, column.key, e.target.value)}
          className="h-8 text-xs"
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

      if (column.field.field_type === 'monetary' && typeof customValue === 'number') {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(customValue);
      }

      return <span>{String(customValue)}</span>;
    }

    const value = row[column.key as keyof TaskRow];
    const isEmptyString = typeof value === 'string' && value.trim() === '';
    const isNullish = value === null || value === undefined;

    if (column.key === 'task_id') {
      if (row._isNew) {
        return <span className="text-muted-foreground">Novo</span>;
      }
      return value ? <span>{String(value)}</span> : <span className="text-muted-foreground">-</span>;
    }

    if (column.key === 'tempo_total') {
      if (!row.id) return <span className="text-muted-foreground">-</span>;
      const minutes = getTaskTotalTime(row.id);
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return <span>{`${hours}h ${mins}m`}</span>;
    }

    if (column.key === 'percentual_conclusao') {
      if (typeof value === 'number') {
        return <span>{`${value}%`}</span>;
      }
      return <span className="text-muted-foreground">0%</span>;
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
  }, [getTaskTotalTime]);

  const closeTaskDialog = useCallback(() => setActiveTaskDialog(null), []);

  const activeDialogRow = activeTaskDialog ? editableRows[activeTaskDialog.index] : null;
  const isTaskDialogOpen = Boolean(activeTaskDialog && activeDialogRow);

  const resetFieldDialogState = () => {
    setSelectedFieldType(null);
    setFieldName('');
    setFieldOptionsInput('');
    setIsFieldRequired(false);
    setFieldSearch('');
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

  const filteredFieldTypes = useMemo(() => {
    if (!fieldSearch.trim()) return CUSTOM_FIELD_TYPES;
    const normalizedSearch = fieldSearch.toLowerCase();
    return CUSTOM_FIELD_TYPES.filter(option =>
      option.label.toLowerCase().includes(normalizedSearch) ||
      option.description.toLowerCase().includes(normalizedSearch)
    );
  }, [fieldSearch]);

  return (
    // Container alinhado ao layout dos demais menus (largura total e altura mínima)
    <div className="flex h-full min-w-0 flex-col space-y-4">
      {/* Header com ações */}
      <Card className="min-w-0 overflow-hidden rounded-3xl">
        <CardHeader className="space-y-4">
          <div className="flex flex-col gap-1">
            <CardTitle>Gestão de Tarefas</CardTitle>
            <CardDescription>
              Centralize o cadastro das tarefas, personalize campos e acompanhe o andamento do projeto com uma visão consistente.
            </CardDescription>
          </div>

          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              {hasChanges ? (
                <Badge variant="outline" className="border-amber-500/50 bg-amber-500/10 text-amber-700">
                  Alterações não salvas
                </Badge>
              ) : (
                <span className="text-sm text-muted-foreground">Tudo sincronizado</span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <input
                type="file"
                accept=".xls,.xlsx"
                className="hidden"
                ref={fileInputRef}
                onChange={handleFileChange}
              />

              <Button size="sm" onClick={addNewRow} disabled={loading}>
                <PlusCircle className="h-4 w-4 mr-2" />
                Nova tarefa
              </Button>

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
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="field-search">Pesquise campos novos ou existentes</Label>
                        <Input
                          id="field-search"
                          value={fieldSearch}
                          onChange={(event) => setFieldSearch(event.target.value)}
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

              <Button size="sm" variant="outline" onClick={handleExportTemplate}>
                <Download className="h-4 w-4 mr-2" />
                Exportar modelo
              </Button>

              <Button size="sm" variant="outline" onClick={handleImportClick} disabled={isImporting}>
                <Upload className="h-4 w-4 mr-2" />
                {isImporting ? 'Importando...' : 'Importar dados'}
              </Button>

              <Button size="sm" variant="outline" onClick={exportToExcel}>
                <Download className="h-4 w-4 mr-2" />
                Exportar
              </Button>

              <Button
                size="sm"
                onClick={saveAllChanges}
                disabled={!hasChanges || loading}
                variant={hasChanges ? 'default' : 'outline'}
              >
                <Save className="h-4 w-4 mr-2" />
                Salvar alterações
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>
      {/* Tabela estilo Excel */}
      <Card className="flex flex-1 min-w-0 flex-col overflow-hidden rounded-3xl">
        <CardContent className="flex-1 min-w-0 p-0">
          {/* ScrollArea ajustado para permitir rolagem horizontal e altura consistente */}
          <div className="h-full min-h-[420px] w-full">
            <ScrollArea className="h-full min-w-0" scrollBarOrientation="both">
              {/* min-w atualizado para acomodar todas as colunas sem quebra visual */}
              {/* Densidade compacta aplicada (tipografia menor, paddings enxutos e altura controlada) */}
              <Table className={cn("min-w-[1600px]", isCondensedView ? "text-[12px]" : "text-[13px]")}>
                <TableHeader className="sticky top-0 z-20 bg-background">
                  <TableRow className={cn(isCondensedView ? 'h-8' : 'h-10')}>
                    {/* Coluna de ações mantida fixa à esquerda para navegação durante a rolagem */}
                    <TableHead
                      className={cn(
                        'sticky left-0 z-30 select-none border-r border-border/60 bg-background px-2 font-semibold text-muted-foreground',
                        isCondensedView ? 'h-8 py-1.5 text-[12px]' : 'h-10 py-2 text-[13px]'
                      )}
                      style={{ width: '140px', minWidth: '140px' }}
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
                          className={cn(
                            'group relative select-none border-r border-border/60 bg-background px-2 text-left font-semibold text-muted-foreground transition-colors',
                            isCondensedView ? 'h-8 py-1.5 text-[12px]' : 'h-10 py-2 text-[13px]',
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
                        className={cn('py-8 text-center', isCondensedView ? 'text-[12px]' : 'text-[13px]')}
                      >
                        Carregando...
                      </TableCell>
                    </TableRow>
                  ) : editableRows.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={visibleColumns.length + 1}
                        className={cn('py-8 text-center', isCondensedView ? 'text-[12px]' : 'text-[13px]')}
                      >
                        <p className="text-muted-foreground">Nenhuma tarefa. Clique em "Adicionar Tarefa" para registrar a primeira.</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    editableRows.map((row, index) => (
                      <TableRow
                        key={row.id || row._tempId || index}
                        className={cn(
                          'border-b border-border/60 bg-background hover:bg-muted/40',
                          isCondensedView ? 'h-8 text-[12px]' : 'h-9 text-[13px]'
                        )}
                      >
                        <TableCell
                          className={cn(
                            'sticky left-0 z-20 bg-background px-2',
                            isCondensedView ? 'py-1' : 'py-1.5'
                          )}
                          style={{ width: '140px', minWidth: '140px' }}
                        >
                          <div className="flex items-center gap-1.5">
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
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => deleteRow(index)}
                              aria-label="Excluir tarefa"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                        {visibleColumns.map(col => {
                          const width = getColumnWidth(col.key);
                          return (
                            <TableCell
                              key={col.key}
                              className={cn(
                                'px-2 align-middle',
                                isCondensedView ? 'py-0.5 text-[12px]' : 'py-1 text-[13px]'
                              )}
                              style={{ width: `${width}px`, minWidth: `${width}px` }}
                            >
                              {renderEditableCell(row, index, col)}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))
                  )}
                  {!loading && (
                    <TableRow
                      className={cn(
                        'cursor-pointer border-b border-border/60 bg-background hover:bg-muted/30',
                        isCondensedView ? 'h-8 text-[12px]' : 'h-9 text-[13px]'
                      )}
                      onClick={addNewRow}
                    >
                      <TableCell
                        colSpan={visibleColumns.length + 1}
                        className={cn('px-3 text-primary', isCondensedView ? 'py-1.5' : 'py-2')}
                      >
                        <div className="flex items-center gap-2">
                          <PlusCircle className="h-3.5 w-3.5" />
                          <span className="font-medium">Adicionar Tarefa</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
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
            {activeTaskDialog?.mode === 'edit' && (
              <Button onClick={saveAllChanges} disabled={!hasChanges || loading}>
                <Save className="mr-2 h-4 w-4" />
                Salvar alterações
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}