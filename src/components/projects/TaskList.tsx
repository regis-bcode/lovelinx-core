import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MoreHorizontal, Plus, Calendar, X, Check } from "lucide-react";
import { Task } from "@/types/task";

interface TaskListProps {
  tasks: Task[];
  onTaskCreate: (task: Partial<Task>) => void;
  onTaskUpdate: (id: string, task: Partial<Task>) => void;
  onTaskDelete: (id: string) => void;
}

export function TaskList({ tasks, onTaskCreate, onTaskUpdate, onTaskDelete }: TaskListProps) {
  const [showNewTask, setShowNewTask] = useState(false);
  const [newTask, setNewTask] = useState<Partial<Task>>({
    nome: '',
    responsavel: '',
    data_vencimento: '',
    prioridade: 'Média',
    status: 'BACKLOG',
    custom_fields: {}
  });

  const handleCreateTask = () => {
    if (newTask.nome) {
      onTaskCreate(newTask);
      setNewTask({
        nome: '',
        responsavel: '',
        data_vencimento: '',
        prioridade: 'Média',
        status: 'BACKLOG',
        custom_fields: {}
      });
      setShowNewTask(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'AGUARDA MIT010':
        return 'bg-purple-500 hover:bg-purple-600 text-white';
      case 'BACKLOG':
        return 'bg-gray-500 hover:bg-gray-600 text-white';
      case 'EM_ANDAMENTO':
        return 'bg-blue-500 hover:bg-blue-600 text-white';
      case 'CONCLUIDO':
        return 'bg-green-500 hover:bg-green-600 text-white';
      default:
        return 'bg-gray-500 hover:bg-gray-600 text-white';
    }
  };

  const getPriorityColor = (prioridade: string) => {
    switch (prioridade) {
      case 'Crítica':
        return 'bg-red-500';
      case 'Alta':
        return 'bg-orange-500';
      case 'Média':
        return 'bg-yellow-500';
      case 'Baixa':
        return 'bg-green-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Tarefas</h3>
        <Button 
          onClick={() => setShowNewTask(true)}
          size="sm"
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Adicionar Tarefa
        </Button>
      </div>

      {/* Lista de tarefas em tabela */}
      {(tasks.length > 0 || showNewTask) && (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Responsável</TableHead>
                <TableHead>Data de vencimento</TableHead>
                <TableHead>Prioridade</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[100px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks.map((task) => (
                <TableRow key={task.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${getPriorityColor(task.prioridade)}`} />
                      <div>
                        <div className="font-medium">{task.nome}</div>
                        <div className="text-xs text-muted-foreground font-mono">
                          {task.task_id}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {task.responsavel ? (
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-xs">
                            {task.responsavel.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{task.responsavel}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {task.data_vencimento ? (
                      <div className="flex items-center gap-1 text-sm">
                        <Calendar className="h-3 w-3" />
                        {new Date(task.data_vencimento).toLocaleDateString('pt-BR')}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {task.prioridade}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={`text-xs ${getStatusColor(task.status)}`}>
                      {task.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                      <MoreHorizontal className="h-3 w-3" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              
              {/* Linha para adicionar nova tarefa */}
              {showNewTask && (
                <TableRow className="bg-muted/50">
                  <TableCell>
                    <Input
                      value={newTask.nome}
                      onChange={(e) => setNewTask(prev => ({ ...prev, nome: e.target.value }))}
                      placeholder="Nome da tarefa"
                      className="h-8"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={newTask.responsavel}
                      onChange={(e) => setNewTask(prev => ({ ...prev, responsavel: e.target.value }))}
                      placeholder="Responsável"
                      className="h-8"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="date"
                      value={newTask.data_vencimento}
                      onChange={(e) => setNewTask(prev => ({ ...prev, data_vencimento: e.target.value }))}
                      className="h-8"
                    />
                  </TableCell>
                  <TableCell>
                    <Select 
                      value={newTask.prioridade} 
                      onValueChange={(value) => setNewTask(prev => ({ ...prev, prioridade: value as any }))}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Baixa">Baixa</SelectItem>
                        <SelectItem value="Média">Média</SelectItem>
                        <SelectItem value="Alta">Alta</SelectItem>
                        <SelectItem value="Crítica">Crítica</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Select 
                      value={newTask.status} 
                      onValueChange={(value) => setNewTask(prev => ({ ...prev, status: value }))}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="BACKLOG">BACKLOG</SelectItem>
                        <SelectItem value="AGUARDA MIT010">AGUARDA MIT010</SelectItem>
                        <SelectItem value="EM_ANDAMENTO">EM ANDAMENTO</SelectItem>
                        <SelectItem value="CONCLUIDO">CONCLUÍDO</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-green-600 hover:text-green-700"
                        onClick={handleCreateTask}
                      >
                        <Check className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-gray-500 hover:text-gray-700"
                        onClick={() => setShowNewTask(false)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {tasks.length === 0 && !showNewTask && (
        <div className="text-center py-8 text-muted-foreground">
          <p>Nenhuma tarefa criada ainda.</p>
        </div>
      )}
    </div>
  );
}