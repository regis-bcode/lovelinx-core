import React, { useState, useEffect, useMemo, useRef } from 'react';
import type { ChangeEvent } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CreatableSelect } from '@/components/ui/creatable-select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Settings, Download, Save, Trash2, Upload, PlusCircle, PlusSquare, Type, Hash, Percent, Coins, ListChecks, Tags, CheckSquare } from 'lucide-react';
import { format } from 'date-fns';
import { CustomField, Task } from '@/types/task';
import { useTasks } from '@/hooks/useTasks';
import { useTAP } from '@/hooks/useTAP';
import { useStatus } from '@/hooks/useStatus';
import { useModulos } from '@/hooks/useModulos';
import { useAreas } from '@/hooks/useAreas';
import { useCategorias } from '@/hooks/useCategorias';
import { useTimeLogs } from '@/hooks/useTimeLogs';
import { useUserRoles } from '@/hooks/useUserRoles';
import { useToast } from '@/hooks/use-toast';
import { useTeams } from '@/hooks/useTeams';
import * as XLSX from 'xlsx';

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
  const { teams } = useTeams(projectId);
  const { isGestor } = useUserRoles();
  const { toast } = useToast();
  
  const [editableRows, setEditableRows] = useState<TaskRow[]>([]);
  const [hiddenColumns, setHiddenColumns] = useState<string[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isCustomFieldDialogOpen, setIsCustomFieldDialogOpen] = useState(false);
  const [selectedFieldType, setSelectedFieldType] = useState<CustomField['field_type'] | null>(null);
  const [fieldName, setFieldName] = useState('');
  const [fieldOptionsInput, setFieldOptionsInput] = useState('');
  const [isFieldRequired, setIsFieldRequired] = useState(false);
  const [fieldSearch, setFieldSearch] = useState('');
  const [isCreatingField, setIsCreatingField] = useState(false);

  const defaultClient = useMemo(() => {
    if (projectClient) {
      return projectClient;
    }
    if (tap?.cod_cliente) {
      return tap.cod_cliente;
    }
    return '';
  }, [projectClient, tap?.cod_cliente]);

  // Filtrar status baseado no tipo da TAP
  const filteredStatuses = useMemo(() => {
    if (!tap?.tipo || !statuses.length) return [];

    const tipoMap: Record<string, string> = {
      'PROJETO': 'tarefa_projeto',
      'SUPORTE': 'tarefa_suporte',
      'AVULSO': 'tarefa_projeto' // Tratamos AVULSO como tarefa_projeto
    };
    
    const tipoStatus = tipoMap[tap.tipo];

    return statuses.filter(s =>
      s.ativo && s.tipo_aplicacao.includes(tipoStatus)
    );
  }, [tap?.tipo, statuses]);

  const defaultStatusName = useMemo(() => {
    if (filteredStatuses.length > 0) {
      return filteredStatuses[0].nome;
    }

    const fallback = statuses.find(status => status.ativo);
    return fallback?.nome ?? '';
  }, [filteredStatuses, statuses]);

  // Inicializar rows com as tasks existentes
  useEffect(() => {
    setEditableRows(tasks.map(t => ({ ...t, custom_fields: t.custom_fields || {} })));
    setHasChanges(false);
  }, [tasks]);

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

  const visibleColumns = allColumns.filter(col => !hiddenColumns.includes(col.key));

  const toggleColumn = (columnKey: string) => {
    setHiddenColumns(prev => 
      prev.includes(columnKey) 
        ? prev.filter(k => k !== columnKey)
        : [...prev, columnKey]
    );
  };

  const updateCell = (index: number, field: string, value: unknown) => {
    setEditableRows(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value as TaskRow[keyof TaskRow] };
      return updated;
    });
    setHasChanges(true);
  };

  const addNewRow = () => {
    const tempId = `temp-${Date.now()}`;
    const newRow: TaskRow = {
      _isNew: true,
      _tempId: tempId,
      project_id: projectId,
      task_id: '',
      nome: '',
      prioridade: 'Média',
      status: defaultStatusName,
      cliente: defaultClient,
      percentual_conclusao: 0,
      nivel: 0,
      ordem: editableRows.length,
      custom_fields: {},
    };
    setEditableRows(prev => [...prev, newRow]);
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

      const formattedRows = rows.map((row) => {
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
          prioridade,
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
        };
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
                {(field.field_options || []).map(option => (
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
            {filteredStatuses.map(status => (
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
      return (
        <Select
          value={(value as string) || ''}
          onValueChange={(val) => updateCell(rowIndex, column.key, val || undefined)}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder={teams.length ? 'Selecione' : 'Sem membros disponíveis'} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Sem responsável</SelectItem>
            {teams.map((team) => (
              <SelectItem key={team.id} value={team.nome}>
                {team.nome}
              </SelectItem>
            ))}
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
    <div className="space-y-4">
      {/* Header com ações */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Gestão de Tarefas</CardTitle>
            <div className="flex gap-2">
              <input
                type="file"
                accept=".xls,.xlsx"
                className="hidden"
                ref={fileInputRef}
                onChange={handleFileChange}
              />

              <Dialog open={isCustomFieldDialogOpen} onOpenChange={(open) => {
                setIsCustomFieldDialogOpen(open);
                if (!open) {
                  resetFieldDialogState();
                }
              }}>
                <DialogTrigger asChild>
                  <Button variant="default">
                    <PlusSquare className="h-4 w-4 mr-2" />
                    Novo Campo
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Criar campo personalizado</DialogTitle>
                  </DialogHeader>
                  {!selectedFieldType ? (
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="field-search">Pesquise campos novos ou existentes</Label>
                        <Input
                          id="field-search"
                          value={fieldSearch}
                          onChange={(event) => setFieldSearch(event.target.value)}
                          placeholder="Digite para filtrar os tipos de campos"
                          className="mt-2"
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
                                className="w-full text-left flex items-start gap-3 rounded-md border border-border/60 p-3 hover:border-primary hover:bg-primary/5 transition"
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
                            <p className="text-sm text-muted-foreground text-center">Nenhum tipo encontrado para sua busca.</p>
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
                          Configurando campo do tipo <span className="font-medium">{CUSTOM_FIELD_TYPES.find(option => option.type === selectedFieldType)?.label}</span>
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
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => {
                          resetFieldDialogState();
                          setIsCustomFieldDialogOpen(false);
                        }}>
                          Cancelar
                        </Button>
                        <Button onClick={handleCreateCustomField} disabled={isCreatingField}>
                          {isCreatingField ? 'Criando...' : 'Criar campo'}
                        </Button>
                      </div>
                    </div>
                  )}
                </DialogContent>
              </Dialog>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline">
                    <Settings className="h-4 w-4 mr-2" />
                    Colunas
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 max-h-80 overflow-y-auto">
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Mostrar/Ocultar Colunas</h4>
                    {allColumns.map(col => (
                      <div key={col.key} className="flex items-center space-x-2">
                        <Checkbox
                          id={`col-${col.key}`}
                          checked={!hiddenColumns.includes(col.key)}
                          onCheckedChange={() => toggleColumn(col.key)}
                        />
                        <label htmlFor={`col-${col.key}`} className="text-sm cursor-pointer">
                          {col.label}
                        </label>
                      </div>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>

              <Button variant="outline" onClick={handleExportTemplate}>
                <Download className="h-4 w-4 mr-2" />
                Exportar Modelo
              </Button>

              <Button variant="outline" onClick={handleImportClick} disabled={isImporting}>
                <Upload className="h-4 w-4 mr-2" />
                {isImporting ? 'Importando...' : 'Importar Dados'}
              </Button>

              <Button variant="outline" onClick={exportToExcel}>
                <Download className="h-4 w-4 mr-2" />
                Exportar
              </Button>

              <Button
                onClick={saveAllChanges}
                disabled={!hasChanges || loading}
                variant={hasChanges ? "default" : "outline"}
              >
                <Save className="h-4 w-4 mr-2" />
                Salvar {hasChanges && '(*)'}
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Tabela estilo Excel */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-auto max-h-[600px]">
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow>
                  <TableHead className="w-[50px]">Ações</TableHead>
                  {visibleColumns.map(col => (
                    <TableHead key={col.key} style={{ minWidth: col.width }}>
                      {col.label}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={visibleColumns.length + 1} className="text-center py-8">
                      Carregando...
                    </TableCell>
                  </TableRow>
                ) : editableRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={visibleColumns.length + 1} className="text-center py-8">
                      <p className="text-muted-foreground">Nenhuma tarefa. Clique em "Adicionar Tarefa" para registrar a primeira.</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  editableRows.map((row, index) => (
                    <TableRow key={row.id || row._tempId || index} className="hover:bg-muted/50">
                      <TableCell className="p-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteRow(index)}
                          className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                      {visibleColumns.map(col => (
                        <TableCell key={col.key} className="p-1">
                          {renderEditableCell(row, index, col)}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                )}
                {!loading && (
                  <TableRow className="hover:bg-muted/40 cursor-pointer" onClick={addNewRow}>
                    <TableCell colSpan={visibleColumns.length + 1} className="p-3 text-sm text-primary">
                      <div className="flex items-center gap-2">
                        <PlusCircle className="h-4 w-4" />
                        <span>Adicionar Tarefa</span>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {hasChanges && (
        <div className="text-sm text-muted-foreground">
          * Você tem alterações não salvas
        </div>
      )}
    </div>
  );
}