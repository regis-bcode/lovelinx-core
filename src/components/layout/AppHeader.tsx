import { Bell, Search, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ThemeToggle } from "./ThemeToggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";

export function AppHeader() {
  const { user, logout } = useAuth();

  return (
    <TooltipProvider>
      <div className="flex h-full flex-1 items-center justify-between gap-6">
        <div className="flex flex-1 items-center gap-6">
          <div className="hidden md:flex flex-col gap-0.5">
            <span className="text-[11px] font-semibold uppercase tracking-[0.42em] text-primary/70">
              Baumfratz Code
            </span>
            <span className="text-sm font-semibold text-foreground">
              Painel de Acompanhamento de Projetos
            </span>
            <span className="text-xs text-muted-foreground">
              Gestão centralizada para squads, PMOs e lideranças
            </span>
          </div>

          <Tooltip>
            <TooltipTrigger asChild>
              <div className="relative hidden flex-1 items-center md:flex">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-primary/70" />
                <Input
                  placeholder="Buscar projetos, equipes ou indicadores"
                  className="h-11 w-full rounded-full border border-primary/20 bg-white/70 pl-11 pr-4 text-sm text-foreground shadow-soft focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/40"
                />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Buscar rapidamente por projetos, tarefas ou documentos</p>
            </TooltipContent>
          </Tooltip>
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggle />

          {/* Notifications */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="relative h-10 w-10 rounded-full border border-primary/20 bg-white/40 text-primary hover:border-primary/40 hover:bg-white/70"
              >
                <Bell className="h-5 w-5" />
                <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full border-0 bg-accent p-0 text-[11px] font-semibold text-accent-foreground shadow-glow">
                  3
                </Badge>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>3 notificações não lidas</p>
            </TooltipContent>
          </Tooltip>

          {/* User Menu */}
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="relative flex h-11 items-center gap-3 rounded-full border border-primary/20 bg-white/40 px-1.5 pr-3 text-left text-foreground hover:border-primary/40 hover:bg-white/70"
                  >
                    <Avatar className="h-9 w-9 border border-primary/25 shadow-soft">
                      <AvatarImage src={user?.avatar} alt={user?.name} />
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {user?.name?.charAt(0) || user?.email?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    {statefulUserInfo(user)}
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent>
                <p>Perfil e configurações da conta</p>
              </TooltipContent>
            </Tooltip>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{user?.name || 'Usuário'}</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user?.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer">
                Perfil
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer">
                Configurações
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="cursor-pointer text-destructive focus:text-destructive"
                onClick={logout}
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sair</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </TooltipProvider>
  );
}

function statefulUserInfo(user: { name?: string | null; email?: string | null } | null) {
  if (!user?.name && !user?.email) {
    return null;
  }

  return (
    <div className="hidden flex-col leading-tight sm:flex">
      <span className="text-sm font-semibold text-foreground">
        {user?.name || 'Usuário'}
      </span>
      <span className="text-xs text-muted-foreground">{user?.email}</span>
    </div>
  );
}