import { getEmployees } from "@/lib/queries/employees";
import { getTrucks } from "@/lib/queries/trucks";
import { getClients } from "@/lib/queries/clients";
import { getDestinationRoutes } from "@/lib/queries/routes";
import ShipmentInputForm from "@/components/forms/ShipmentInputForm";

export const dynamic = "force-dynamic";

export default async function NewShipmentPage() {
  const [employees, trucks, clients, routes] = await Promise.all([
    getEmployees(),
    getTrucks(),
    getClients(),
    getDestinationRoutes(),
  ]);

  return (
    <ShipmentInputForm
      employees={employees}
      trucks={trucks}
      clients={clients}
      routes={routes}
    />
  );
}
