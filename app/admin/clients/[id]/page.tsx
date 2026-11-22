import { notFound } from "next/navigation";
import { requirePageRole } from "@/lib/auth";
import { getClientById } from "@/lib/queries/clients";
import {
  getBillablesForClient,
  getCollectionReceiptsForClient,
} from "@/lib/queries/bookkeeping";
import AdminClientDetail from "@/components/views/AdminClientDetail";

export const dynamic = "force-dynamic";

interface ClientDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function ClientDetailPage({ params }: ClientDetailPageProps) {
  await requirePageRole(["admin"]);
  const { id } = await params;
  const [client, billables, receipts] = await Promise.all([
    getClientById(id),
    getBillablesForClient(id),
    getCollectionReceiptsForClient(id),
  ]);
  if (!client) notFound();
  return <AdminClientDetail initialClient={client} billables={billables} receipts={receipts} />;
}
