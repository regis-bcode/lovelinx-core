import { useEffect, useMemo, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { computeDiff, type DiffChange } from "./diff";
import { fetchAuditLogs, type AuditLogRow, type AuditOp } from "./data";

type FiltersState = {
  taskId: string;
  op?: AuditOp;
  from?: string;
  to?: string;
  limit: number;
};

const DEFAULT_LIMIT = 200;

const operationColors: Record<AuditLogRow["audit_operation"], string> = {
  INSERT: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
  UPDATE: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
  DELETE: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200",
};

function toDateTimeLocal(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const iso = new Date(date.getTime() - date.getTimezoneOffset() * 60 * 1000)
    .toISOString()
    .slice(0, 16);
  return iso;
}

function formatDisplayValue(value: unknown): string {
  if (value === undefined) return "—";
  if (value === null) return "null";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return JSON.stringify(value);
}

export default function AuditLogsPage() {
  const [filters, setFilters] = useState<FiltersState>({
    taskId: "",
    limit: DEFAULT_LIMIT,
  });
  const [logs, setLogs] = useState<AuditLogRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedLog, setSelectedLog] = useState<AuditLogRow | null>(null);
  const [diff, setDiff] = useState<DiffChange[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const requestParams = useMemo(
    () => ({
      taskId: filters.taskId.trim() || undefined,
      op: filters.op,
      from: filters.from,
      to: filters.to,
      limit: filters.limit,
    }),
    [filters]
  );

  useEffect(() => {
    let isMounted = true;

    async function loadLogs() {
      setIsLoading(true);
      setError(null);
      try {
        const data = await fetchAuditLogs(requestParams);
        if (isMounted) {
          setLogs(data);
        }
      } catch (err) {
        if (!isMounted) return;
        console.error("Failed to fetch audit logs", err);
        setError(err instanceof Error ? err.message : "Erro ao carregar logs de auditoria.");
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadLogs();

    return () => {
      isMounted = false;
    };
  }, [requestParams]);

  const handleRefresh = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchAuditLogs(requestParams);
      setLogs(data);
    } catch (err) {
      console.error("Failed to refresh audit logs", err);
      setError(err instanceof Error ? err.message : "Erro ao carregar logs de auditoria.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenDetails = (row: AuditLogRow) => {
    setSelectedLog(row);
    setDiff(computeDiff(row.de, row.para));
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setSelectedLog(null);
    setDiff([]);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Auditoria de Tasks</h1>
            <p className="text-sm text-muted-foreground">
              Consulte alterações registradas para tarefas com comparação entre versões.
            </p>
          </div>
          <Button variant="outline" onClick={handleRefresh} disabled={isLoading} className="gap-2">
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Atualizar
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
          <div className="space-y-1">
            <Label htmlFor="taskId">ID da Task</Label>
            <Input
              id="taskId"
              placeholder="UUID da task"
              value={filters.taskId}
              onChange={(event) =>
                setFilters((prev) => ({
                  ...prev,
                  taskId: event.target.value,
                }))
              }
            />
          </div>

          <div className="space-y-1">
            <Label>Operação</Label>
            <Select
              value={filters.op ?? ""}
              onValueChange={(value) =>
                setFilters((prev) => ({
                  ...prev,
                  op: value === "" ? undefined : (value as AuditOp),
                }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todas</SelectItem>
                <SelectItem value="INSERT">INSERT</SelectItem>
                <SelectItem value="UPDATE">UPDATE</SelectItem>
                <SelectItem value="DELETE">DELETE</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="from">A partir de</Label>
            <Input
              id="from"
              type="datetime-local"
              value={toDateTimeLocal(filters.from)}
              onChange={(event) => {
                const value = event.target.value;
                setFilters((prev) => ({
                  ...prev,
                  from: value ? new Date(value).toISOString() : undefined,
                }));
              }}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="to">Até</Label>
            <Input
              id="to"
              type="datetime-local"
              value={toDateTimeLocal(filters.to)}
              onChange={(event) => {
                const value = event.target.value;
                setFilters((prev) => ({
                  ...prev,
                  to: value ? new Date(value).toISOString() : undefined,
                }));
              }}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="limit">Limite</Label>
            <Input
              id="limit"
              type="number"
              min={1}
              max={1000}
              value={filters.limit}
              onChange={(event) => {
                const limit = Number(event.target.value);
                setFilters((prev) => ({
                  ...prev,
                  limit: Number.isFinite(limit) && limit > 0 ? limit : DEFAULT_LIMIT,
                }));
              }}
            />
          </div>
        </div>

        {error ? (
          <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        <div className="overflow-hidden rounded-lg border bg-background/40">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[180px]">Data/Hora</TableHead>
                <TableHead>Operação</TableHead>
                <TableHead>Task</TableHead>
                <TableHead>Usuário</TableHead>
                <TableHead className="w-[120px] text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Carregando registros...
                    </div>
                  </TableCell>
                </TableRow>
              ) : null}

              {!isLoading && logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                    Sem registros encontrados.
                  </TableCell>
                </TableRow>
              ) : null}

              {logs.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">
                    {new Date(row.audit_timestamp).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Badge className={operationColors[row.audit_operation]}>
                      {row.audit_operation}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{row.task_id}</TableCell>
                  <TableCell className="font-mono text-xs">
                    {row.audit_user ?? "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="secondary" size="sm" onClick={() => handleOpenDetails(row)}>
                      Ver detalhes
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <Dialog
          open={isDialogOpen}
          onOpenChange={(open) => {
            if (!open) {
              handleCloseDialog();
            }
          }}
        >
          <DialogContent className="max-w-5xl">
            <DialogHeader>
              <DialogTitle>Detalhes da alteração</DialogTitle>
            </DialogHeader>

            {selectedLog ? (
              <div className="space-y-6">
                <div className="grid gap-4 text-sm md:grid-cols-2">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Antes</p>
                    <ScrollArea className="mt-2 max-h-72 rounded-md border bg-muted/30 p-3 text-xs">
                      <pre className="whitespace-pre-wrap break-all">
                        {JSON.stringify(selectedLog.de, null, 2)}
                      </pre>
                    </ScrollArea>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Depois</p>
                    <ScrollArea className="mt-2 max-h-72 rounded-md border bg-muted/30 p-3 text-xs">
                      <pre className="whitespace-pre-wrap break-all">
                        {JSON.stringify(selectedLog.para, null, 2)}
                      </pre>
                    </ScrollArea>
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="text-sm font-semibold">Diferenças</h3>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Campo</TableHead>
                          <TableHead>Antes</TableHead>
                          <TableHead>Depois</TableHead>
                          <TableHead>Tipo</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {diff.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={4} className="py-6 text-center text-sm text-muted-foreground">
                              Sem diferenças
                            </TableCell>
                          </TableRow>
                        ) : (
                          diff.map((change, index) => (
                            <TableRow key={`${change.path}-${index}`}>
                              <TableCell className="font-mono text-xs">{change.path}</TableCell>
                              <TableCell className="text-xs">{formatDisplayValue(change.before)}</TableCell>
                              <TableCell className="text-xs">{formatDisplayValue(change.after)}</TableCell>
                              <TableCell>
                                <Badge
                                  variant="outline"
                                  className={
                                    change.type === "added"
                                      ? "border-emerald-300 text-emerald-700 dark:border-emerald-700 dark:text-emerald-200"
                                      : change.type === "removed"
                                      ? "border-rose-300 text-rose-700 dark:border-rose-700 dark:text-rose-200"
                                      : "border-amber-300 text-amber-700 dark:border-amber-700 dark:text-amber-200"
                                  }
                                >
                                  {change.type}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button variant="outline" onClick={handleCloseDialog}>
                    Fechar
                  </Button>
                </div>
              </div>
            ) : null}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
