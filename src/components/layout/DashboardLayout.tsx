import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { AppSidebar } from "./AppSidebar";
import { AppHeader } from "./AppHeader";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-gradient-to-br from-background via-background to-muted/5">
        <ResizablePanelGroup direction="horizontal" className="min-h-screen">
          <ResizablePanel defaultSize={20} minSize={15} maxSize={30} className="min-w-[200px]">
            <AppSidebar />
          </ResizablePanel>
          
          <ResizableHandle withHandle className="w-1 bg-border hover:bg-accent-foreground/20 transition-colors" />
          
          <ResizablePanel defaultSize={80} className="flex flex-col">
            <header className="h-12 flex items-center border-b bg-background/80 backdrop-blur-sm px-4">
              <SidebarTrigger className="mr-4" />
              <AppHeader />
            </header>
            
            <main className="flex-1 overflow-y-auto bg-gradient-to-b from-background to-muted/5">
              <div className="container mx-auto p-6 max-w-7xl">
                {children}
              </div>
            </main>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </SidebarProvider>
  );
}