import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CreatableSelect } from '@/components/ui/creatable-select';
import { Settings, Download, Save, Trash2, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { Task } from '@/types/task';
import { useTasks } from '@/hooks/useTasks';
import { useTAP } from '@/hooks/useTAP';
import { useStatus } from '@/hooks/useStatus';
import { useModulos } from '@/hooks/useModulos';
import { useAreas } from '@/hooks/useAreas';
import { useCategorias } from '@/hooks/useCategorias';
import { useTimeLogs } from '@/hooks/useTimeLogs';
import { useUserRoles } from '@/hooks/useUserRoles';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';

interface TaskManagementSystemProps {
  projectId: string;
}

type TaskRow = Partial<Task> & { _isNew?: boolean; _tempId?: string };

export function TaskManagementSystem({ projectId }: TaskManagementSystemProps) {
  const { tasks, loading, createTask, updateTask, deleteTask } = useTasks(projectId);
  const { tap } = useTAP(projectId);
  const { statuses } = useStatus();
  const { modulos, createModulo } = useModulos();
  const { areas, createArea } = useAreas();
  const { categorias, createCategoria } = useCategorias();
  const { timeLogs, getTaskTotalTime } = useTimeLogs(projectId);
  const { isGestor } = useUserRoles();
  const { toast } = useToast();
  
  const [editableRows, setEditableRows] = useState<TaskRow[]>([]);
  const [hiddenColumns, setHiddenColumns] = useState<string[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

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

  // Inicializar rows com as tasks existentes
  useEffect(() => {
    setEditableRows(tasks.map(t => ({ ...t })));
  }, [tasks]);

  const allColumns = [
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
  ];

  const visibleColumns = allColumns.filter(col => !hiddenColumns.includes(col.key));

  const toggleColumn = (columnKey: string) => {
    setHiddenColumns(prev => 
      prev.includes(columnKey) 
        ? prev.filter(k => k !== columnKey)
        : [...prev, columnKey]
    );
  };

  const updateCell = (index: number, field: string, value: any) => {
    setEditableRows(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
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
      status: 'BACKLOG',
      percentual_conclusao: 0,
      nivel: 0,
      ordem: editableRows.length
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
      const row: any = {};
      allColumns.forEach(col => {
        row[col.label] = task[col.key as keyof Task] || '';
      });
      return row;
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Tarefas');
    XLSX.writeFile(wb, `tarefas-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  const renderEditableCell = (row: TaskRow, rowIndex: number, columnKey: string) => {
    const value = row[columnKey as keyof TaskRow];

    if (columnKey === 'task_id') {
      return <span className="text-xs text-muted-foreground">{row._isNew ? 'Novo' : String(value || '')}</span>;
    }

    if (columnKey === 'tempo_total') {
      if (!row.id) return <span className="text-xs text-muted-foreground">-</span>;
      const minutes = getTaskTotalTime(row.id);
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return <span className="text-xs">{hours}h {mins}m</span>;
    }

    if (columnKey === 'prioridade') {
      return (
        <Select 
          value={value as string || 'Média'} 
          onValueChange={(val) => updateCell(rowIndex, columnKey, val)}
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

    if (columnKey === 'status') {
      return (
        <Select 
          value={value as string || ''} 
          onValueChange={(val) => updateCell(rowIndex, columnKey, val)}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Selecione" />
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

    if (columnKey === 'percentual_conclusao') {
      return (
        <Input
          type="number"
          min="0"
          max="100"
          value={value as number || 0}
          onChange={(e) => updateCell(rowIndex, columnKey, parseInt(e.target.value) || 0)}
          className="h-8 text-xs"
        />
      );
    }

    if (columnKey === 'data_vencimento') {
      return (
        <Input
          type="date"
          value={value as string || ''}
          onChange={(e) => updateCell(rowIndex, columnKey, e.target.value)}
          className="h-8 text-xs"
        />
      );
    }

    if (columnKey === 'modulo') {
      return (
        <CreatableSelect
          value={value as string || ''}
          onValueChange={async (val) => {
            // Se o valor não existe na lista, criar novo
            if (!modulos.find(m => m.nome === val)) {
              await createModulo(val);
            }
            updateCell(rowIndex, columnKey, val);
          }}
          options={modulos.map(m => m.nome)}
          placeholder="Selecionar módulo..."
          className="h-8 text-xs"
        />
      );
    }

    if (columnKey === 'area') {
      return (
        <CreatableSelect
          value={value as string || ''}
          onValueChange={async (val) => {
            // Se o valor não existe na lista, criar novo
            if (!areas.find(a => a.nome === val)) {
              await createArea(val);
            }
            updateCell(rowIndex, columnKey, val);
          }}
          options={areas.map(a => a.nome)}
          placeholder="Selecionar área..."
          className="h-8 text-xs"
        />
      );
    }

    if (columnKey === 'categoria') {
      return (
        <CreatableSelect
          value={value as string || ''}
          onValueChange={async (val) => {
            // Se o valor não existe na lista, criar nova
            if (!categorias.find(c => c.nome === val)) {
              await createCategoria(val);
            }
            updateCell(rowIndex, columnKey, val);
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
        onChange={(e) => updateCell(rowIndex, columnKey, e.target.value)}
        className="h-8 text-xs"
        placeholder={columnKey === 'nome' ? 'Digite o nome da tarefa' : ''}
      />
    );
  };

  return (
    <div className="space-y-4">
      {/* Header com ações */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Gestão de Tarefas</CardTitle>
            <div className="flex gap-2">
              <Button onClick={addNewRow} variant="default">
                <Plus className="h-4 w-4 mr-2" />
                Nova Linha
              </Button>

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
                      <p className="text-muted-foreground">Nenhuma tarefa. Clique em "Nova Linha" para adicionar.</p>
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
                          {renderEditableCell(row, index, col.key)}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
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