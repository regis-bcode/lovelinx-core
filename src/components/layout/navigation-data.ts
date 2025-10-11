import type { LucideIcon } from "lucide-react";
import { BarChart, Building2, Calendar, CheckCircle, FileText, FolderKanban, Grid3x3, Home, Map, Package, Settings, Tags, Users } from "lucide-react";

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
];

export const settingsNav: SettingsItem[] = [
  {
    title: "Configurações",
    url: "/settings",
    icon: Settings,
  },
];
