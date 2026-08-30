import { getClients } from "@/lib/queries/clients";
import { getEmployees } from "@/lib/queries/employees";
import { getShipments } from "@/lib/queries/shipments";
import { getTrucks } from "@/lib/queries/trucks";
import HomePageClient from "@/components/views/HomePageClient";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [shipments, employees, trucks, clients] = await Promise.all([
    getShipments(),
    getEmployees(),
    getTrucks(),
    getClients(),
  ]);

  return (
    <HomePageClient
      initialShipments={shipments}
      employees={employees}
      trucks={trucks}
      clients={clients}
    />
  );
}
