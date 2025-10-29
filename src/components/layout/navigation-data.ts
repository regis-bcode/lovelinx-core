import type { LucideIcon } from "lucide-react";
import {
  Building2,
  Calendar,
  CheckCircle,
  FileText,
  GanttChart,
  LayoutDashboard,
  LineChart,
  ClipboardList,
  Map,
  Package,
  PanelsTopLeft,
  Settings,
  SquareStack,
  Tag,
  UserCog,
  UserSearch,
  Users,
  Workflow,
  Wrench
} from "lucide-react";

type NavigationItem = {
  title: string;
  url: string;
  icon: LucideIcon;
};

type SettingsItem = NavigationItem;

export const navigation: NavigationItem[] = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Workspaces",
    url: "/workspaces",
    icon: PanelsTopLeft,
  },
  {
    title: "Projetos",
    url: "/projects",
    icon: GanttChart,
  },
  {
    title: "Gestão de Tarefas",
    url: "/task-management",
    icon: ClipboardList,
  },
  {
    title: "Equipe",
    url: "/team",
    icon: Users,
  },
  {
    title: "Relatórios",
    url: "/reports",
    icon: LineChart,
  },
  {
    title: "Calendário",
    url: "/calendar",
    icon: Calendar,
  },
  {
    title: "Convidados",
    url: "/calendar/guests",
    icon: UserSearch,
  },
  {
    title: "Documentos",
    url: "/documents",
    icon: FileText,
  },
];

export const settingsNav: SettingsItem[] = [
  {
    title: "Configurações",
    url: "/settings",
    icon: Settings,
  },
  {
    title: "Usuários",
    url: "/settings/users",
    icon: UserCog,
  },
  {
    title: "Clientes",
    url: "/settings/clients",
    icon: Building2,
  },
  {
    title: "Produtos",
    url: "/settings/products",
    icon: Package,
  },
  {
    title: "Serviços",
    url: "/settings/services",
    icon: Wrench,
  },
  {
    title: "Status",
    url: "/settings/status",
    icon: CheckCircle,
  },
  {
    title: "Módulos",
    url: "/settings/modulos",
    icon: SquareStack,
  },
  {
    title: "Áreas",
    url: "/settings/areas",
    icon: Map,
  },
  {
    title: "Categorias",
    url: "/settings/categorias",
    icon: Tag,
  },
  {
    title: "Etapas do Projeto",
    url: "/settings/project-stages",
    icon: Workflow,
  },
];
