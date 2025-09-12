import { useState } from "react"
import { Calendar, Home, Settings, Users, FileText, BarChart, FolderKanban, PanelLeftClose, PanelLeftOpen } from "lucide-react"
import { NavLink, useLocation } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { WorkspaceTree } from "./WorkspaceTree"
import { useSidebarContext } from "./DashboardLayout"

const navigation = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: Home,
  },
  {
    title: "Workspaces",
    url: "/workspaces",
    icon: FolderKanban,
  },
  {
    title: "Projetos",
    url: "/projects",
    icon: FolderKanban,
  },
  {
    title: "Equipe",
    url: "/team",
    icon: Users,
  },
  {
    title: "Relatórios",
    url: "/reports",
    icon: BarChart,
  },
  {
    title: "Calendário",
    url: "/calendar",
    icon: Calendar,
  },
  {
    title: "Documentos",
    url: "/documents",
    icon: FileText,
  },
]

const settingsNav = [
  {
    title: "Configurações",
    url: "/settings",
    icon: Settings,
  },
]

const MenuItemWithTooltip = ({ item, isActive, isCollapsed }: { item: any, isActive: boolean, isCollapsed: boolean }) => {
  const content = (
    <NavLink
      to={item.url}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
          isActive
            ? "bg-muted text-primary font-medium"
            : "hover:bg-muted/50"
        }`
      }
    >
      <item.icon className="h-4 w-4 flex-shrink-0" />
      {!isCollapsed && <span>{item.title}</span>}
    </NavLink>
  );

  if (isCollapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          {content}
        </TooltipTrigger>
        <TooltipContent side="right" className="z-50">
          <p>{item.title}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return content;
};

export function AppSidebar() {
  const { isCollapsed, toggleSidebar } = useSidebarContext();
  const location = useLocation();

  return (
    <TooltipProvider>
      <div className="border-r h-full flex flex-col bg-background">
        {/* Header */}
        <div className="border-b px-4 py-3">
          <div className="flex items-center justify-between">
            <div className={`flex items-center gap-2 transition-all duration-200 ${isCollapsed ? 'justify-center' : ''}`}>
              {isCollapsed ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary/70 rounded-lg flex items-center justify-center flex-shrink-0">
                      <span className="text-primary-foreground font-bold text-sm">PM</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="z-50">
                    <p>Project Manager</p>
                  </TooltipContent>
                </Tooltip>
              ) : (
                <>
                  <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary/70 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-primary-foreground font-bold text-sm">PM</span>
                  </div>
                  <span className="font-semibold text-sm bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                    Project Manager
                  </span>
                </>
              )}
            </div>
            {!isCollapsed ? (
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleSidebar}
                className="h-8 w-8 hover:bg-accent/50"
                title="Recolher sidebar"
              >
                <PanelLeftClose className="h-4 w-4" />
              </Button>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggleSidebar}
                    className="h-8 w-8 hover:bg-accent/50"
                  >
                    <PanelLeftOpen className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right" className="z-50">
                  <p>Expandir sidebar</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-2">
          {/* Navegação Principal */}
          <div className="mb-6">
            <div className="px-2 mb-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {!isCollapsed ? "Navegação" : "N"}
              </span>
            </div>
            <div className="space-y-1">
              {navigation.slice(0, 2).map((item) => (
                <MenuItemWithTooltip
                  key={item.title}
                  item={item}
                  isActive={location.pathname === item.url}
                  isCollapsed={isCollapsed}
                />
              ))}
            </div>
          </div>

          {/* Workspace Tree */}
          <div className="mb-6">
            <div className="px-2 mb-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {!isCollapsed ? "Meus Workspaces" : "WS"}
              </span>
            </div>
            <WorkspaceTree collapsed={isCollapsed} />
          </div>

          {/* Ferramentas */}
          <div className="mb-6">
            <div className="px-2 mb-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {!isCollapsed ? "Ferramentas" : "T"}
              </span>
            </div>
            <div className="space-y-1">
              {navigation.slice(2).map((item) => (
                <MenuItemWithTooltip
                  key={item.title}
                  item={item}
                  isActive={location.pathname === item.url}
                  isCollapsed={isCollapsed}
                />
              ))}
            </div>
          </div>

          {/* Configurações */}
          <div className="mb-6">
            <div className="px-2 mb-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {!isCollapsed ? "Configurações" : "C"}
              </span>
            </div>
            <div className="space-y-1">
              {settingsNav.map((item) => (
                <MenuItemWithTooltip
                  key={item.title}
                  item={item}
                  isActive={location.pathname === item.url}
                  isCollapsed={isCollapsed}
                />
              ))}
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="border-t p-2">
          {isCollapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleSidebar}
                  className="w-full h-10 hover:bg-accent/50"
                >
                  <PanelLeftOpen className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right" className="z-50">
                <p>Expandir sidebar</p>
              </TooltipContent>
            </Tooltip>
          ) : (
            <div className="flex items-center justify-between px-2">
              <span className="text-xs text-muted-foreground">Arraste a borda →</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleSidebar}
                className="h-8 w-8 hover:bg-accent/50"
                title="Recolher sidebar"
              >
                <PanelLeftClose className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}