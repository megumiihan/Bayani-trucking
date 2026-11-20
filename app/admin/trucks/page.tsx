import { getTruckOverview } from "@/lib/queries/trucks";
import AdminTrucksOverview from "@/components/views/AdminTrucksOverview";

export const dynamic = "force-dynamic";

export default async function AdminTrucksPage() {
  const rows = await getTruckOverview();
  return <AdminTrucksOverview rows={rows} />;
}
