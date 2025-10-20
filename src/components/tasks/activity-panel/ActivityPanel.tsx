import { useCallback, useEffect, useMemo, useState } from 'react';
import { addTaskComment, listTaskActivities } from './data';
import type { TaskActivity } from '@/types/task-activity';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface Props {
  taskId: string;
}

function kindLabel(kind: TaskActivity['kind']) {
  switch (kind) {
    case 'system.created':
      return 'Criação';
    case 'system.updated':
      return 'Atualização';
    case 'system.deleted':
      return 'Exclusão';
    case 'system.status_changed':
      return 'Status';
    case 'system.due_date_changed':
      return 'Data final';
    case 'system.priority_changed':
      return 'Prioridade';
    case 'system.assignee_changed':
      return 'Responsável';
    case 'system.time_log':
      return 'Tempo';
    case 'comment':
      return 'Comentário';
    default:
      return kind;
  }
}

function DiffView({ payload }: { payload: TaskActivity['payload'] }) {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const data = payload as Record<string, unknown> & {
    de?: unknown;
    para?: unknown;
    campos?: unknown;
  };

  if ('de' in data || 'para' in data) {
    return (
      <div className="mt-2 grid grid-cols-1 gap-3 md:grid-cols-2">
        <pre className="bg-muted rounded p-2 text-xs overflow-auto">
          {JSON.stringify(data.de ?? null, null, 2)}
        </pre>
        <pre className="bg-muted rounded p-2 text-xs overflow-auto">
          {JSON.stringify(data.para ?? null, null, 2)}
        </pre>
      </div>
    );
  }

  const changedFields = Array.isArray(data.campos) ? (data.campos as string[]) : [];

  if (changedFields.length > 0) {
    return (
      <div className="mt-2 text-xs text-muted-foreground">
        <div className="font-medium mb-1">Campos alterados:</div>
        <div className="flex flex-wrap gap-1">
          {changedFields.map((field) => (
            <Badge key={field} variant="secondary">
              {field}
            </Badge>
          ))}
        </div>
      </div>
    );
  }

  return null;
}

function TimeLogDetails({ payload }: { payload: TaskActivity['payload'] }) {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const data = payload as Record<string, unknown> & {
    tempo_formatado?: string | null;
    data_inicio?: string | null;
    data_fim?: string | null;
    observacoes?: string | null;
  };

  const rows: Array<{ label: string; value: string }> = [];

  if (typeof data.tempo_formatado === 'string' && data.tempo_formatado.trim().length > 0) {
    rows.push({ label: 'Duração', value: data.tempo_formatado });
  }

  const formatDateTime = (value: unknown) => {
    if (typeof value !== 'string') {
      return null;
    }
    const timestamp = Date.parse(value);
    if (!Number.isFinite(timestamp)) {
      return null;
    }
    return new Date(timestamp).toLocaleString();
  };

  const startedAt = formatDateTime(data.data_inicio);
  if (startedAt) {
    rows.push({ label: 'Iniciado em', value: startedAt });
  }

  const finishedAt = formatDateTime(data.data_fim);
  if (finishedAt) {
    rows.push({ label: 'Finalizado em', value: finishedAt });
  }

  if (typeof data.observacoes === 'string' && data.observacoes.trim().length > 0) {
    rows.push({ label: 'Atividade', value: data.observacoes.trim() });
  }

  if (rows.length === 0) {
    return null;
  }

  return (
    <dl className="mt-2 space-y-1 text-xs text-muted-foreground">
      {rows.map(entry => (
        <div key={`${entry.label}-${entry.value}`} className="flex flex-col gap-0.5">
          <dt className="font-medium text-foreground">{entry.label}</dt>
          <dd>{entry.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function getActorInitial(actorId: string | null) {
  if (!actorId) {
    return 'S';
  }

  return actorId.charAt(0).toUpperCase();
}

export default function ActivityPanel({ taskId }: Props) {
  const [items, setItems] = useState<TaskActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState('');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const canSend = useMemo(() => comment.trim().length > 0, [comment]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await listTaskActivities(taskId);
      setItems(data);
    } catch (err) {
      console.error(err);
      setLoadError('Não foi possível carregar as atividades.');
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function handleSend() {
    if (!canSend) {
      return;
    }

    setSubmitError(null);
    try {
      await addTaskComment(taskId, comment.trim());
      setComment('');
      await refresh();
    } catch (err) {
      console.error(err);
      setSubmitError('Não foi possível enviar o comentário.');
    }
  }

  return (
    <Card className="w-full">
      <CardHeader className="flex items-center justify-between">
        <CardTitle>Atividade</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Textarea
            placeholder="Escreva um comentário..."
            value={comment}
            onChange={(event) => setComment(event.target.value)}
          />
          <div className="flex items-center justify-end gap-2">
            <Button onClick={handleSend} disabled={!canSend}>
              Comentar
            </Button>
          </div>
          {submitError && <div className="text-xs text-destructive">{submitError}</div>}
        </div>

        {loading ? (
          <div className="text-sm text-muted-foreground">Carregando atividades…</div>
        ) : loadError ? (
          <div className="text-sm text-destructive">{loadError}</div>
        ) : items.length === 0 ? (
          <div className="text-sm text-muted-foreground">Sem atividades ainda.</div>
        ) : (
          <ul className="space-y-3">
            {items.map((item) => (
              <li key={item.id} className="flex gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>{getActorInitial(item.actor_id)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
                    <Badge variant={item.kind === 'comment' ? 'secondary' : 'default'}>
                      {kindLabel(item.kind)}
                    </Badge>
                    <div className="text-sm font-medium truncate">{item.title}</div>
                    <div className="text-xs text-muted-foreground sm:ml-auto">
                      {new Date(item.created_at).toLocaleString()}
                    </div>
                  </div>
                  {item.kind === 'comment' ? (
                    <div className="mt-1 text-sm whitespace-pre-wrap">{item.comment_body}</div>
                  ) : (
                    <>
                      {item.message && <div className="mt-1 text-sm">{item.message}</div>}
                      {item.kind === 'system.time_log' ? (
                        <TimeLogDetails payload={item.payload} />
                      ) : (
                        <DiffView payload={item.payload} />
                      )}
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
