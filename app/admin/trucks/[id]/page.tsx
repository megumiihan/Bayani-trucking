import { notFound } from "next/navigation";
import { getTruckDetail } from "@/lib/queries/trucks";
import AdminTruckDetail from "@/components/views/AdminTruckDetail";

export const dynamic = "force-dynamic";

interface TruckDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function TruckDetailPage({ params }: TruckDetailPageProps) {
  const { id } = await params;
  const detail = await getTruckDetail(id);
  if (!detail) notFound();

  return <AdminTruckDetail {...detail} />;
}
