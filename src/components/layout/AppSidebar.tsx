import { useState } from "react";
import { NavLink } from "react-router-dom";
import { ChevronDown } from "lucide-react";

import { navigation, settingsNav } from "./navigation-data";
import { WorkspaceTree } from "./WorkspaceTree";
import { cn } from "@/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

const mainNavigation = navigation.slice(0, 2);
const toolsNavigation = navigation.slice(2);

export function AppSidebar() {
  const [isNavigationOpen, setIsNavigationOpen] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(true);

  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    cn(
      "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition duration-200",
      isActive
        ? "bg-white/15 text-white shadow-[0_12px_35px_rgba(0,0,0,0.35)]"
        : "text-white/70 hover:bg-white/10 hover:text-white"
    );

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-80 flex-col overflow-hidden border-r border-white/10 bg-[radial-gradient(120%_120%_at_0%_0%,#1C6DD1,transparent),radial-gradient(120%_120%_at_100%_0%,rgba(12,39,89,0.95),rgba(8,24,54,0.95))] text-white shadow-2xl lg:flex">
      <div className="flex items-center gap-3 px-7 pt-8">
        <img
          src="/baumgratz-code-mark.svg"
          alt="Baumfratz Code"
          className="h-12 w-12 flex-shrink-0 drop-shadow-[0_8px_18px_rgba(41,163,229,0.35)]"
        />
        <div className="flex flex-col leading-tight">
          <span className="text-[11px] font-semibold uppercase tracking-[0.48em] text-white/70">
            Baumfratz
          </span>
          <span className="text-xl font-semibold text-orange-300">CODE</span>
          <span className="text-[10px] font-medium uppercase tracking-[0.36em] text-white/60">
            Painel de Projetos
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col overflow-y-auto px-6 pb-6 pt-8">
        <SidebarCollapsibleSection
          title="Navegação"
          open={isNavigationOpen}
          onOpenChange={setIsNavigationOpen}
        >
          <div className="flex flex-col gap-2">
            {mainNavigation.map((item) => (
              <NavLink key={item.title} to={item.url} end className={({ isActive }) => getNavCls({ isActive })}>
                <item.icon className="h-4 w-4" />
                <span>{item.title}</span>
              </NavLink>
            ))}
          </div>
        </SidebarCollapsibleSection>

        <SidebarSection title="Meus Workspaces" className="mt-8">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-[0_15px_45px_rgba(0,0,0,0.25)]">
            <WorkspaceTree collapsed={false} />
          </div>
        </SidebarSection>

        <SidebarSection title="Ferramentas" className="mt-8">
          <div className="flex flex-col gap-2">
            {toolsNavigation.map((item) => (
              <NavLink key={item.title} to={item.url} end className={({ isActive }) => getNavCls({ isActive })}>
                <item.icon className="h-4 w-4" />
                <span>{item.title}</span>
              </NavLink>
            ))}
          </div>
        </SidebarSection>
      </div>

      <div className="border-t border-white/10 px-6 py-6">
        <SidebarCollapsibleSection
          title="Configurações"
          open={isSettingsOpen}
          onOpenChange={setIsSettingsOpen}
        >
          <div className="flex flex-col gap-2">
            {settingsNav.map((item) => (
              <NavLink key={item.title} to={item.url} end className={({ isActive }) => getNavCls({ isActive })}>
                <item.icon className="h-4 w-4" />
                <span>{item.title}</span>
              </NavLink>
            ))}
          </div>
        </SidebarCollapsibleSection>
      </div>
    </aside>
  );
}

interface SidebarSectionProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

function SidebarSection({ title, children, className }: SidebarSectionProps) {
  return (
    <section className={cn("w-full", className)}>
      <p className="text-xs font-semibold uppercase tracking-[0.32em] text-white/50">{title}</p>
      <div className="mt-4">{children}</div>
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
}: SidebarCollapsibleSectionProps) {
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
