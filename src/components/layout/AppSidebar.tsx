import { Calendar, Home, Settings, Users, FileText, BarChart, FolderKanban, Building2, Package, CheckCircle, Grid3x3, Map, Tags } from "lucide-react"
import { NavLink, useLocation } from "react-router-dom"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar"
import { TooltipProvider } from "@/components/ui/tooltip"
import { WorkspaceTree } from "./WorkspaceTree"
import { cn } from "@/lib/utils"

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
    title: "Usuários",
    url: "/users", 
    icon: Users,
  },
  {
    title: "Clientes",
    url: "/clients", 
    icon: Building2,
  },
  {
    title: "Produtos",
    url: "/products", 
    icon: Package,
  },
  {
    title: "Serviços",
    url: "/services", 
    icon: Package,
  },
  {
    title: "Status",
    url: "/status", 
    icon: CheckCircle,
  },
  {
    title: "Módulos",
    url: "/modulos", 
    icon: Grid3x3,
  },
  {
    title: "Áreas",
    url: "/areas", 
    icon: Map,
  },
  {
    title: "Categorias",
    url: "/categorias", 
    icon: Tags,
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

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;

  const isActive = (path: string) => currentPath === path;
  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    cn(
      "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-300",
      isActive
        ? "bg-white/10 text-white shadow-[0_18px_40px_rgba(4,20,45,0.35)] ring-1 ring-white/20 backdrop-blur"
        : "text-sidebar-foreground/80 hover:bg-white/5 hover:text-white"
    );

  return (
    <TooltipProvider>
      <Sidebar
        collapsible="icon"
        className="relative overflow-hidden border-r border-sidebar-border bg-sidebar text-sidebar-foreground"
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_120%_at_0%_0%,rgba(41,163,229,0.18),transparent),radial-gradient(120%_120%_at_100%_0%,rgba(255,122,69,0.12),transparent)]" />
        <div className="relative flex h-20 items-center border-b border-white/10 px-4">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src="/baumgratz-code-mark.svg"
              alt="Baumgratz Code"
              className="h-11 w-11 flex-shrink-0 drop-shadow-[0_6px_12px_rgba(41,163,229,0.35)]"
            />
            {state !== "collapsed" && (
              <div className="flex flex-col leading-tight text-white">
                <span className="text-xs font-semibold tracking-[0.48em] text-white/70 uppercase">Baumgratz</span>
                <span className="text-lg font-semibold text-orange-300">CODE</span>
                <span className="text-[10px] font-medium uppercase tracking-[0.36em] text-white/50">
                  Painéis Gerenciais
                </span>
              </div>
            )}
          </div>
        </div>

      <SidebarContent className="relative z-10 px-3 py-3">
        {/* Navegação Principal */}
        <SidebarGroup className="py-2">
          <div className="flex items-center justify-between px-2 py-1.5">
            {state !== "collapsed" && (
              <SidebarGroupLabel className="text-[10px] font-semibold uppercase tracking-[0.38em] text-white/45">
                Navegação
              </SidebarGroupLabel>
            )}
            <SidebarTrigger className="h-7 w-7 rounded-full border border-white/10 bg-white/5 text-white/70 transition hover:bg-white/10 hover:text-white" />
          </div>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {navigation.slice(0, 2).map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    className="w-full justify-start"
                  >
                    <NavLink to={item.url} end className={getNavCls}>
                      <item.icon className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate">{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Meus Workspaces */}
        <SidebarGroup className="py-2">
          <SidebarGroupLabel className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-[0.38em] text-white/45">
            Meus Workspaces
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <WorkspaceTree collapsed={state === "collapsed"} />
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Ferramentas */}
        <SidebarGroup className="py-2">
          <SidebarGroupLabel className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-[0.38em] text-white/45">
            Ferramentas
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {navigation.slice(2).map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    className="w-full justify-start"
                  >
                    <NavLink to={item.url} end className={getNavCls}>
                      <item.icon className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate">{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Configurações */}
        <SidebarGroup className="py-2">
          <SidebarGroupLabel className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-[0.38em] text-white/45">
            Configurações
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {settingsNav.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    className="w-full justify-start"
                  >
                    <NavLink to={item.url} end className={getNavCls}>
                      <item.icon className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate">{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
    </TooltipProvider>
  );
}