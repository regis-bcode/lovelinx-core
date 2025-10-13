import { useState } from "react";

import { cn } from "@/lib/utils";

import { AppHeader } from "./AppHeader";
import { AppSidebar } from "./AppSidebar";
import { AppMobileNav } from "./AppMobileNav";
import { AppTopNav } from "./AppTopNav";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);

  const sharedWidthClasses = cn(
    "mx-auto w-full transition-[max-width] duration-300 ease-in-out",
    isSidebarCollapsed ? "max-w-none" : "max-w-7xl"
  );

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
          <div className={cn(sharedWidthClasses, "px-0 lg:px-4")}>
            <AppHeader />
          </div>
        </header>

        <div className="relative z-10 flex-1 overflow-y-auto overflow-x-hidden">
          <div className="absolute inset-0 -z-10 bg-[linear-gradient(140deg,rgba(255,255,255,0.7),rgba(227,239,255,0.65))] dark:bg-[linear-gradient(140deg,rgba(6,20,46,0.92),rgba(11,33,63,0.88))]" />
          <div
            className={cn(
              "relative w-full px-4 pb-14 pt-10 sm:px-6 lg:px-10",
              sharedWidthClasses
            )}
          >
            <div className="space-y-8">
              <AppTopNav />
              <div className="relative overflow-hidden rounded-[36px] border border-white/60 bg-white/80 p-6 shadow-[0_30px_80px_-40px_rgba(15,65,120,0.55)] backdrop-blur-2xl supports-[backdrop-filter]:bg-white/60 dark:border-white/10 dark:bg-background/80 sm:p-8 lg:p-10">
                <div className="pointer-events-none absolute inset-0 -z-10">
                  <div className="absolute -top-32 left-0 h-64 w-64 rounded-full bg-primary/15 blur-3xl" />
                  <div className="absolute -right-24 top-1/2 h-72 w-72 -translate-y-1/2 rounded-full bg-sky-400/10 blur-3xl" />
                  <div className="absolute bottom-0 left-1/3 h-44 w-44 rounded-full bg-orange-300/10 blur-3xl" />
                </div>
                <div className="relative z-10 grid gap-10">{children}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
