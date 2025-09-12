import { useState, createContext, useContext } from "react";
import { AppSidebar } from "./AppSidebar";
import { AppHeader } from "./AppHeader";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

interface SidebarContextType {
  isCollapsed: boolean;
  toggleSidebar: () => void;
}

const SidebarContext = createContext<SidebarContextType | null>(null);

export const useSidebarContext = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebarContext must be used within SidebarContext");
  }
  return context;
};

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [sidebarSize, setSidebarSize] = useState(20);

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
    setSidebarSize(isCollapsed ? 20 : 4);
  };

  return (
    <SidebarContext.Provider value={{ isCollapsed, toggleSidebar }}>
      <div className="flex min-h-screen w-full bg-gradient-to-br from-background via-background to-muted/5">
        <ResizablePanelGroup 
          direction="horizontal" 
          className="min-h-screen"
          onLayout={(sizes) => {
            const [sidebarSize] = sizes;
            if (sidebarSize < 8) {
              setIsCollapsed(true);
            } else if (sidebarSize > 12) {
              setIsCollapsed(false);
            }
            setSidebarSize(sidebarSize);
          }}
        >
          <ResizablePanel 
            defaultSize={20} 
            minSize={3} 
            maxSize={35}
            className={isCollapsed ? "min-w-[60px]" : "min-w-[240px]"}
          >
            <AppSidebar />
          </ResizablePanel>
          
          <ResizableHandle className="w-1 bg-border hover:bg-primary/20 transition-colors cursor-col-resize" />
          
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
    </SidebarContext.Provider>
  );
}