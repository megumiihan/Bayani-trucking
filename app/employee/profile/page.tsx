import { getEmployees } from "@/lib/queries/employees";
import { getShipments } from "@/lib/queries/shipments";
import EmployeeProfile from "@/components/views/EmployeeProfile";

export const dynamic = "force-dynamic";

export default async function EmployeeProfilePage() {
  const [shipments, employees] = await Promise.all([
    getShipments(),
    getEmployees(),
  ]);

  return (
    <EmployeeProfile initialShipments={shipments} initialEmployees={employees} />
  );
}
