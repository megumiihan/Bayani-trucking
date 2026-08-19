import { getEmployees } from "@/lib/queries/employees";
import { getTrucks } from "@/lib/queries/trucks";
import { getClients } from "@/lib/queries/clients";
import ShipmentInputForm from "@/components/forms/ShipmentInputForm";

export const dynamic = "force-dynamic";

export default async function NewShipmentPage() {
  const [employees, trucks, clients] = await Promise.all([
    getEmployees(),
    getTrucks(),
    getClients(),
  ]);

  return <ShipmentInputForm 
  employees={employees} 
  trucks={trucks} 
  clients={clients}
  />;
}
