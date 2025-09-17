import { ClientList } from "@/components/clients/ClientList";

export default function Clients() {
  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Clientes</h1>
        <p className="text-muted-foreground">
          Gerencie o cadastro de clientes do sistema
        </p>
      </div>

      <ClientList />
    </div>
  );
}