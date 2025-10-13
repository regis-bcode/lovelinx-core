import { NavLink } from "react-router-dom";
import { ChevronDown } from "lucide-react";

import { navigation, settingsNav } from "./navigation-data";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { WorkspaceTree } from "./WorkspaceTree";

export function AppTopNav() {
  const getNavCls = (isActive: boolean) =>
    cn(
      "inline-flex shrink-0 items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold transition-all duration-200 whitespace-nowrap",
      isActive
        ? "bg-gradient-to-r from-[#29A3E5] via-[#5C8EFF] to-[#83A2FF] text-white shadow-[0_18px_40px_rgba(15,65,120,0.45)]"
        : "text-white/70 hover:bg-white/10 hover:text-white"
    );

  return (
    <div className="relative overflow-hidden rounded-[44px] border border-white/25 bg-white/10 p-4 text-white shadow-[0_30px_80px_-40px_rgba(9,30,70,0.9)] backdrop-blur-xl dark:border-white/10 dark:bg-background/60">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[linear-gradient(140deg,rgba(20,54,110,0.95),rgba(41,163,229,0.7))] opacity-90" />
        <div className="absolute -left-24 top-[-30%] h-48 w-48 rounded-full bg-[#29A3E5]/45 blur-3xl" />
        <div className="absolute right-[-12%] top-1/2 h-40 w-40 -translate-y-1/2 rounded-full bg-white/25 blur-3xl" />
        <div className="absolute bottom-[-35%] left-1/3 h-44 w-44 rounded-full bg-[#FFB56B]/40 blur-[110px]" />
      </div>
      <div className="relative z-10 flex flex-col gap-4 md:flex-row md:flex-wrap md:items-center md:justify-between md:gap-6">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="inline-flex items-center gap-2 rounded-full border-white/30 bg-white/10 px-5 py-2 text-sm font-semibold text-white shadow-[0_18px_45px_rgba(9,40,95,0.35)] backdrop-blur transition hover:border-white/50 hover:bg-white/20"
            >
              <span>Workspaces</span>
              <ChevronDown className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="w-[320px] border border-white/20 bg-white/95 p-0 text-foreground shadow-xl backdrop-blur dark:border-white/10 dark:bg-background/95"
            align="start"
          >
            <div className="max-h-[420px] overflow-y-auto p-3">
              <WorkspaceTree collapsed={false} />
            </div>
          </PopoverContent>
        </Popover>

        <div className="flex-1">
          <div className="flex flex-wrap items-center justify-center gap-2 pb-1 md:justify-start">
            {navigation.map((item) => (
              <NavLink key={item.title} to={item.url} end className={({ isActive }) => getNavCls(isActive)}>
                <item.icon className="h-4 w-4" />
                <span>{item.title}</span>
              </NavLink>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2 pb-1 md:flex-none md:justify-end">
          {settingsNav.map((item) => (
            <NavLink key={item.title} to={item.url} end className={({ isActive }) => getNavCls(isActive)}>
              <item.icon className="h-4 w-4" />
              <span>{item.title}</span>
            </NavLink>
          ))}
        </div>
      </div>
    </div>
  );
}
