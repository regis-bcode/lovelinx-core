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
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[300px]">Usuário *</TableHead>
                    <TableHead className="w-[200px]">Tipo de Função *</TableHead>
                    <TableHead className="w-[180px]">Custo/Hora Override</TableHead>
                    <TableHead className="w-[80px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>
                        <Select 
                          value={row.user_id} 
                          onValueChange={(v) => updateRow(row.id, "user_id", v)}
                        >
                          <SelectTrigger className={!row.user_id ? "border-destructive" : ""}>
                            <SelectValue placeholder="Selecione um usuário" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableUsers.map((user) => (
                              <SelectItem 
                                key={user.user_id} 
                                value={user.user_id}
                                disabled={rows.some(r => r.id !== row.id && r.user_id === user.user_id)}
                              >
                                <div className="flex flex-col">
                                  <span className="font-medium">{user.nome_completo}</span>
                                  <span className="text-xs text-muted-foreground">{user.email}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Select 
                          value={row.role_type} 
                          onValueChange={(v) => updateRow(row.id, "role_type", v)}
                        >
                          <SelectTrigger className={!row.role_type ? "border-destructive" : ""}>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="interno">Interno</SelectItem>
                            <SelectItem value="cliente">Cliente</SelectItem>
                            <SelectItem value="parceiro">Parceiro</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={row.custo_hora_override}
                          onChange={(e) => updateRow(row.id, "custo_hora_override", e.target.value)}
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeRow(row.id)}
                          disabled={rows.length === 1}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            
            <div className="flex gap-3 mt-4">
              <Button variant="outline" onClick={addRow}>
                <Plus className="mr-2 h-4 w-4" /> Adicionar Linha
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
