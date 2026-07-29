import AdminEmployeeDetail from "@/components/views/AdminEmployeeDetail";

interface EmployeeDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function EmployeeDetailPage({ params }: EmployeeDetailPageProps) {
  const { id } = await params;
  return <AdminEmployeeDetail employeeId={id} />;
}
