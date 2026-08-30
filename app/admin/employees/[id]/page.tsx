import { notFound } from "next/navigation";
import { getEmployeeById } from "@/lib/queries/employees";
import { getSalaryPaymentsForEmployee } from "@/lib/queries/payments";
import { getShipments } from "@/lib/queries/shipments";
import AdminEmployeeDetail from "@/components/views/AdminEmployeeDetail";

export const dynamic = "force-dynamic";

interface EmployeeDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function EmployeeDetailPage({
  params,
}: EmployeeDetailPageProps) {
  const { id } = await params;

  const [employee, shipments, payments] = await Promise.all([
    getEmployeeById(id),
    getShipments(),
    getSalaryPaymentsForEmployee(id),
  ]);

  if (!employee) {
    notFound();
  }

  return (
    <AdminEmployeeDetail
      employee={employee}
      initialShipments={shipments}
      initialPayments={payments}
    />
  );
}
