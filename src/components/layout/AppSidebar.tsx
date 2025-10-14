import { useState } from "react";
import { NavLink } from "react-router-dom";
import { Bell, ChevronDown, ChevronLeft, ChevronRight, LogOut, Sparkles } from "lucide-react";

import { navigation, settingsNav } from "./navigation-data";
import { WorkspaceTree } from "./WorkspaceTree";
import { cn } from "@/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "./ThemeToggle";
import { useAuth } from "@/contexts/AuthContext";

const mainNavigation = navigation.slice(0, 2);
const toolsNavigation = navigation.slice(2);

interface AppSidebarProps {
  isCollapsed: boolean;
  onCollapseChange: (collapsed: boolean) => void;
}

export function AppSidebar({ isCollapsed, onCollapseChange }: AppSidebarProps) {
  const [isNavigationOpen, setIsNavigationOpen] = useState(true);
  const [isWorkspacesOpen, setIsWorkspacesOpen] = useState(true);
  const [isToolsOpen, setIsToolsOpen] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(true);
  const { user, logout } = useAuth();

  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    cn(
      "group/nav-item relative flex items-center rounded-2xl text-sm font-semibold transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200/60",
      isCollapsed ? "h-12 w-12 justify-center" : "w-full px-4 py-3",
      isActive
        ? "bg-white/15 text-white shadow-[0_12px_35px_rgba(5,37,76,0.45)] backdrop-blur-sm"
        : "text-sky-100/80 hover:bg-white/10 hover:text-white"
    );

  const getMenuCardClasses = (
    collapsed: boolean,
    { variant = "default" }: { variant?: "default" | "workspaces" } = {}
  ) =>
    cn(
      "rounded-3xl border border-white/10 backdrop-blur-md",
      collapsed ? "p-2" : "p-4",
      variant === "workspaces"
        ? "bg-gradient-to-br from-white/10 via-sky-500/5 to-transparent shadow-[0_15px_45px_rgba(4,22,48,0.32)]"
        : "bg-white/5 shadow-[0_18px_45px_rgba(4,19,42,0.35)]"
    );

  const navigationTooltipDelay = isCollapsed ? 0 : 300;

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-40 hidden flex-col overflow-hidden border-r border-white/10 bg-[radial-gradient(120%_120%_at_0%_0%,#1C6DD1,transparent),radial-gradient(120%_120%_at_100%_0%,rgba(12,39,89,0.95),rgba(8,24,54,0.95))] text-white shadow-2xl transition-all duration-300 lg:flex",
        isCollapsed ? "w-20" : "w-80"
      )}
    >
      <button
        type="button"
        onClick={() => onCollapseChange(!isCollapsed)}
        className="absolute right-2 top-4 z-50 flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white transition hover:bg-white/20"
        aria-label={isCollapsed ? "Expandir menu lateral" : "Recolher menu lateral"}
      >
        {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
      </button>

      <div
        className={cn(
          "px-7 pt-8 transition-all duration-300",
          isCollapsed ? "flex justify-center px-4" : ""
        )}
      >
        <div
          className={cn(
            "flex w-full items-center gap-3 rounded-3xl border border-white/10 bg-white/5 p-3 shadow-[0_18px_40px_rgba(7,27,60,0.45)]",
            "backdrop-blur-sm",
            isCollapsed && "flex-col gap-2 text-center"
          )}
        >
          <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400/60 via-blue-500/70 to-indigo-500/70 text-white shadow-[0_12px_30px_rgba(32,112,220,0.65)]">
            <img src="/baumgratz-code-mark.svg" alt="Baumfratz Code" className="h-9 w-9" />
          </div>
          <div
            className={cn(
              "flex flex-1 flex-col leading-tight transition-opacity duration-200",
              isCollapsed ? "pointer-events-none opacity-0" : "opacity-100"
            )}
          >
            <span className="text-[11px] font-semibold uppercase tracking-[0.42em] text-white/70">Baumfratz</span>
            <span className="text-xl font-semibold text-orange-300">CODE</span>
            <span className="text-[10px] font-medium uppercase tracking-[0.28em] text-white/60">
              Painel de Projetos
            </span>
          </div>
        </div>
      </div>

      <TooltipProvider delayDuration={navigationTooltipDelay}>
        <ScrollArea className="flex-1">
          <div
            className={cn(
              "flex flex-col pb-6 transition-all duration-300",
              isCollapsed ? "px-3 pt-6" : "px-6 pt-8"
            )}
          >
            <UserProfileCard
              user={user}
              collapsed={isCollapsed}
              onLogout={logout}
              className={cn(isCollapsed ? "mb-6" : "mb-8")}
            />
            <SidebarCollapsibleSection
              title="Navegação"
              open={isNavigationOpen}
              onOpenChange={setIsNavigationOpen}
              collapsed={isCollapsed}
            >
              <div className={getMenuCardClasses(isCollapsed)}>
                <nav
                  className={cn(
                    "flex flex-col gap-2",
                    isCollapsed && "items-center gap-3"
                  )}
                >
                  {mainNavigation.map((item) => (
                    <Tooltip key={item.title}>
                      <TooltipTrigger asChild>
                        <NavLink to={item.url} end className={({ isActive }) => getNavCls({ isActive })}>
                          <span
                            className={cn(
                              "flex items-center gap-3",
                              isCollapsed ? "justify-center" : "flex-1"
                            )}
                          >
                            <span
                              className={cn(
                                "flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500/20 via-blue-400/30 to-blue-600/30 text-white shadow-[0_8px_20px_rgba(14,58,122,0.45)] transition-all",
                                "ring-1 ring-white/10 group-hover/nav-item:scale-105 group-aria-[current=page]/nav-item:ring-2 group-aria-[current=page]/nav-item:ring-white/40"
                              )}
                            >
                              <item.icon className="h-4 w-4" />
                            </span>
                            <span
                              className={cn(
                                "whitespace-nowrap text-left text-sm font-medium transition-opacity",
                                isCollapsed && "sr-only"
                              )}
                            >
                              {item.title}
                            </span>
                          </span>
                        </NavLink>
                      </TooltipTrigger>
                      <TooltipContent
                        side="right"
                        hidden={!isCollapsed}
                        className="border-white/10 bg-slate-900/90 text-xs font-medium text-white backdrop-blur-sm dark:bg-white/10"
                      >
                        {item.title}
                      </TooltipContent>
                    </Tooltip>
                  ))}
                </nav>
              </div>
            </SidebarCollapsibleSection>

            <SidebarCollapsibleSection
              title="Meus Workspaces"
              className="mt-8"
              open={isWorkspacesOpen}
              onOpenChange={setIsWorkspacesOpen}
              collapsed={isCollapsed}
            >
              <div className={getMenuCardClasses(isCollapsed, { variant: "workspaces" })}>
                <WorkspaceTree
                  collapsed={isCollapsed}
                  onWorkspaceSelect={() => onCollapseChange(false)}
                />
              </div>
            </SidebarCollapsibleSection>

            <SidebarCollapsibleSection
              title="Ferramentas"
              className="mt-8"
              open={isToolsOpen}
              onOpenChange={setIsToolsOpen}
              collapsed={isCollapsed}
            >
              <div className={getMenuCardClasses(isCollapsed)}>
                <div
                  className={cn(
                    "flex flex-col gap-2",
                    isCollapsed && "items-center"
                  )}
                >
                  {toolsNavigation.map((item) => (
                    <Tooltip key={item.title}>
                      <TooltipTrigger asChild>
                        <NavLink to={item.url} end className={({ isActive }) => getNavCls({ isActive })}>
                          <span
                            className={cn(
                              "flex items-center gap-3",
                              isCollapsed ? "justify-center" : "flex-1"
                            )}
                          >
                            <span
                              className={cn(
                                "flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-white shadow-[0_10px_28px_rgba(10,33,68,0.4)] transition-all",
                                "border border-white/10 group-hover/nav-item:bg-white/15 group-hover/nav-item:text-white group-aria-[current=page]/nav-item:border-white/40"
                              )}
                            >
                              <item.icon className="h-4 w-4" />
                            </span>
                            <span
                              className={cn(
                                "whitespace-nowrap text-left text-sm font-medium transition-opacity",
                                isCollapsed && "sr-only"
                              )}
                            >
                              {item.title}
                            </span>
                          </span>
                        </NavLink>
                      </TooltipTrigger>
                      <TooltipContent
                        side="right"
                        hidden={!isCollapsed}
                        className="border-white/10 bg-slate-900/90 text-xs font-medium text-white backdrop-blur-sm dark:bg-white/10"
                      >
                        {item.title}
                      </TooltipContent>
                    </Tooltip>
                  ))}
                </div>
              </div>
            </SidebarCollapsibleSection>

            <SidebarCollapsibleSection
              title="Configurações"
              className="mt-8"
              open={isSettingsOpen}
              onOpenChange={setIsSettingsOpen}
              collapsed={isCollapsed}
            >
              <div className={getMenuCardClasses(isCollapsed)}>
                <div
                  className={cn(
                    "flex flex-col gap-2",
                    isCollapsed && "items-center"
                  )}
                >
                  {settingsNav.map((item) => (
                    <Tooltip key={item.title}>
                      <TooltipTrigger asChild>
                        <NavLink to={item.url} end className={({ isActive }) => getNavCls({ isActive })}>
                          <span
                            className={cn(
                              "flex items-center gap-3",
                              isCollapsed ? "justify-center" : "flex-1"
                            )}
                          >
                            <span
                              className={cn(
                                "flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-100/10 via-sky-400/10 to-transparent text-white transition-all",
                                "border border-white/10 shadow-[0_10px_30px_rgba(4,23,51,0.35)] group-aria-[current=page]/nav-item:border-white/40"
                              )}
                            >
                              <item.icon className="h-4 w-4" />
                            </span>
                            <span
                              className={cn(
                                "whitespace-nowrap text-left text-sm font-medium transition-opacity",
                                isCollapsed && "sr-only"
                              )}
                            >
                              {item.title}
                            </span>
                          </span>
                        </NavLink>
                      </TooltipTrigger>
                      <TooltipContent
                        side="right"
                        hidden={!isCollapsed}
                        className="border-white/10 bg-slate-900/90 text-xs font-medium text-white backdrop-blur-sm dark:bg-white/10"
                      >
                        {item.title}
                      </TooltipContent>
                    </Tooltip>
                  ))}
                </div>
              </div>
            </SidebarCollapsibleSection>

            <div
              className={cn(
                "mt-10 rounded-3xl border border-white/10 bg-gradient-to-br from-sky-500/10 via-blue-500/10 to-slate-900/40 p-5 text-white shadow-[0_15px_45px_rgba(5,28,70,0.38)]",
                "backdrop-blur-md",
                isCollapsed && "p-3 text-center"
              )}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 text-white shadow-[0_10px_25px_rgba(12,60,128,0.45)]">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div
                  className={cn(
                    "flex flex-1 flex-col text-left",
                    isCollapsed && "sr-only"
                  )}
                >
                  <span className="text-sm font-semibold">Vamos começar?</span>
                  <span className="text-xs text-sky-100/80">
                    Crie ou acompanhe tarefas com apenas alguns cliques.
                  </span>
                </div>
              </div>
              {!isCollapsed && (
                <button
                  type="button"
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-sky-400 via-blue-500 to-indigo-500 px-4 py-3 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(25,98,195,0.45)] transition hover:from-sky-300 hover:via-blue-400 hover:to-indigo-400"
                >
                  <span>Adicionar nova tarefa</span>
                </button>
              )}
            </div>
          </div>
        </ScrollArea>
      </TooltipProvider>
    </aside>
  );
}

interface SidebarSectionProps {
  title: string;
  children: React.ReactNode;
  className?: string;
  collapsed?: boolean;
}

function SidebarSection({ title, children, className, collapsed }: SidebarSectionProps) {
  return (
    <section className={cn("w-full", className)}>
      <p
        className={cn(
          "text-xs font-semibold uppercase tracking-[0.32em] text-white/50 transition-opacity",
          collapsed ? "sr-only" : "opacity-100"
        )}
      >
        {title}
      </p>
      <div className={cn("mt-4", collapsed && "mt-0")}>{children}</div>
    </section>
  );
}

interface SidebarCollapsibleSectionProps extends SidebarSectionProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function SidebarCollapsibleSection({
  title,
  children,
  className,
  open,
  onOpenChange,
  collapsed,
}: SidebarCollapsibleSectionProps) {
  if (collapsed) {
    return (
      <SidebarSection title={title} className={className} collapsed>
        {children}
      </SidebarSection>
    );
  }

  return (
    <Collapsible open={open} onOpenChange={onOpenChange}>
      <section className={cn("w-full", className)}>
        <CollapsibleTrigger
          type="button"
          className="group flex w-full items-center justify-between text-left text-xs font-semibold uppercase tracking-[0.32em] text-white/50 transition-colors hover:text-white focus:outline-none focus-visible:text-white"
        >
          <span>{title}</span>
          <ChevronDown
            className={cn(
              "h-4 w-4 text-white/50 transition-transform duration-200 group-hover:text-white",
              open ? "rotate-180" : "rotate-0"
            )}
          />
        </CollapsibleTrigger>
        <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
          <div className="mt-4">{children}</div>
        </CollapsibleContent>
      </section>
    </Collapsible>
  );
}

interface UserProfileCardProps {
  user: { name?: string | null; email?: string | null; avatar?: string | null } | null;
  collapsed: boolean;
  onLogout: () => void;
  className?: string;
}

function UserProfileCard({ user, collapsed, onLogout, className }: UserProfileCardProps) {
  const displayName = user?.name || "Usuário";
  const displayEmail = user?.email || "usuario@exemplo.com";
  const fallbackInitial = displayName?.charAt(0) || displayEmail?.charAt(0) || "U";

  const notificationButton = (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="relative h-11 w-11 rounded-2xl border border-white/20 bg-white/10 text-white shadow-[0_12px_30px_rgba(8,32,70,0.45)] transition-all hover:border-white/40 hover:bg-white/20"
        >
          <Bell className="h-5 w-5" />
          <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full border-0 bg-accent p-0 text-[11px] font-semibold text-accent-foreground shadow-glow">
            3
          </Badge>
        </Button>
      </TooltipTrigger>
      <TooltipContent side={collapsed ? "right" : "top"} className="border-white/10 bg-slate-900/90 text-xs font-medium text-white backdrop-blur-sm dark:bg-white/10">
        <p>3 notificações não lidas</p>
      </TooltipContent>
    </Tooltip>
  );

  return (
    <div
      className={cn(
        "w-full rounded-3xl border border-white/10 bg-white/5 text-white shadow-[0_18px_45px_rgba(4,19,42,0.35)] backdrop-blur-md",
        collapsed ? "flex flex-col items-center gap-3 p-3" : "space-y-4 p-5",
        className,
      )}
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <Avatar className="h-12 w-12 border border-white/40 shadow-soft supports-[backdrop-filter]:bg-white/20">
            <AvatarImage src={user?.avatar ?? undefined} alt={displayName} />
            <AvatarFallback className="bg-primary text-primary-foreground">{fallbackInitial}</AvatarFallback>
          </Avatar>
        </TooltipTrigger>
        {collapsed && (
          <TooltipContent
            side="right"
            className="border-white/10 bg-slate-900/90 text-xs font-medium text-white backdrop-blur-sm dark:bg-white/10"
          >
            <p className="text-sm font-semibold text-white">{displayName}</p>
            <p className="mt-1 text-xs text-white/70">{displayEmail}</p>
          </TooltipContent>
        )}
      </Tooltip>
      {collapsed ? (
        <div className="flex flex-col items-center gap-3">
          <Tooltip>
            <TooltipTrigger asChild>
              <ThemeToggle variant="sidebar" />
            </TooltipTrigger>
            <TooltipContent side="right" className="border-white/10 bg-slate-900/90 text-xs font-medium text-white backdrop-blur-sm dark:bg-white/10">
              <p>Alternar tema</p>
            </TooltipContent>
          </Tooltip>
          {notificationButton}
        </div>
      ) : (
        <>
          <div className="space-y-3">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.32em] text-white/60">Perfil</p>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-white">{displayName}</p>
                <p className="text-xs text-white/70">{displayEmail}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Tooltip>
                <TooltipTrigger asChild>
                  <ThemeToggle variant="sidebar" />
                </TooltipTrigger>
                <TooltipContent className="border-white/10 bg-slate-900/90 text-xs font-medium text-white backdrop-blur-sm dark:bg-white/10">
                  <p>Alternar tema</p>
                </TooltipContent>
              </Tooltip>
              {notificationButton}
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            className="w-full justify-center gap-2 rounded-2xl border border-white/10 bg-white/10 py-3 text-sm font-semibold text-white transition hover:bg-white/15 hover:text-white"
            onClick={() => void onLogout()}
          >
            <LogOut className="h-4 w-4" />
            <span>Sair</span>
          </Button>
        </>
      )}
    </div>
  );
}
