import { getEmployees } from "@/lib/queries/employees";
import { getTrucks } from "@/lib/queries/trucks";
import ShipmentInputForm from "@/components/forms/ShipmentInputForm";

export const dynamic = "force-dynamic";

export default async function NewShipmentPage() {
  const [employees, trucks] = await Promise.all([
    getEmployees(),
    getTrucks(),
  ]);

  return <ShipmentInputForm employees={employees} trucks={trucks} />;
}
