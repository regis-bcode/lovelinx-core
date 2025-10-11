import { Bell, Search, LogOut, Minus, Maximize2 } from "lucide-react";
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
import { useState } from "react";
import { cn } from "@/lib/utils";

export function AppHeader() {
  const { user, logout } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const toggleCollapse = () => setIsCollapsed((prev) => !prev);

  const collapseToggleButton = (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 shrink-0 rounded-xl border border-white/40 bg-white/60 text-primary shadow-[0_10px_25px_-15px_rgba(15,65,120,0.55)] backdrop-blur-xl transition-all hover:border-primary/40 hover:bg-white/80 supports-[backdrop-filter]:bg-white/30"
          aria-label={isCollapsed ? "Maximizar painel" : "Minimizar painel"}
          onClick={toggleCollapse}
        >
          {isCollapsed ? <Maximize2 className="h-[1.1rem] w-[1.1rem]" /> : <Minus className="h-[1.1rem] w-[1.1rem]" />}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>{isCollapsed ? "Maximizar painel" : "Minimizar painel"}</p>
      </TooltipContent>
    </Tooltip>
  );

  return (
    <TooltipProvider>
      <div
        className={cn(
          "relative overflow-hidden rounded-[32px] border border-white/60 bg-white/40 p-6 shadow-[0_25px_65px_-20px_rgba(15,65,120,0.45)] backdrop-blur-2xl transition-all duration-300 supports-[backdrop-filter]:bg-white/30 dark:border-white/10 dark:bg-background/70",
          isCollapsed && "flex min-h-[72px] items-center justify-between gap-4 p-4"
        )}
      >
        {!isCollapsed && (
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -left-16 top-[-4rem] h-56 w-56 rounded-full bg-primary/30 blur-3xl" />
            <div className="absolute right-[-3rem] top-[-2rem] h-40 w-40 rounded-full bg-[#29A3E5]/25 blur-3xl" />
            <div className="absolute bottom-[-4rem] left-1/2 h-48 w-72 -translate-x-1/2 rounded-full bg-white/40 blur-3xl" />
            <div className="absolute inset-0 bg-gradient-to-r from-white/60 via-white/20 to-transparent" />
          </div>
        )}
        {!isCollapsed ? (
          <div className="relative flex flex-1 flex-col gap-6 md:flex-row md:items-center md:justify-between md:gap-6">
            <div className="flex flex-1 flex-col gap-4 pr-4 md:pr-24">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex flex-col gap-0.5">
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

              </div>

              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="relative flex items-center">
                    <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-primary/80" />
                    <Input
                      placeholder="Buscar projetos, equipes ou indicadores"
                      className="h-12 w-full rounded-full border border-white/50 bg-white/40 pl-11 pr-4 text-sm text-foreground shadow-[0_12px_30px_-15px_rgba(15,65,120,0.45)] backdrop-blur-xl transition-all placeholder:text-muted-foreground/70 focus:border-primary/50 focus:bg-white/60 focus:ring-2 focus:ring-primary/40 supports-[backdrop-filter]:bg-white/30"
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Buscar rapidamente por projetos, tarefas ou documentos</p>
                </TooltipContent>
              </Tooltip>
            </div>

            <div className="flex items-center gap-3 self-start md:self-center">
              <div className="md:hidden">{collapseToggleButton}</div>
              <ThemeToggle />

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="relative h-11 w-11 rounded-full border border-white/50 bg-white/40 text-primary shadow-[0_12px_30px_-15px_rgba(15,65,120,0.55)] backdrop-blur-xl transition-all hover:border-primary/40 hover:bg-white/60 supports-[backdrop-filter]:bg-white/30"
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

              <DropdownMenu>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        className="relative flex h-12 items-center gap-3 rounded-full border border-white/50 bg-white/40 px-1.5 pr-3 text-left text-foreground shadow-[0_12px_30px_-15px_rgba(15,65,120,0.55)] backdrop-blur-xl transition-all hover:border-primary/40 hover:bg-white/60 supports-[backdrop-filter]:bg-white/30"
                      >
                        <Avatar className="h-10 w-10 border border-white/60 shadow-soft supports-[backdrop-filter]:bg-white/20">
                          <AvatarImage src={user?.avatar} alt={user?.name} />
                          <AvatarFallback className="bg-primary text-primary-foreground">
                            {user?.name?.charAt(0) || user?.email?.charAt(0) || "U"}
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
                      <p className="text-sm font-medium leading-none">{user?.name || "Usuário"}</p>
                      <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="cursor-pointer">Perfil</DropdownMenuItem>
                  <DropdownMenuItem className="cursor-pointer">Configurações</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="cursor-pointer text-destructive focus:text-destructive" onClick={logout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Sair</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div className="absolute right-0 top-0 hidden md:block">
              {collapseToggleButton}
            </div>
          </div>
        ) : (
          <div className="flex w-full items-center justify-between gap-4">
            <span className="text-sm font-semibold text-foreground">Painel de Acompanhamento de Projetos</span>
            {collapseToggleButton}
          </div>
        )}
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
      <span className="text-sm font-semibold text-foreground">{user?.name || "Usuário"}</span>
      <span className="text-xs text-muted-foreground">{user?.email}</span>
    </div>
  );
}
