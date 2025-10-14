import { useState } from "react";
import { NavLink } from "react-router-dom";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";

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
      "group flex items-center rounded-xl text-sm font-semibold transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40",
      isCollapsed ? "h-11 w-11 justify-center" : "w-full justify-start gap-3 px-4 py-3",
      isActive
        ? "border border-white/25 bg-white/15 text-white shadow-[0_15px_45px_rgba(0,0,0,0.35)] backdrop-blur-sm"
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
          "flex items-center gap-3 px-7 pt-8 transition-all duration-300",
          isCollapsed && "justify-center px-4"
        )}
      >
        <img
          src="/baumgratz-code-mark.svg"
          alt="Baumfratz Code"
          className="h-12 w-12 flex-shrink-0 drop-shadow-[0_8px_18px_rgba(41,163,229,0.35)]"
        />
        <div
          className={cn(
            "flex flex-col leading-tight transition-opacity duration-200",
            isCollapsed ? "pointer-events-none opacity-0" : "opacity-100"
          )}
        >
          <span className="text-[11px] font-semibold uppercase tracking-[0.48em] text-white/70">Baumfratz</span>
          <span className="text-xl font-semibold text-orange-300">CODE</span>
          <span className="text-[10px] font-medium uppercase tracking-[0.36em] text-white/60">
            Painel de Projetos
          </span>
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
            <SidebarCollapsibleSection
              title="Navegação"
              open={isNavigationOpen}
              onOpenChange={setIsNavigationOpen}
              collapsed={isCollapsed}
            >
              <div
                className={cn(
                  "rounded-2xl border border-white/10 bg-white/5 shadow-[0_18px_45px_rgba(0,0,0,0.28)]",
                  isCollapsed ? "p-2" : "p-4"
                )}
              >
                <div
                  className={cn(
                    "flex flex-col gap-1",
                    isCollapsed && "items-center gap-2"
                  )}
                >
                  {mainNavigation.map((item) => (
                    <Tooltip key={item.title}>
                      <TooltipTrigger asChild>
                        <NavLink to={item.url} end className={({ isActive }) => getNavCls({ isActive })}>
                          <item.icon className="h-4 w-4 shrink-0" />
                          <span
                            className={cn(
                              "flex-1 whitespace-nowrap text-left transition-opacity",
                              isCollapsed && "sr-only"
                            )}
                          >
                            {item.title}
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
              title="Meus Workspaces"
              className="mt-8"
              open={isWorkspacesOpen}
              onOpenChange={setIsWorkspacesOpen}
              collapsed={isCollapsed}
            >
              <div
                className={cn(
                  "rounded-2xl border border-white/10 bg-white/5 p-4 shadow-[0_15px_45px_rgba(0,0,0,0.25)]",
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
                  isCollapsed && "items-center"
                )}
              >
                {toolsNavigation.map((item) => (
                  <Tooltip key={item.title}>
                    <TooltipTrigger asChild>
                      <NavLink to={item.url} end className={({ isActive }) => getNavCls({ isActive })}>
                        <item.icon className="h-4 w-4 shrink-0" />
                        <span
                          className={cn(
                            "flex-1 whitespace-nowrap text-left transition-opacity",
                            isCollapsed && "sr-only"
                          )}
                        >
                          {item.title}
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
                  isCollapsed && "items-center"
                )}
              >
                {settingsNav.map((item) => (
                  <Tooltip key={item.title}>
                    <TooltipTrigger asChild>
                      <NavLink to={item.url} end className={({ isActive }) => getNavCls({ isActive })}>
                        <item.icon className="h-4 w-4 shrink-0" />
                        <span
                          className={cn(
                            "flex-1 whitespace-nowrap text-left transition-opacity",
                            isCollapsed && "sr-only"
                          )}
                        >
                          {item.title}
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
