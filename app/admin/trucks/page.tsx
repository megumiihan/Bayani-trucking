import { requireTruckPageAccess } from "@/lib/auth";
import { getMaintenanceConfig, getTruckOverview } from "@/lib/queries/trucks";
import AdminTrucksOverview from "@/components/views/AdminTrucksOverview";

export const dynamic = "force-dynamic";

export default async function AdminTrucksPage() {
  const user = await requireTruckPageAccess();
  const [rows, config] = await Promise.all([getTruckOverview(), getMaintenanceConfig()]);
  const isAdmin = user.role === "admin";
  // Secretary and drivers only get the maintenance board; keep fleet financials and files server-side.
  const visibleRows = isAdmin
    ? rows
    : rows.map((row) => ({
        ...row,
        truck: { ...row.truck, purchaseYear: null, purchasePrice: null, hasCertificate: false, certificateName: null },
        fuelTotal: 0,
        repairTotal: 0,
      }));
  return <AdminTrucksOverview rows={visibleRows} config={config} canManage={isAdmin} />;
}
