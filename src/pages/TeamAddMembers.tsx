import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useUsers } from "@/hooks/useUsers";
import { useTeamMembers } from "@/hooks/useTeamMembers";
import { useToast } from "@/hooks/use-toast";
import { MemberRoleType } from "@/types/project-team";
import { Plus, ArrowLeft } from "lucide-react";

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

  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [role, setRole] = useState<MemberRoleType | "">("");

  // Available users (not already in team)
  const availableUsers = useMemo(() => {
    return users.filter((u) => !members.find((m) => m.user_id === u.user_id));
  }, [users, members]);

  // Filter by name or email
  const filteredUsers = useMemo(() => {
    const q = search.toLowerCase();
    return availableUsers.filter(
      (u) => u.nome_completo.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    );
  }, [availableUsers, search]);

  const toggle = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  const handleCancel = () => {
    navigate(`/team?teamId=${teamId}`);
  };

  const handleAdd = async () => {
    if (!teamId) return;
    if (selectedIds.length === 0) {
      toast({ title: "Erro", description: "Selecione pelo menos um usuário", variant: "destructive" });
      return;
    }
    if (!role) {
      toast({ title: "Erro", description: "Selecione um tipo de função", variant: "destructive" });
      return;
    }

    try {
      await Promise.all(
        selectedIds.map((userId) =>
          addMember({ team_id: teamId, user_id: userId, role_type: role as MemberRoleType })
        )
      );
      toast({ title: "Sucesso", description: `${selectedIds.length} membro(s) adicionado(s)` });
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
            <p className="text-muted-foreground">Busque, selecione e defina a função antes de adicionar</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleCancel}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
            </Button>
            <Button onClick={handleAdd} disabled={selectedIds.length === 0 || !role}>
              <Plus className="mr-2 h-4 w-4" /> Adicionar Selecionados
            </Button>
          </div>
        </header>

        <section className="grid gap-6">
          {/* Busca */}
          <div>
            <Label htmlFor="user-search">Buscar Usuário</Label>
            <Input
              id="user-search"
              placeholder="Buscar por nome ou e-mail..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="mt-2"
            />
          </div>

          {/* Lista de usuários */}
          <div>
            <Label className="mb-2 block">Selecionar Usuários</Label>
            <div className="border rounded-md">
              <ScrollArea className="h-[420px]">
                <div className="p-4 space-y-2">
                  {availableUsers.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      Todos os usuários já estão na equipe
                    </p>
                  ) : filteredUsers.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      Nenhum usuário encontrado com "{search}"
                    </p>
                  ) : (
                    filteredUsers.map((u) => {
                      const checked = selectedIds.includes(u.user_id);
                      return (
                        <div
                          key={u.user_id}
                          className={`flex items-start gap-3 p-3 rounded-md hover:bg-accent transition-colors ${
                            checked ? "bg-accent border border-primary" : "border border-transparent"
                          }`}
                        >
                          <Checkbox
                            id={`u-${u.user_id}`}
                            checked={checked}
                            onCheckedChange={() => toggle(u.user_id)}
                            className="mt-1"
                          />
                          <label
                            htmlFor={`u-${u.user_id}`}
                            onClick={() => toggle(u.user_id)}
                            className="flex-1 cursor-pointer"
                          >
                            <p className="text-sm font-medium">{u.nome_completo}</p>
                            <p className="text-xs text-muted-foreground">{u.email}</p>
                          </label>
                        </div>
                      );
                    })
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>

          {/* Tipo de função */}
          <div>
            <Label>Tipo de Função *</Label>
            <Select value={role} onValueChange={(v) => setRole(v as MemberRoleType)}>
              <SelectTrigger className={!role ? "mt-2 border-destructive" : "mt-2"}>
                <SelectValue placeholder="Selecione uma função" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="interno">Interno</SelectItem>
                <SelectItem value="cliente">Cliente</SelectItem>
                <SelectItem value="parceiro">Parceiro</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
}
