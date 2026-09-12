import { getClients } from "@/lib/queries/clients";
import { getEmployees } from "@/lib/queries/employees";
import { getExpenses } from "@/lib/queries/expenses";
import {
  getBillables,
  getCollectionReceipts,
  getDisbursements,
} from "@/lib/queries/bookkeeping";
import { isBookkeepingLedger, type BookkeepingLedger } from "@/lib/bookkeeping";
import { getTrucks } from "@/lib/queries/trucks";
import AdminBookkeeping from "@/components/views/AdminBookkeeping";

export const dynamic = "force-dynamic";

export default async function AdminBookkeepingPage({
  searchParams,
}: {
  searchParams: Promise<{ ledger?: string }>;
}) {
  const [
    billables,
    expenses,
    disbursements,
    collectionReceipts,
    employees,
    trucks,
    clients,
  ] = await Promise.all([
    getBillables(),
    getExpenses(),
    getDisbursements(),
    getCollectionReceipts(),
    getEmployees(),
    getTrucks(),
    getClients(),
  ]);

  const { ledger } = await searchParams;
  const requestedLedger = ledger ?? "";
  const initialLedger: BookkeepingLedger = isBookkeepingLedger(requestedLedger)
    ? requestedLedger
    : "billables";

  return (
    <AdminBookkeeping
      initialLedger={initialLedger}
      initialBillables={billables}
      initialExpenses={expenses}
      initialDisbursements={disbursements}
      initialCollectionReceipts={collectionReceipts}
      employees={employees}
      trucks={trucks}
      clients={clients}
    />
  );
}
