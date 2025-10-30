import { useEffect, useMemo, useState } from 'react';
import { format, addDays } from 'date-fns';
import type { DateRange } from 'react-day-picker';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { DatePicker } from '@/components/ui/date-picker';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import type { Analyst, SuggestionRow } from '@/types/capacity';

interface CapacityEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  analysts: Analyst[];
  onSaved: () => void;
  defaultUserId?: string;
  defaultDate?: string;
}

export function CapacityEditorDialog({
  open,
  onOpenChange,
  analysts,
  onSaved,
  defaultDate,
  defaultUserId,
}: CapacityEditorDialogProps) {
  const { toast } = useToast();
  const [userId, setUserId] = useState(defaultUserId ?? '');
  const [date, setDate] = useState(defaultDate ?? '');
  const [minutes, setMinutes] = useState('480');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setUserId(defaultUserId ?? '');
      setDate(defaultDate ?? '');
      setMinutes('480');
      setNotes('');
    }
  }, [open, defaultDate, defaultUserId]);

  const handleSave = async () => {
    if (!userId || !date) {
      toast({ title: 'Preencha usuário e data', variant: 'destructive' });
      return;
    }

    setLoading(true);
    const { error } = await supabase
      .from('capacities')
      .upsert({
        user_id: userId,
        date,
        daily_capacity_minutes: Number(minutes) || 0,
        source: 'exception',
        notes: notes || null,
      });

    setLoading(false);

    if (error) {
      toast({ title: 'Erro ao salvar capacidade', description: error.message, variant: 'destructive' });
      return;
    }

    toast({ title: 'Capacidade salva com sucesso' });
    onSaved();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Capacidade diária</DialogTitle>
          <DialogDescription>Defina exceções de capacidade para analistas específicos.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Analista</Label>
            <Select value={userId} onValueChange={setUserId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o analista" />
              </SelectTrigger>
              <SelectContent>
                {analysts.map(analyst => (
                  <SelectItem key={analyst.id} value={analyst.id}>
                    {analyst.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Data</Label>
            <DatePicker value={date} onChange={setDate} />
          </div>
          <div className="space-y-2">
            <Label>Capacidade (minutos)</Label>
            <Input value={minutes} onChange={event => setMinutes(event.target.value)} type="number" min={0} step={30} />
          </div>
          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea value={notes} onChange={event => setNotes(event.target.value)} rows={3} placeholder="Opcional" />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleSave} disabled={loading}>
            {loading ? 'Salvando…' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface AllocationEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  analysts: Analyst[];
  onSaved: () => void;
  allocationId?: string;
}

type TaskOption = {
  id: string;
  name: string;
};

export function AllocationEditorDialog({ open, onOpenChange, analysts, onSaved, allocationId }: AllocationEditorDialogProps) {
  const { toast } = useToast();
  const [tasks, setTasks] = useState<TaskOption[]>([]);
  const [taskId, setTaskId] = useState('');
  const [userId, setUserId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [plannedMinutes, setPlannedMinutes] = useState('480');
  const [percentAllocation, setPercentAllocation] = useState('100');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }
    let active = true;
    supabase
      .from('tasks')
      .select('id, tarefa, nome')
      .limit(100)
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          console.error(error);
          toast({ title: 'Não foi possível carregar tarefas', description: error.message, variant: 'destructive' });
          return;
        }
        const mapped = (data ?? []).map(task => ({
          id: (task as { id: string }).id,
          name: ((task as { tarefa?: string | null }).tarefa ?? (task as { nome?: string | null }).nome ?? 'Sem título') as string,
        }));
        setTasks(mapped);
      });

    return () => {
      active = false;
    };
  }, [open, toast]);

  useEffect(() => {
    if (open) {
      setTaskId('');
      setUserId('');
      setStartDate('');
      setEndDate('');
      setPlannedMinutes('480');
      setPercentAllocation('100');
      setNotes('');
    }
  }, [open, allocationId]);

  const handleSave = async () => {
    if (!taskId || !userId || !startDate || !endDate) {
      toast({ title: 'Preencha todos os campos obrigatórios', variant: 'destructive' });
      return;
    }

    setLoading(true);
    const payload = {
      task_id: taskId,
      user_id: userId,
      start_date: startDate,
      end_date: endDate,
      planned_minutes: Number(plannedMinutes) || 0,
      percent_allocation: Number(percentAllocation) || 0,
      notes: notes || null,
    };

    const response = allocationId
      ? await supabase.from('allocations').update(payload).eq('id', allocationId)
      : await supabase.from('allocations').insert(payload);

    setLoading(false);

    if (response.error) {
      toast({ title: 'Erro ao salvar alocação', description: response.error.message, variant: 'destructive' });
      return;
    }

    toast({ title: 'Alocação registrada com sucesso' });
    onSaved();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Alocação planejada</DialogTitle>
          <DialogDescription>Defina ou ajuste a alocação planejada para uma tarefa.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Tarefa</Label>
            <Select value={taskId} onValueChange={setTaskId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a tarefa" />
              </SelectTrigger>
              <SelectContent>
                {tasks.map(task => (
                  <SelectItem key={task.id} value={task.id}>
                    {task.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Analista</Label>
            <Select value={userId} onValueChange={setUserId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o analista" />
              </SelectTrigger>
              <SelectContent>
                {analysts.map(analyst => (
                  <SelectItem key={analyst.id} value={analyst.id}>
                    {analyst.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Início</Label>
              <DatePicker value={startDate} onChange={setStartDate} />
            </div>
            <div className="space-y-2">
              <Label>Fim</Label>
              <DatePicker value={endDate} onChange={setEndDate} />
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Minutos planejados</Label>
              <Input
                value={plannedMinutes}
                onChange={event => setPlannedMinutes(event.target.value)}
                type="number"
                min={0}
                step={30}
              />
            </div>
            <div className="space-y-2">
              <Label>% da capacidade</Label>
              <Input
                value={percentAllocation}
                onChange={event => setPercentAllocation(event.target.value)}
                type="number"
                min={0}
                max={100}
                step={5}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea value={notes} onChange={event => setNotes(event.target.value)} rows={3} placeholder="Opcional" />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleSave} disabled={loading}>
            {loading ? 'Salvando…' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface SuggestionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  analyst: Analyst | null;
}

export function SuggestionDialog({ open, onOpenChange, analyst }: SuggestionDialogProps) {
  const { toast } = useToast();
  const [range, setRange] = useState<DateRange | undefined>({
    from: new Date(),
    to: addDays(new Date(), 14),
  });
  const [minutesNeeded, setMinutesNeeded] = useState('240');
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<SuggestionRow[]>([]);

  useEffect(() => {
    if (open) {
      setRange({ from: new Date(), to: addDays(new Date(), 14) });
      setMinutesNeeded('240');
      setSuggestions([]);
    }
  }, [open]);

  const formattedRange = useMemo(() => {
    const from = range?.from ?? new Date();
    const to = range?.to ?? range?.from ?? new Date();
    return {
      from: format(from, 'yyyy-MM-dd'),
      to: format(to, 'yyyy-MM-dd'),
    };
  }, [range]);

  const handleSuggest = async () => {
    if (!analyst) {
      toast({ title: 'Selecione um analista', variant: 'destructive' });
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.rpc('suggest_allocation', {
      _user_id: analyst.id,
      _from: formattedRange.from,
      _to: formattedRange.to,
      minutes_needed: Number(minutesNeeded) || 0,
    });
    setLoading(false);

    if (error) {
      toast({ title: 'Erro ao buscar sugestões', description: error.message, variant: 'destructive' });
      return;
    }

    setSuggestions(data ?? []);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Sugestões de alocação</DialogTitle>
          <DialogDescription>
            Consulte períodos com horas livres para {analyst?.name ?? 'o analista selecionado'}.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Período</Label>
            <DateRangePicker value={range} onChange={setRange} />
          </div>
          <div className="space-y-2">
            <Label>Minutos necessários</Label>
            <Input
              value={minutesNeeded}
              onChange={event => setMinutesNeeded(event.target.value)}
              type="number"
              min={0}
              step={30}
            />
          </div>
          <div>
            <Button type="button" onClick={handleSuggest} disabled={loading || !analyst}>
              {loading ? 'Buscando…' : 'Gerar sugestões'}
            </Button>
          </div>
          <div className="space-y-2">
            {suggestions.length === 0 ? (
              <div className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
                Nenhuma sugestão carregada.
              </div>
            ) : (
              suggestions.map(item => (
                <div key={item.date} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
                  <span>{item.date}</span>
                  <span>{item.free_minutes} minutos livres</span>
                </div>
              ))
            )}
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
