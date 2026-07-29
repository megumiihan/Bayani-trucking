import { notFound } from "next/navigation";
import { getEmployeeById } from "@/lib/queries/employees";
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

  const [employee, shipments] = await Promise.all([
    getEmployeeById(id),
    getShipments(),
  ]);

  if (!employee) {
    notFound();
  }

  return (
    <AdminEmployeeDetail employee={employee} initialShipments={shipments} />
  );
}
