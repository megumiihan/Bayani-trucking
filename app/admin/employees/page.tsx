import { getEmployees } from "@/lib/queries/employees";
import { getShipments } from "@/lib/queries/shipments";
import AdminEmployeesOverview from "@/components/views/AdminEmployeesOverview";

export const dynamic = "force-dynamic";

export default async function AdminEmployeesPage() {
  const [employees, shipments] = await Promise.all([
    getEmployees(),
    getShipments(),
  ]);

  return (
    <AdminEmployeesOverview
      initialEmployees={employees}
      initialShipments={shipments}
    />
  );
}
