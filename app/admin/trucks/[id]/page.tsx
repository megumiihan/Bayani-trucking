import { requireTruckPageAccess } from "@/lib/auth";
import { notFound } from "next/navigation";
import { getMaintenanceConfig, getTruckDetail } from "@/lib/queries/trucks";
import AdminTruckDetail from "@/components/views/AdminTruckDetail";

export const dynamic = "force-dynamic";

interface TruckDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function TruckDetailPage({ params }: TruckDetailPageProps) {
  const user = await requireTruckPageAccess();
  const { id } = await params;
  const [detail, config] = await Promise.all([getTruckDetail(id), getMaintenanceConfig()]);
  if (!detail) notFound();

  const isAdmin = user.role === "admin";
  // Non-admins can log records and view the truck's papers, but not see purchase details.
  const truck = isAdmin ? detail.truck : { ...detail.truck, purchaseYear: null, purchasePrice: null };

  return (
    <AdminTruckDetail {...detail} truck={truck} documents={detail.documents} config={config} canManage={isAdmin} />
  );
}
