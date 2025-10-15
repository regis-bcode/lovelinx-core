import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { useUsers } from "@/hooks/useUsers";
import { useTeamMembers } from "@/hooks/useTeamMembers";
import { useToast } from "@/hooks/use-toast";
import { MemberRoleType } from "@/types/project-team";
import { Plus, ArrowLeft, Trash2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { MultiSelect } from "@/components/ui/multi-select";

export default function TeamAddMembers() {
  const navigate = useNavigate();
  const { teamId } = useParams();
  const { toast } = useToast();

  // Redirect if no teamId
  useEffect(() => {
    if (!teamId) {
      navigate("/team", { replace: true });
    }
  }, [teamId, navigate]);

  // SEO basics
  useEffect(() => {
    document.title = "Adicionar Membros à Equipe";
    const desc = "Adicionar membros à equipe com busca e multi-seleção";
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "description");
      document.head.appendChild(meta);
    }
    meta.setAttribute("content", desc);
  }, []);

  const { users } = useUsers();
  const { members, addMember } = useTeamMembers(teamId || "");

  const MULTI_SELECT_PER_ROW = false as const;

  interface MemberRow {
    id: string;
    user_id: string;
    user_ids?: string[];
    role_type: MemberRoleType | "";
    custo_hora_override: string;
  }

  const [rows, setRows] = useState<MemberRow[]>([
    { id: crypto.randomUUID(), user_id: "", user_ids: [], role_type: "", custo_hora_override: "" }
  ]);

  // Available users (not already in team)
  const availableUsers = useMemo(() => {
    return users.filter((u) => !members.find((m) => m.user_id === u.user_id));
  }, [users, members]);

  const addRow = () => {
    setRows((prev) => [...prev, { id: crypto.randomUUID(), user_id: "", user_ids: [], role_type: "", custo_hora_override: "" }]);
  };

  const removeRow = (id: string) => {
    setRows((prev) => (prev.length > 1 ? prev.filter((r) => r.id !== id) : prev));
  };

  const updateRow = <K extends keyof MemberRow>(id: string, field: K, value: MemberRow[K]) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  };


  const handleCancel = () => {
    navigate(`/team?teamId=${teamId}`);
  };

  const handleAdd = async () => {
    if (!teamId) return;

    const validRows = rows.filter((r) => {
      const hasUser = MULTI_SELECT_PER_ROW ? ((r.user_ids?.length ?? 0) > 0) : !!r.user_id;
      return hasUser && !!r.role_type;
    });

    if (validRows.length === 0) {
      toast({ title: "Erro", description: "Preencha pelo menos uma linha completa", variant: "destructive" });
      return;
    }

    try {
      const payloads = validRows.flatMap((row) => {
        const ids = MULTI_SELECT_PER_ROW ? (row.user_ids ?? []) : [row.user_id];
        return ids
          .filter(Boolean)
          .map((uid) => ({
            team_id: teamId,
            user_id: uid as string,
            role_type: row.role_type as MemberRoleType,
            custo_hora_override: row.custo_hora_override ? parseFloat(row.custo_hora_override) : undefined,
          }));
      });

      await Promise.all(payloads.map((p) => addMember(p)));

      toast({ title: "Sucesso", description: `${payloads.length} membro(s) adicionado(s)` });
      navigate(`/team?teamId=${teamId}`);
    } catch (e) {
      toast({ title: "Erro", description: "Não foi possível adicionar os membros", variant: "destructive" });
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Adicionar Membros à Equipe</h1>
            <p className="text-muted-foreground">Preencha a tabela com os dados dos membros</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Button variant="outline" onClick={handleCancel} className="w-full sm:w-auto">
              <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
            </Button>
            <Button onClick={handleAdd} className="w-full sm:w-auto">
              <Plus className="mr-2 h-4 w-4" /> Salvar e Adicionar
            </Button>
          </div>
        </header>

        <Card>
          <CardHeader>
            <CardTitle>Membros da Equipe</CardTitle>
            <CardDescription>
              Adicione múltiplos membros preenchendo os campos da tabela
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="overflow-hidden rounded-xl border border-border/60">
              <div className="hidden gap-3 bg-muted/20 px-3 py-2 text-sm font-medium text-muted-foreground sm:grid sm:grid-cols-[1fr_200px_150px_50px]">
                <div>Usuário *</div>
                <div>Tipo de Função *</div>
                <div>Custo/Hora Override</div>
                <div></div>
              </div>

              {rows.map((row) => {
                const selectedUser = users.find(u => u.user_id === row.user_id);
                const takenIds = rows
                  .filter((r) => r.id !== row.id)
                  .flatMap((r) => (MULTI_SELECT_PER_ROW ? (r.user_ids ?? []) : r.user_id ? [r.user_id] : []));
                const msOptions = availableUsers
                  .filter((u) => !takenIds.includes(u.user_id))
                  .map((u) => ({ value: u.user_id, label: `${u.nome_completo} — ${u.email}` }));

                return (
                  <div
                    key={row.id}
                    className="grid grid-cols-1 gap-3 border-b border-border/50 bg-card p-4 transition-colors last:border-b-0 hover:bg-accent/40 sm:grid-cols-[1fr_200px_150px_50px]"
                  >
                    <div className="space-y-1">
                      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground sm:hidden">Usuário *</span>
                      {MULTI_SELECT_PER_ROW ? (
                        <MultiSelect
                          options={msOptions}
                          selected={row.user_ids ?? []}
                          onChange={(vals) => updateRow(row.id, "user_ids", vals)}
                          placeholder="Selecione um usuário"
                        />
                      ) : (
                        <Select
                          key={`user-${row.id}`}
                          value={row.user_id}
                          onValueChange={(v) => updateRow(row.id, "user_id", v)}
                        >
                          <SelectTrigger className={`h-auto min-h-[44px] ${!row.user_id ? "border-destructive" : ""}`}>
                            {selectedUser ? (
                              <div className="flex flex-col items-start text-left w-full">
                                <span className="font-medium">{selectedUser.nome_completo}</span>
                                <span className="text-xs text-muted-foreground">{selectedUser.email}</span>
                              </div>
                            ) : (
                              <SelectValue placeholder="Selecione um usuário" />
                            )}
                          </SelectTrigger>
                          <SelectContent className="z-50 bg-popover">
                            {availableUsers.map((user) => (
                              <SelectItem 
                                key={user.user_id} 
                                value={user.user_id}
                                disabled={takenIds.includes(user.user_id)}
                                className="py-3"
                              >
                                <div className="flex flex-col">
                                  <span className="font-medium">{user.nome_completo}</span>
                                  <span className="text-xs text-muted-foreground">{user.email}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>

                    <div className="space-y-1">
                      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground sm:hidden">Tipo de Função *</span>
                      <Select
                        value={row.role_type}
                        onValueChange={(v) => updateRow(row.id, "role_type", v as MemberRow["role_type"]) }
                      >
                        <SelectTrigger className={!row.role_type ? "border-destructive" : ""}>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent className="z-50 bg-popover">
                          <SelectItem value="interno">Interno</SelectItem>
                          <SelectItem value="cliente">Cliente</SelectItem>
                          <SelectItem value="parceiro">Parceiro</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground sm:hidden">Custo/Hora Override</span>
                      <CurrencyInput
                        placeholder="R$ 0,00"
                        value={row.custo_hora_override}
                        onChange={(value) => updateRow(row.id, "custo_hora_override", value)}
                        className="text-center"
                      />
                    </div>

                    <div className="flex items-center sm:justify-center">
                      <span className="mr-auto text-xs font-medium uppercase tracking-wide text-muted-foreground sm:hidden">Remover</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeRow(row.id)}
                        disabled={rows.length === 1}
                        className="h-10 w-full sm:w-10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            <Button variant="outline" onClick={addRow} className="w-full sm:w-auto">
              <Plus className="mr-2 h-4 w-4" /> Adicionar Linha
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
