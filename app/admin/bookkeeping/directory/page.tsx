import { requirePageRole } from "@/lib/auth";
import { getClients } from "@/lib/queries/clients";
import { getSuppliers } from "@/lib/queries/suppliers";
import AdminDirectory from "@/components/views/AdminDirectory";

export const dynamic = "force-dynamic";

export default async function AdminDirectoryPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  await requirePageRole(["admin"]);
  const [clients, suppliers, { tab }] = await Promise.all([
    getClients({ includeTemporary: true }),
    getSuppliers(),
    searchParams,
  ]);
  return (
    <AdminDirectory
      initialTab={tab === "suppliers" ? "suppliers" : "clients"}
      clients={clients}
      suppliers={suppliers}
    />
  );
}
