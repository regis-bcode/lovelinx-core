import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MoreHorizontal, Plus, Calendar } from "lucide-react";
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
    task_id: '',
    nome: '',
    responsavel: '',
    data_vencimento: '',
    prioridade: 'Média',
    status: 'BACKLOG',
    custom_fields: {}
  });

  const handleCreateTask = () => {
    if (newTask.nome && newTask.task_id) {
      onTaskCreate(newTask);
      setNewTask({
        task_id: '',
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
        return 'bg-purple-500 hover:bg-purple-600';
      case 'BACKLOG':
        return 'bg-gray-500 hover:bg-gray-600';
      case 'EM_ANDAMENTO':
        return 'bg-blue-500 hover:bg-blue-600';
      case 'CONCLUIDO':
        return 'bg-green-500 hover:bg-green-600';
      default:
        return 'bg-gray-500 hover:bg-gray-600';
    }
  };

  const getPriorityColor = (prioridade: string) => {
    switch (prioridade) {
      case 'Crítica':
        return 'text-red-500';
      case 'Alta':
        return 'text-orange-500';
      case 'Média':
        return 'text-yellow-500';
      case 'Baixa':
        return 'text-green-500';
      default:
        return 'text-gray-500';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Tarefas do Projeto</h3>
        <Button 
          onClick={() => setShowNewTask(true)}
          size="sm"
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Adicionar Tarefa
        </Button>
      </div>

      {showNewTask && (
        <Card>
          <CardHeader>
            <CardTitle>Nova Tarefa</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="task_id">ID da Tarefa *</Label>
                <Input
                  id="task_id"
                  value={newTask.task_id}
                  onChange={(e) => setNewTask(prev => ({ ...prev, task_id: e.target.value }))}
                  placeholder="Ex: TASK-001"
                />
              </div>
              <div>
                <Label htmlFor="nome">Nome da Tarefa *</Label>
                <Input
                  id="nome"
                  value={newTask.nome}
                  onChange={(e) => setNewTask(prev => ({ ...prev, nome: e.target.value }))}
                  placeholder="Descreva a tarefa"
                />
              </div>
              <div>
                <Label htmlFor="responsavel">Responsável</Label>
                <Input
                  id="responsavel"
                  value={newTask.responsavel}
                  onChange={(e) => setNewTask(prev => ({ ...prev, responsavel: e.target.value }))}
                  placeholder="Nome do responsável"
                />
              </div>
              <div>
                <Label htmlFor="data_vencimento">Data de Vencimento</Label>
                <Input
                  id="data_vencimento"
                  type="date"
                  value={newTask.data_vencimento}
                  onChange={(e) => setNewTask(prev => ({ ...prev, data_vencimento: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="prioridade">Prioridade</Label>
                <Select 
                  value={newTask.prioridade} 
                  onValueChange={(value) => setNewTask(prev => ({ ...prev, prioridade: value as any }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Baixa">Baixa</SelectItem>
                    <SelectItem value="Média">Média</SelectItem>
                    <SelectItem value="Alta">Alta</SelectItem>
                    <SelectItem value="Crítica">Crítica</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="status">Status</Label>
                <Select 
                  value={newTask.status} 
                  onValueChange={(value) => setNewTask(prev => ({ ...prev, status: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BACKLOG">BACKLOG</SelectItem>
                    <SelectItem value="AGUARDA MIT010">AGUARDA MIT010</SelectItem>
                    <SelectItem value="EM_ANDAMENTO">EM ANDAMENTO</SelectItem>
                    <SelectItem value="CONCLUIDO">CONCLUÍDO</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleCreateTask}>Criar Tarefa</Button>
              <Button variant="outline" onClick={() => setShowNewTask(false)}>Cancelar</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {tasks.map((task) => (
          <Card key={task.id} className="bg-card hover:bg-accent/5 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-1 rounded">
                      {task.task_id}
                    </span>
                    <div className={`w-2 h-2 rounded-full ${getPriorityColor(task.prioridade).replace('text-', 'bg-')}`} />
                  </div>
                  
                  <div className="flex-1">
                    <h4 className="font-medium text-sm">{task.nome}</h4>
                  </div>
                  
                  {task.responsavel && (
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="text-xs">
                        {task.responsavel.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  
                  {task.data_vencimento && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      <span>
                        {new Date(task.data_vencimento).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit'
                        })}
                      </span>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground">
                      {task.prioridade}
                    </span>
                  </div>
                  
                  <Badge className={`text-white text-xs ${getStatusColor(task.status)}`}>
                    {task.status}
                  </Badge>
                  
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                    <MoreHorizontal className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        
        {tasks.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <p>Nenhuma tarefa criada ainda.</p>
          </div>
        )}
      </div>
    </div>
  );
}