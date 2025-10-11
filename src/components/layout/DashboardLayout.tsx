import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { AppHeader } from "./AppHeader";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-transparent">
        <AppSidebar />

        <div className="relative flex min-h-screen flex-1 flex-col overflow-hidden">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(100%_100%_at_0%_0%,rgba(41,163,229,0.14),transparent),radial-gradient(90%_140%_at_80%_0%,rgba(11,46,90,0.32),transparent),radial-gradient(120%_120%_at_20%_80%,rgba(255,122,69,0.12),transparent)]" />

          <header className="relative z-20 flex h-20 items-center border-b border-white/40 bg-white/70 px-6 backdrop-blur-xl shadow-soft dark:border-white/10 dark:bg-background/80 lg:px-10">
            <AppHeader />
          </header>

          <main className="relative z-10 flex-1 overflow-y-auto overflow-x-hidden">
            <div className="absolute inset-0 -z-10 bg-[linear-gradient(140deg,rgba(255,255,255,0.7),rgba(227,239,255,0.65))] dark:bg-[linear-gradient(140deg,rgba(6,20,46,0.92),rgba(11,33,63,0.88))]" />
            <div className="relative mx-auto w-full max-w-7xl px-6 pb-12 pt-10 lg:px-12">
              <div className="grid gap-10">
                {children}
              </div>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}