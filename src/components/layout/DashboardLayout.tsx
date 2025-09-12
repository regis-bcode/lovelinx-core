import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { AppHeader } from "./AppHeader";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen w-full bg-gradient-to-br from-background via-background to-muted/5">
        <ResizablePanelGroup direction="horizontal" className="min-h-screen">
          <ResizablePanel 
            defaultSize={20} 
            minSize={15} 
            maxSize={35}
            className="min-w-[240px]"
          >
            <AppSidebar />
          </ResizablePanel>
          
          <ResizableHandle className="w-1 bg-border hover:bg-accent transition-colors" />
          
          <ResizablePanel defaultSize={80} minSize={65}>
            <div className="flex flex-col h-full overflow-hidden">
              <AppHeader />
              <main className="flex-1 overflow-y-auto bg-gradient-to-b from-background to-muted/5">
                <div className="container mx-auto p-6 max-w-7xl">
                  {children}
                </div>
              </main>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </SidebarProvider>
  );
}