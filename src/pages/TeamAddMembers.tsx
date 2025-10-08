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

  interface MemberRow {
    id: string;
    user_id: string;
    role_type: MemberRoleType | "";
    custo_hora_override: string;
  }

  const [rows, setRows] = useState<MemberRow[]>([
    { id: crypto.randomUUID(), user_id: "", role_type: "", custo_hora_override: "" }
  ]);

  // Available users (not already in team)
  const availableUsers = useMemo(() => {
    return users.filter((u) => !members.find((m) => m.user_id === u.user_id));
  }, [users, members]);

  const addRow = () => {
    setRows([...rows, { id: crypto.randomUUID(), user_id: "", role_type: "", custo_hora_override: "" }]);
  };

  const removeRow = (id: string) => {
    if (rows.length > 1) {
      setRows(rows.filter(r => r.id !== id));
    }
  };

  const updateRow = (id: string, field: keyof MemberRow, value: string) => {
    setRows(rows.map(r => r.id === id ? { ...r, [field]: value } : r));
  };


  const handleCancel = () => {
    navigate(`/team?teamId=${teamId}`);
  };

  const handleAdd = async () => {
    if (!teamId) return;
    
    const validRows = rows.filter(r => r.user_id && r.role_type);
    
    if (validRows.length === 0) {
      toast({ title: "Erro", description: "Preencha pelo menos uma linha completa", variant: "destructive" });
      return;
    }

    try {
      await Promise.all(
        validRows.map((row) =>
          addMember({ 
            team_id: teamId, 
            user_id: row.user_id, 
            role_type: row.role_type as MemberRoleType,
            custo_hora_override: row.custo_hora_override ? parseFloat(row.custo_hora_override) : undefined
          })
        )
      );
      toast({ title: "Sucesso", description: `${validRows.length} membro(s) adicionado(s)` });
      navigate(`/team?teamId=${teamId}`);
    } catch (e) {
      toast({ title: "Erro", description: "Não foi possível adicionar os membros", variant: "destructive" });
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Adicionar Membros à Equipe</h1>
            <p className="text-muted-foreground">Preencha a tabela com os dados dos membros</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleCancel}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
            </Button>
            <Button onClick={handleAdd}>
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
            <div className="space-y-3">
              <div className="grid grid-cols-[1fr_200px_150px_50px] gap-3 px-3 py-2 text-sm font-medium text-muted-foreground border-b">
                <div>Usuário *</div>
                <div>Tipo de Função *</div>
                <div>Custo/Hora Override</div>
                <div></div>
              </div>
              
              {rows.map((row) => {
                const selectedUser = availableUsers.find(u => u.user_id === row.user_id);
                
                return (
                  <div key={row.id} className="grid grid-cols-[1fr_200px_150px_50px] gap-3 items-start p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                    <div className="space-y-1">
                      <Select 
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
                              disabled={rows.some(r => r.id !== row.id && r.user_id === user.user_id)}
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
                    </div>
                    
                    <div>
                      <Select 
                        value={row.role_type} 
                        onValueChange={(v) => updateRow(row.id, "role_type", v)}
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
                    
                    <div>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={row.custo_hora_override}
                        onChange={(e) => updateRow(row.id, "custo_hora_override", e.target.value)}
                        className="text-center"
                      />
                    </div>
                    
                    <div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeRow(row.id)}
                        disabled={rows.length === 1}
                        className="h-10 w-10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
            
            <Button variant="outline" onClick={addRow} className="w-full">
              <Plus className="mr-2 h-4 w-4" /> Adicionar Linha
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
