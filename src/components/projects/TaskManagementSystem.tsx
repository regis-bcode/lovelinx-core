import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, Plus, Settings, Download, Eye, EyeOff, ChevronRight, ChevronDown } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Task, TaskFormData } from '@/types/task';
import { CustomField } from '@/types/task';
import { Team } from '@/types/team';
import { useTasks } from '@/hooks/useTasks';
import { useTeams } from '@/hooks/useTeams';
import * as XLSX from 'xlsx';

interface TaskManagementSystemProps {
  projectId: string;
}

export function TaskManagementSystem({ projectId }: TaskManagementSystemProps) {
  const { tasks, customFields, loading, createTask, updateTask, deleteTask, createCustomField, deleteCustomField } = useTasks(projectId);
  const { teams } = useTeams(projectId);
  
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [showFieldDialog, setShowFieldDialog] = useState(false);
  const [hiddenColumns, setHiddenColumns] = useState<string[]>([]);
  const [expandedTasks, setExpandedTasks] = useState<string[]>([]);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  
  const [taskForm, setTaskForm] = useState<Partial<TaskFormData>>({
    nome: '',
    prioridade: 'Média',
    status: 'BACKLOG',
    project_id: projectId,
    nivel: 0,
    ordem: 0,
    percentual_conclusao: 0
  });

  const [fieldForm, setFieldForm] = useState({
    field_name: '',
    field_type: 'text' as const,
    field_options: [] as string[],
    is_required: false,
    project_id: projectId
  });

  const allColumns = [
    { key: 'task_id', label: 'ID' },
    { key: 'nome', label: 'Nome' },
    { key: 'cliente', label: 'Cliente' },
    { key: 'modulo', label: 'Módulo' },
    { key: 'area', label: 'Área' },
    { key: 'categoria', label: 'Categoria' },
    { key: 'etapa_projeto', label: 'Etapa do Projeto' },
    { key: 'descricao_detalhada', label: 'Descrição Detalhada' },
    { key: 'retorno_acao', label: 'Retorno Ação' },
    { key: 'acao_realizada', label: 'Ação Realizada' },
    { key: 'gp_consultoria', label: 'GP Consultoria' },
    { key: 'responsavel_consultoria', label: 'Responsável Consultoria' },
    { key: 'responsavel_cliente', label: 'Responsável Cliente' },
    { key: 'escopo', label: 'Escopo' },
    { key: 'prioridade', label: 'Prioridade' },
    { key: 'status', label: 'Status' },
    { key: 'criticidade', label: 'Criticidade' },
    { key: 'numero_ticket', label: 'Número do Ticket' },
    { key: 'descricao_ticket', label: 'Descrição Ticket' },
    { key: 'data_identificacao_ticket', label: 'Data de Identificação Ticket' },
    { key: 'responsavel_ticket', label: 'Responsável Ticket' },
    { key: 'status_ticket', label: 'Status do Ticket' },
    { key: 'link', label: 'Link' },
    { key: 'validado_por', label: 'Validado por' },
    { key: 'data_prevista_entrega', label: 'Data Prevista Entrega' },
    { key: 'data_entrega', label: 'Data Entrega' },
    { key: 'data_prevista_validacao', label: 'Data Prevista Validação' },
    { key: 'dias_para_concluir', label: 'Dias para Concluir' },
    { key: 'percentual_conclusao', label: '% Conclusão' },
    { key: 'link_drive', label: 'Link Drive' }
  ];

  const visibleColumns = allColumns.filter(col => !hiddenColumns.includes(col.key));

  const toggleColumn = (columnKey: string) => {
    setHiddenColumns(prev => 
      prev.includes(columnKey) 
        ? prev.filter(k => k !== columnKey)
        : [...prev, columnKey]
    );
  };

  const exportToExcel = () => {
    const exportData = tasks.map(task => {
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

  const buildTaskTree = (tasks: Task[]): Task[] => {
    const taskMap = new Map<string, Task & { children: Task[] }>();
    const rootTasks: (Task & { children: Task[] })[] = [];

    // Inicializar mapa com todas as tarefas
    tasks.forEach(task => {
      taskMap.set(task.id, { ...task, children: [] });
    });

    // Construir árvore
    tasks.forEach(task => {
      const taskWithChildren = taskMap.get(task.id)!;
      if (task.parent_task_id && taskMap.has(task.parent_task_id)) {
        taskMap.get(task.parent_task_id)!.children.push(taskWithChildren);
      } else {
        rootTasks.push(taskWithChildren);
      }
    });

    return rootTasks.sort((a, b) => a.ordem - b.ordem);
  };

  const renderTaskRow = (task: Task & { children?: Task[] }, level = 0) => {
    const hasChildren = task.children && task.children.length > 0;
    const isExpanded = expandedTasks.includes(task.id);

    return (
      <React.Fragment key={task.id}>
        <TableRow>
          <TableCell>
            <div className="flex items-center" style={{ paddingLeft: `${level * 20}px` }}>
              {hasChildren && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setExpandedTasks(prev => 
                      prev.includes(task.id)
                        ? prev.filter(id => id !== task.id)
                        : [...prev, task.id]
                    );
                  }}
                  className="p-0 h-6 w-6 mr-2"
                >
                  {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>
              )}
              <span className="font-mono text-sm">{task.task_id}</span>
            </div>
          </TableCell>
          {visibleColumns.slice(1).map(col => (
            <TableCell key={col.key}>
              {col.key === 'prioridade' && (
                <Badge variant={
                  task.prioridade === 'Crítica' ? 'destructive' :
                  task.prioridade === 'Alta' ? 'default' :
                  task.prioridade === 'Média' ? 'secondary' : 'outline'
                }>
                  {task.prioridade}
                </Badge>
              )}
              {col.key === 'status' && (
                <Badge variant="outline">{task.status}</Badge>
              )}
              {col.key === 'percentual_conclusao' && (
                <div className="flex items-center gap-2">
                  <div className="w-16 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full" 
                      style={{ width: `${task.percentual_conclusao || 0}%` }}
                    />
                  </div>
                  <span className="text-sm">{task.percentual_conclusao || 0}%</span>
                </div>
              )}
              {!['prioridade', 'status', 'percentual_conclusao'].includes(col.key) && (
                <span>{String(task[col.key as keyof Task] || '-')}</span>
              )}
            </TableCell>
          ))}
          <TableCell>
            <Button variant="outline" size="sm" onClick={() => {/* implementar edição */}}>
              Editar
            </Button>
          </TableCell>
        </TableRow>
        {hasChildren && isExpanded && task.children!.map(child => 
          renderTaskRow(child, level + 1)
        )}
      </React.Fragment>
    );
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    await createTask(taskForm);
    setShowTaskDialog(false);
    setTaskForm({
      nome: '',
      prioridade: 'Média',
      status: 'BACKLOG',
      project_id: projectId,
      nivel: 0,
      ordem: 0,
      percentual_conclusao: 0
    });
  };

  const handleCreateField = async (e: React.FormEvent) => {
    e.preventDefault();
    await createCustomField(fieldForm);
    setShowFieldDialog(false);
    setFieldForm({
      field_name: '',
      field_type: 'text',
      field_options: [],
      is_required: false,
      project_id: projectId
    });
  };

  const taskTree = buildTaskTree(tasks);

  return (
    <div className="space-y-6">
      {/* Header com ações */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Gestão de Tarefas</CardTitle>
            <div className="flex gap-2">
              <Dialog open={showTaskDialog} onOpenChange={setShowTaskDialog}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Nova Tarefa
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Nova Tarefa</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleCreateTask} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Nome da Tarefa *</Label>
                        <Input
                          value={taskForm.nome || ''}
                          onChange={(e) => setTaskForm(prev => ({...prev, nome: e.target.value}))}
                          required
                        />
                      </div>
                      <div>
                        <Label>Cliente</Label>
                        <Input
                          value={taskForm.cliente || ''}
                          onChange={(e) => setTaskForm(prev => ({...prev, cliente: e.target.value}))}
                        />
                      </div>
                    </div>
                    {/* ... continuar com outros campos ... */}
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => setShowTaskDialog(false)}>
                        Cancelar
                      </Button>
                      <Button type="submit">Criar Tarefa</Button>
                    </div>
                  </form>
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
                    <h4 className="font-medium">Mostrar/Ocultar Colunas</h4>
                    {allColumns.map(col => (
                      <div key={col.key} className="flex items-center space-x-2">
                        <Checkbox
                          checked={!hiddenColumns.includes(col.key)}
                          onCheckedChange={() => toggleColumn(col.key)}
                        />
                        <label className="text-sm">{col.label}</label>
                      </div>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>

              <Dialog open={showFieldDialog} onOpenChange={setShowFieldDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    Campo Personalizado
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Novo Campo Personalizado</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleCreateField} className="space-y-4">
                    <div>
                      <Label>Nome do Campo</Label>
                      <Input
                        value={fieldForm.field_name}
                        onChange={(e) => setFieldForm(prev => ({...prev, field_name: e.target.value}))}
                        required
                      />
                    </div>
                    <div>
                      <Label>Tipo do Campo</Label>
                      <Select
                        value={fieldForm.field_type}
                        onValueChange={(value: any) => setFieldForm(prev => ({...prev, field_type: value}))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="text">Texto</SelectItem>
                          <SelectItem value="numeric">Numérico</SelectItem>
                          <SelectItem value="dropdown">Lista</SelectItem>
                          <SelectItem value="checkbox">Checkbox</SelectItem>
                          <SelectItem value="date">Data</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={fieldForm.is_required}
                        onCheckedChange={(checked) => setFieldForm(prev => ({...prev, is_required: !!checked}))}
                      />
                      <Label>Campo obrigatório</Label>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => setShowFieldDialog(false)}>
                        Cancelar
                      </Button>
                      <Button type="submit">Criar Campo</Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>

              <Button variant="outline" onClick={exportToExcel}>
                <Download className="h-4 w-4 mr-2" />
                Exportar Excel
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Tabela de tarefas */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {visibleColumns.map(col => (
                    <TableHead key={col.key}>{col.label}</TableHead>
                  ))}
                  <TableHead className="w-[100px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={visibleColumns.length + 1} className="text-center py-8">
                      Carregando tarefas...
                    </TableCell>
                  </TableRow>
                ) : taskTree.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={visibleColumns.length + 1} className="text-center py-8">
                      Nenhuma tarefa cadastrada
                    </TableCell>
                  </TableRow>
                ) : (
                  taskTree.map(task => renderTaskRow(task))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}