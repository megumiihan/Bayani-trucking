import { requirePageRole } from "@/lib/auth";
import { getClients } from "@/lib/queries/clients";
import { getBillables, getCollectionReceipts } from "@/lib/queries/bookkeeping";
import AdminClientsOverview from "@/components/views/AdminClientsOverview";

export const dynamic = "force-dynamic";

export default async function AdminClientsPage() {
  await requirePageRole(["admin"]);
  const [clients, billables, receipts] = await Promise.all([
    getClients(),
    getBillables(),
    getCollectionReceipts(),
  ]);
  return <AdminClientsOverview initialClients={clients} billables={billables} receipts={receipts} />;
}
