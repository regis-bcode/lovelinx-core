import { NavLink } from "react-router-dom";
import { ChevronDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { WorkspaceTree } from "./WorkspaceTree";
import { navigation, settingsNav } from "./navigation-data";
import { cn } from "@/lib/utils";

export function AppTopMenu() {
  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    cn(
      "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors duration-200 whitespace-nowrap",
      isActive
        ? "bg-primary text-primary-foreground shadow-[0_12px_30px_rgba(12,74,110,0.25)]"
        : "text-primary/70 hover:bg-primary/10 hover:text-primary"
    );

  return (
    <div className="border-b border-white/40 bg-white/90 shadow-soft backdrop-blur supports-[backdrop-filter]:bg-white/75 dark:border-white/10 dark:bg-background/80">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-6 py-4 lg:flex-row lg:items-center lg:justify-between lg:gap-6 lg:px-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6 lg:flex-1">
          <div className="flex items-center gap-3">
            <img
              src="/baumgratz-code-mark.svg"
              alt="Baumfratz Code"
              className="h-11 w-11 flex-shrink-0 drop-shadow-[0_6px_12px_rgba(41,163,229,0.35)]"
            />
            <div className="flex flex-col leading-tight text-primary">
              <span className="text-xs font-semibold uppercase tracking-[0.48em] text-primary/60">Baumfratz</span>
              <span className="text-lg font-semibold text-orange-500">CODE</span>
              <span className="text-[10px] font-medium uppercase tracking-[0.36em] text-primary/50">
                Painel de Projetos
              </span>
            </div>
          </div>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="inline-flex items-center gap-2 rounded-full border-primary/20 bg-white/80 px-5 py-2 text-sm font-medium text-primary shadow-soft hover:border-primary/40 hover:bg-white"
              >
                <span>Workspaces</span>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[320px] p-0" align="start">
              <div className="max-h-[420px] overflow-y-auto p-3">
                <WorkspaceTree collapsed={false} />
              </div>
            </PopoverContent>
          </Popover>
        </div>

        <div className="flex flex-col gap-3 lg:flex-1">
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {navigation.map((item) => (
              <NavLink key={item.title} to={item.url} end className={({ isActive }) => getNavCls({ isActive })}>
                <item.icon className="h-4 w-4" />
                <span>{item.title}</span>
              </NavLink>
            ))}
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 md:justify-end">
            {settingsNav.map((item) => (
              <NavLink key={item.title} to={item.url} end className={({ isActive }) => getNavCls({ isActive })}>
                <item.icon className="h-4 w-4" />
                <span>{item.title}</span>
              </NavLink>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
