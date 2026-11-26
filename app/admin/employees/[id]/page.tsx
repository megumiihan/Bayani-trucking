import { notFound } from "next/navigation";
import { requirePageRole } from "@/lib/auth";
import { getEmployeeById, getEmployeeLoginEmail } from "@/lib/queries/employees";
import { getGovernmentIds } from "@/lib/queries/governmentIds";
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
  const viewer = await requirePageRole(["admin", "secretary"]);
  const isAdmin = viewer.role === "admin";
  const { id } = await params;

  const [employee, shipments, payments, loginEmail, governmentIds] = await Promise.all([
    getEmployeeById(id),
    getShipments(),
    getSalaryPaymentsForEmployee(id),
    isAdmin ? getEmployeeLoginEmail(id) : Promise.resolve(null),
    getGovernmentIds(id),
  ]);

  if (!employee) {
    notFound();
  }

  return (
    <AdminEmployeeDetail
      employee={employee}
      initialShipments={shipments}
      initialPayments={payments}
      loginEmail={loginEmail}
      governmentIds={governmentIds}
      // Secretaries may switch other drivers and helpers; the Secretary role stays admin-only.
      canSecretaryEditRole={
        !isAdmin && viewer.employeeId !== employee.id && employee.role !== "Secretary"
      }
    />
  );
}
