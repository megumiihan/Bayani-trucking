import { getEmployees } from "@/lib/queries/employees";
import { getSalaryPayments } from "@/lib/queries/payments";
import { getShipments } from "@/lib/queries/shipments";
import EmployeeProfile from "@/components/views/EmployeeProfile";

export const dynamic = "force-dynamic";

export default async function EmployeeProfilePage() {
  const [shipments, employees, payments] = await Promise.all([
    getShipments(),
    getEmployees(),
    getSalaryPayments(),
  ]);

  return (
    <EmployeeProfile
      initialShipments={shipments}
      initialEmployees={employees}
      initialPayments={payments}
    />
  );
}
