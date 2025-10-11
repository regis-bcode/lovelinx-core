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
      "group inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 shrink-0",
      isActive
        ? "bg-primary text-primary-foreground shadow-[0_12px_30px_rgba(12,74,110,0.25)]"
        : "text-primary/70 hover:bg-primary/10 hover:text-primary"
    );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="inline-flex items-center gap-2 rounded-full border-primary/20 bg-white/70 text-primary hover:border-primary/40 hover:bg-white"
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

        <div className="flex flex-1 gap-2 overflow-x-auto pb-1">
          {navigation.map((item) => (
            <NavLink key={item.title} to={item.url} end className={({ isActive }) => getNavCls(isActive)}>
              <item.icon className="h-4 w-4" />
              <span>{item.title}</span>
            </NavLink>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {settingsNav.map((item) => (
          <NavLink key={item.title} to={item.url} end className={({ isActive }) => getNavCls(isActive)}>
            <item.icon className="h-4 w-4" />
            <span>{item.title}</span>
          </NavLink>
        ))}
      </div>
    </div>
  );
}
