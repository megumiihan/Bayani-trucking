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
  // Non-admins can log records but not see purchase details or the certificate file.
  const truck = isAdmin
    ? detail.truck
    : { ...detail.truck, purchaseYear: null, purchasePrice: null, hasCertificate: false, certificateName: null };

  // Non-admins still get renewal due dates (they feed the maintenance alerts), but not the files.
  const documents = isAdmin
    ? detail.documents
    : detail.documents.map((doc) => ({ ...doc, hasFile: false, fileName: null }));

  return (
    <AdminTruckDetail {...detail} truck={truck} documents={documents} config={config} canManage={isAdmin} />
  );
}
