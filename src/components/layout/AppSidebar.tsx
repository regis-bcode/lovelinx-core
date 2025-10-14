import { useState } from "react";
import { NavLink } from "react-router-dom";
import { ChevronDown, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";

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

  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    cn(
      "group/nav-item relative flex items-center rounded-2xl text-sm font-semibold transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200/60",
      isCollapsed
        ? "h-16 w-16 justify-center rounded-[1.75rem] border border-white/10 bg-white/5 shadow-[0_16px_45px_rgba(6,28,76,0.42)]"
        : "w-full px-4 py-3",
      isActive
        ? isCollapsed
          ? "border-white/40 bg-gradient-to-br from-white/15 via-sky-400/40 to-blue-500/40 text-white shadow-[0_18px_55px_rgba(6,45,120,0.55)]"
          : "bg-white/15 text-white shadow-[0_12px_35px_rgba(5,37,76,0.45)] backdrop-blur-sm"
        : isCollapsed
          ? "text-sky-100/80 hover:border-white/25 hover:bg-white/15 hover:text-white"
          : "text-sky-100/80 hover:bg-white/10 hover:text-white"
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
          isCollapsed ? "px-3" : ""
        )}
      >
        {isCollapsed ? (
          <CollapsedSidebarHeader />
        ) : (
          <div
            className={cn(
              "flex w-full items-center gap-3 rounded-3xl border border-white/10 bg-white/5 p-3 shadow-[0_18px_40px_rgba(7,27,60,0.45)]",
              "backdrop-blur-sm"
            )}
          >
            <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400/60 via-blue-500/70 to-indigo-500/70 text-white shadow-[0_12px_30px_rgba(32,112,220,0.65)]">
              <img src="/baumgratz-code-mark.svg" alt="Baumfratz Code" className="h-9 w-9" />
            </div>
            <div className="flex flex-1 flex-col leading-tight">
              <span className="text-[11px] font-semibold uppercase tracking-[0.42em] text-white/70">Baumfratz</span>
              <span className="text-xl font-semibold text-orange-300">CODE</span>
              <span className="text-[10px] font-medium uppercase tracking-[0.28em] text-white/60">
                Painel de Projetos
              </span>
            </div>
          </div>
        )}
      </div>

      <TooltipProvider delayDuration={navigationTooltipDelay}>
        <ScrollArea className="flex-1">
          <div
            className={cn(
              "flex flex-col pb-6 transition-all duration-300",
              isCollapsed ? "px-3 pt-6" : "px-6 pt-8"
            )}
          >
            <SidebarCollapsibleSection
              title="Navegação"
              open={isNavigationOpen}
              onOpenChange={setIsNavigationOpen}
              collapsed={isCollapsed}
            >
              <div
                className={cn(
                  "rounded-3xl border border-white/10 bg-white/5 shadow-[0_18px_45px_rgba(4,19,42,0.35)]",
                  "backdrop-blur-md",
                  isCollapsed ? "p-3" : "p-4"
                )}
              >
                <nav
                  className={cn(
                    "flex flex-col gap-2",
                    isCollapsed && "relative items-center gap-5 py-4"
                  )}
                >
                  {isCollapsed && (
                    <span className="pointer-events-none absolute inset-y-2 left-1/2 -z-10 w-px -translate-x-1/2 rounded-full bg-gradient-to-b from-white/40 via-white/15 to-transparent" aria-hidden="true" />
                  )}
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
                                "ring-1 ring-white/10 group-hover/nav-item:scale-105 group-aria-[current=page]/nav-item:ring-2 group-aria-[current=page]/nav-item:ring-white/40",
                                isCollapsed && "h-12 w-12 rounded-2xl"
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
              <div
                className={cn(
                  "rounded-3xl border border-white/10 bg-gradient-to-br from-white/10 via-sky-500/5 to-transparent p-4 shadow-[0_15px_45px_rgba(4,22,48,0.32)]",
                  "backdrop-blur-md",
                  isCollapsed && "p-2"
                )}
              >
                <WorkspaceTree collapsed={isCollapsed} />
              </div>
            </SidebarCollapsibleSection>

            <SidebarCollapsibleSection
              title="Ferramentas"
              className="mt-8"
              open={isToolsOpen}
              onOpenChange={setIsToolsOpen}
              collapsed={isCollapsed}
            >
              <div
                className={cn(
                  "flex flex-col gap-2",
                  isCollapsed && "relative items-center gap-5 py-2"
                )}
              >
                {isCollapsed && (
                  <span className="pointer-events-none absolute inset-y-1 left-1/2 -z-10 w-px -translate-x-1/2 rounded-full bg-gradient-to-b from-white/35 via-white/15 to-transparent" aria-hidden="true" />
                )}
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
                              "border border-white/10 group-hover/nav-item:bg-white/15 group-hover/nav-item:text-white group-aria-[current=page]/nav-item:border-white/40",
                              isCollapsed && "h-12 w-12 rounded-2xl border-white/15 bg-white/10"
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
            </SidebarCollapsibleSection>

            <SidebarCollapsibleSection
              title="Configurações"
              className="mt-8"
              open={isSettingsOpen}
              onOpenChange={setIsSettingsOpen}
              collapsed={isCollapsed}
            >
              <div
                className={cn(
                  "flex flex-col gap-2",
                  isCollapsed && "relative items-center gap-5 py-2"
                )}
              >
                {isCollapsed && (
                  <span className="pointer-events-none absolute inset-y-1 left-1/2 -z-10 w-px -translate-x-1/2 rounded-full bg-gradient-to-b from-white/30 via-white/12 to-transparent" aria-hidden="true" />
                )}
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
                              "border border-white/10 shadow-[0_10px_30px_rgba(4,23,51,0.35)] group-aria-[current=page]/nav-item:border-white/40",
                              isCollapsed && "h-12 w-12 rounded-2xl border-white/15"
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
            </SidebarCollapsibleSection>

            <div
              className={cn(
                "mt-10 rounded-3xl border border-white/10 bg-gradient-to-br from-sky-500/10 via-blue-500/10 to-slate-900/40 p-5 text-white shadow-[0_15px_45px_rgba(5,28,70,0.38)]",
                "backdrop-blur-md",
                isCollapsed && "flex flex-col items-center gap-4 p-4 text-center"
              )}
            >
              <div
                className={cn(
                  "flex items-center gap-3",
                  isCollapsed && "flex-col gap-2"
                )}
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 text-white shadow-[0_10px_25px_rgba(12,60,128,0.45)]">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div
                  className={cn(
                    "flex flex-1 flex-col text-left",
                    isCollapsed && "items-center text-center"
                  )}
                >
                  <span
                    className={cn(
                      "text-sm font-semibold",
                      isCollapsed && "text-[10px] uppercase tracking-[0.45em] text-white/80"
                    )}
                  >
                    Vamos começar?
                  </span>
                  <span
                    className={cn(
                      "text-xs text-sky-100/80",
                      isCollapsed && "mt-1 text-[9px] uppercase tracking-[0.35em] text-white/60"
                    )}
                  >
                    Crie ou acompanhe tarefas com apenas alguns cliques.
                  </span>
                </div>
              </div>
              {isCollapsed ? (
                <button
                  type="button"
                  className="flex h-12 w-12 items-center justify-center rounded-[1.8rem] bg-gradient-to-br from-orange-400 via-pink-500 to-rose-500 text-2xl font-bold text-white shadow-[0_18px_48px_rgba(231,96,81,0.55)] transition hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-200/60"
                >
                  <span aria-hidden="true">+</span>
                  <span className="sr-only">Adicionar nova tarefa</span>
                </button>
              ) : (
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

function CollapsedSidebarHeader() {
  return (
    <div className="flex flex-col items-center gap-6">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-gradient-to-br from-sky-500/40 via-blue-500/50 to-indigo-500/50 text-white shadow-[0_16px_45px_rgba(18,60,138,0.55)]">
            <span className="text-base font-semibold">BC</span>
          </div>
          <span className="absolute -bottom-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full border border-slate-900/60 bg-emerald-400 shadow-[0_0_0_4px_rgba(8,30,82,0.85)]">
            <span className="sr-only">Status: online</span>
          </span>
        </div>
        <div className="flex flex-col items-center gap-3">
          <span className="text-[10px] font-semibold uppercase tracking-[0.45em] text-white/40">Main</span>
          <div className="relative flex h-16 w-16 flex-col items-center justify-center gap-1 rounded-[1.75rem] border border-white/15 bg-white/5 text-white shadow-[0_20px_50px_rgba(8,32,96,0.45)]">
            <span className="text-2xl font-semibold">88</span>
            <span className="text-[9px] uppercase tracking-[0.38em] text-white/60">Tasks</span>
            <span className="absolute -right-6 top-1/2 -translate-y-1/2 rounded-full border border-white/20 bg-white/10 px-2 py-1 text-[8px] font-semibold uppercase tracking-[0.45em] text-white/60 shadow-[0_10px_28px_rgba(6,30,92,0.45)]">
              Pro
            </span>
          </div>
        </div>
      </div>
      <div className="flex flex-col items-center gap-2">
        <span className="h-10 w-px rounded-full bg-white/15" aria-hidden="true" />
        <span className="h-6 w-px rounded-full bg-gradient-to-b from-white/40 via-white/15 to-transparent" aria-hidden="true" />
      </div>
    </div>
  );
}
