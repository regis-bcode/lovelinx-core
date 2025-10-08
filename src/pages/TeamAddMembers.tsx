import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUsers } from "@/hooks/useUsers";
import { useTeamMembers } from "@/hooks/useTeamMembers";
import { useToast } from "@/hooks/use-toast";
import { MemberRoleType } from "@/types/project-team";
import { Plus, ArrowLeft } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MultiSelect } from "primereact/multiselect";
import "primereact/resources/themes/lara-light-indigo/theme.css";
import "primereact/resources/primereact.min.css";
import "primeicons/primeicons.css";

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

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [role, setRole] = useState<MemberRoleType | "">("");

  // Available users (not already in team)
  const availableUsers = useMemo(() => {
    return users.filter((u) => !members.find((m) => m.user_id === u.user_id));
  }, [users, members]);

  // Formatar usuários para o MultiSelect
  const userOptions = useMemo(() => {
    return availableUsers.map((u) => ({
      user_id: u.user_id,
      name: u.nome_completo,
      email: u.email,
    }));
  }, [availableUsers]);

  // Template para cada item da lista
  const userTemplate = (option: any) => {
    return (
      <div className="flex flex-col py-1">
        <span className="font-medium text-sm">{option.name}</span>
        <span className="text-xs text-muted-foreground">{option.email}</span>
      </div>
    );
  };

  // Footer do painel com contador
  const panelFooterTemplate = () => {
    const length = selectedIds.length;
    return (
      <div className="py-2 px-3 border-t">
        <span className="text-sm font-medium">
          {length} usuário{length !== 1 ? "s" : ""} selecionado{length !== 1 ? "s" : ""}
        </span>
      </div>
    );
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
            <p className="text-muted-foreground">Selecione múltiplos usuários e defina a função</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleCancel}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
            </Button>
            <Button onClick={handleAdd} disabled={selectedIds.length === 0 || !role}>
              <Plus className="mr-2 h-4 w-4" /> Adicionar {selectedIds.length > 0 ? `(${selectedIds.length})` : ""}
            </Button>
          </div>
        </header>

        <Card>
          <CardHeader>
            <CardTitle>Seleção de Membros</CardTitle>
            <CardDescription>
              Busque e selecione um ou mais usuários da lista
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* PrimeReact MultiSelect */}
            <div>
              <Label htmlFor="users-multiselect">Selecionar Usuários *</Label>
              <div className="mt-2">
                <MultiSelect
                  id="users-multiselect"
                  value={selectedIds}
                  options={userOptions}
                  onChange={(e) => setSelectedIds(e.value)}
                  optionLabel="name"
                  optionValue="user_id"
                  placeholder="Selecione usuários..."
                  filter
                  itemTemplate={userTemplate}
                  panelFooterTemplate={panelFooterTemplate}
                  display="chip"
                  className="w-full"
                  showClear
                  disabled={availableUsers.length === 0}
                />
              </div>
              {availableUsers.length === 0 && (
                <p className="text-xs text-muted-foreground mt-2">
                  Todos os usuários já foram adicionados à equipe
                </p>
              )}
            </div>

            {/* Tipo de função */}
            <div>
              <Label htmlFor="role-select">Tipo de Função *</Label>
              <Select value={role} onValueChange={(v) => setRole(v as MemberRoleType)}>
                <SelectTrigger
                  id="role-select"
                  className={!role && selectedIds.length > 0 ? "mt-2 border-destructive" : "mt-2"}
                >
                  <SelectValue placeholder="Selecione uma função" />
                </SelectTrigger>
                <SelectContent className="z-50 bg-popover">
                  <SelectItem value="interno">Interno</SelectItem>
                  <SelectItem value="cliente">Cliente</SelectItem>
                  <SelectItem value="parceiro">Parceiro</SelectItem>
                </SelectContent>
              </Select>
              {!role && selectedIds.length > 0 && (
                <p className="text-xs text-destructive mt-1">
                  Selecione uma função antes de adicionar
                </p>
              )}
            </div>

            {/* Botões de ação */}
            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={handleCancel}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button 
                onClick={handleAdd} 
                disabled={selectedIds.length === 0 || !role}
                className="flex-1"
              >
                <Plus className="mr-2 h-4 w-4" />
                Salvar e Adicionar {selectedIds.length > 0 ? `(${selectedIds.length})` : ""}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
