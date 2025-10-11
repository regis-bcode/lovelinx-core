import { Link } from "react-router-dom";
import {
  Building2,
  CheckCircle,
  Grid3x3,
  Map,
  Package,
  Settings as SettingsIcon,
  Tags,
  Users
} from "lucide-react";

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

const settingsSections = [
  {
    title: "Usuários",
    description: "Gerencie perfis, permissões e acessos da equipe.",
    icon: Users,
    href: "/settings/users"
  },
  {
    title: "Clientes",
    description: "Atualize informações e contatos dos clientes.",
    icon: Building2,
    href: "/settings/clients"
  },
  {
    title: "Produtos",
    description: "Organize o catálogo de produtos disponíveis.",
    icon: Package,
    href: "/settings/products"
  },
  {
    title: "Serviços",
    description: "Configure os serviços oferecidos aos clientes.",
    icon: Package,
    href: "/settings/services"
  },
  {
    title: "Status",
    description: "Defina e personalize os status dos projetos.",
    icon: CheckCircle,
    href: "/settings/status"
  },
  {
    title: "Módulos",
    description: "Controle os módulos disponíveis na plataforma.",
    icon: Grid3x3,
    href: "/settings/modulos"
  },
  {
    title: "Áreas",
    description: "Estruture as áreas responsáveis pelos projetos.",
    icon: Map,
    href: "/settings/areas"
  },
  {
    title: "Categorias",
    description: "Classifique informações com categorias personalizadas.",
    icon: Tags,
    href: "/settings/categorias"
  }
];

export default function Settings() {
  return (
    <DashboardLayout>
      <div className="flex flex-col gap-8">
        <div className="flex flex-col gap-2">
          <div className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.32em] text-primary/70">
            <SettingsIcon className="h-4 w-4" />
            <span>Central de Configurações</span>
          </div>
          <h1 className="text-3xl font-bold text-primary">Configurações</h1>
          <p className="max-w-2xl text-base text-muted-foreground">
            Acesse todas as configurações administrativas da plataforma em um único lugar e mantenha a operação alinhada às
            necessidades da sua organização.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {settingsSections.map((section) => (
            <Link
              key={section.title}
              to={section.href}
              className="group"
            >
              <Card className="h-full transition-all duration-300 group-hover:-translate-y-1 group-hover:border-primary/40 group-hover:shadow-[0_20px_45px_rgba(12,74,110,0.15)]">
                <CardHeader className="flex flex-row items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary transition group-hover:bg-primary group-hover:text-primary-foreground">
                    <section.icon className="h-6 w-6" />
                  </div>
                  <div className="space-y-1">
                    <CardTitle className="text-xl">{section.title}</CardTitle>
                    <CardDescription>{section.description}</CardDescription>
                  </div>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
