import { ClientList } from "@/components/clients/ClientList";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

export default function Clients() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Clientes</h1>
          <p className="text-muted-foreground">
            Gerencie o cadastro de clientes do sistema
          </p>
        </div>

        <ClientList />
      </div>
    </DashboardLayout>
  );
}