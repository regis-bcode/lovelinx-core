import { useState } from "react";

import { cn } from "@/lib/utils";

import { AppHeader } from "./AppHeader";
import { AppSidebar } from "./AppSidebar";
import { AppMobileNav } from "./AppMobileNav";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);

  return (
    <div className="relative min-h-screen bg-transparent">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(100%_100%_at_0%_0%,rgba(41,163,229,0.14),transparent),radial-gradient(90%_140%_at_80%_0%,rgba(11,46,90,0.32),transparent),radial-gradient(120%_120%_at_20%_80%,rgba(255,122,69,0.12),transparent)]" />

      <AppSidebar isCollapsed={isSidebarCollapsed} onCollapseChange={setIsSidebarCollapsed} />

      <div
        className={cn(
          "relative z-10 flex min-h-screen flex-col transition-[padding] duration-300 ease-in-out",
          isSidebarCollapsed ? "lg:pl-20" : "lg:pl-80"
        )}
      >
        <AppMobileNav />

        <header className="sticky top-0 z-30 bg-white/80 px-4 pb-6 pt-4 backdrop-blur-sm supports-[backdrop-filter]:bg-white/60 dark:bg-background/80 dark:backdrop-blur">
          <div className="mx-auto w-full max-w-7xl lg:px-4">
            <AppHeader />
          </div>
        </header>

        <div className="relative z-10 flex-1 overflow-y-auto overflow-x-hidden">
          <div className="absolute inset-0 -z-10 bg-[linear-gradient(140deg,rgba(255,255,255,0.7),rgba(227,239,255,0.65))] dark:bg-[linear-gradient(140deg,rgba(6,20,46,0.92),rgba(11,33,63,0.88))]" />
          <div className="relative mx-auto w-full max-w-7xl px-6 pb-12 pt-10 lg:px-12">
            <div className="grid gap-10">{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
