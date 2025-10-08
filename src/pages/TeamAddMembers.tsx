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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search } from "lucide-react";

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

  // Popup de seleção
  const [selectDialogOpen, setSelectDialogOpen] = useState(false);
  const [tempSelectedIds, setTempSelectedIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  const openSelectDialog = () => {
    setTempSelectedIds(selectedIds);
    setSearchQuery("");
    setSelectDialogOpen(true);
  };

  const confirmSelectDialog = () => {
    setSelectedIds(tempSelectedIds);
    setSelectDialogOpen(false);
  };

  const toggleUserSelection = (userId: string) => {
    setTempSelectedIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  // Available users (not already in team)
  const availableUsers = useMemo(() => {
    return users.filter((u) => !members.find((m) => m.user_id === u.user_id));
  }, [users, members]);

  // Filtrar usuários baseado na busca
  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return availableUsers;
    const query = searchQuery.toLowerCase();
    return availableUsers.filter(
      (u) =>
        u.nome_completo.toLowerCase().includes(query) ||
        u.email.toLowerCase().includes(query)
    );
  }, [availableUsers, searchQuery]);


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
            {/* Seleção via Popup */}
            <div>
              <Label htmlFor="users-multiselect">Selecionar Usuários *</Label>
              <div className="mt-2 flex items-center gap-2">
                <Button variant="outline" onClick={openSelectDialog} id="users-multiselect">
                  Selecionar usuários
                </Button>
                <span className="text-sm text-muted-foreground">
                  {selectedIds.length} usuário(s) selecionado(s)
                </span>
              </div>
              {availableUsers.length === 0 && (
                <p className="text-xs text-muted-foreground mt-2">
                  Todos os usuários já foram adicionados à equipe
                </p>
              )}

              <Dialog open={selectDialogOpen} onOpenChange={setSelectDialogOpen}>
                <DialogContent className="sm:max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Selecionar usuários</DialogTitle>
                    <DialogDescription>
                      Busque e selecione um ou mais usuários. {tempSelectedIds.length} selecionado(s).
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-4">
                    {/* Campo de busca */}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar por nome ou email..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9"
                      />
                    </div>

                    {/* Lista de usuários */}
                    <ScrollArea className="h-[300px] rounded-md border">
                      <div className="p-4 space-y-2">
                        {filteredUsers.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-8">
                            Nenhum usuário encontrado
                          </p>
                        ) : (
                          filteredUsers.map((user) => {
                            const checkboxId = `user-${user.user_id}`;
                            const isChecked = tempSelectedIds.includes(user.user_id);
                            return (
                              <div
                                key={user.user_id}
                                className="flex items-start space-x-3 rounded-lg p-3 hover:bg-accent transition-colors"
                              >
                                <Checkbox
                                  id={checkboxId}
                                  checked={isChecked}
                                  onCheckedChange={(checked) => {
                                    const next = checked === true;
                                    setTempSelectedIds((prev) =>
                                      next
                                        ? prev.includes(user.user_id)
                                          ? prev
                                          : [...prev, user.user_id]
                                        : prev.filter((id) => id !== user.user_id)
                                    );
                                  }}
                                  className="mt-0.5"
                                />
                                <label htmlFor={checkboxId} className="flex-1 cursor-pointer space-y-0.5">
                                  <p className="text-sm font-medium leading-none">{user.nome_completo}</p>
                                  <p className="text-sm text-muted-foreground">{user.email}</p>
                                </label>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </ScrollArea>
                  </div>

                  <DialogFooter>
                    <DialogClose asChild>
                      <Button variant="outline">Cancelar</Button>
                    </DialogClose>
                    <Button onClick={confirmSelectDialog}>
                      Salvar seleção ({tempSelectedIds.length})
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
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
