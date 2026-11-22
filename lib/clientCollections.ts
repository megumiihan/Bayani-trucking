import {
  billableAmountDue,
  roundMoney,
  type BillableUi,
  type CollectionReceiptUi,
} from "@/lib/bookkeeping";

export interface ClientCollectionSummary {
  /** Σ amount due (invoice total − withholding) across the client's SIs. */
  billed: number;
  /** Σ official receipt amounts. */
  collected: number;
  /** Σ amount due on SIs that no receipt has paid yet. */
  outstanding: number;
  invoiceCount: number;
  unpaidCount: number;
  receiptCount: number;
  lastCollectedOn: string | null;
}

export function collectedBillableIds(receipts: CollectionReceiptUi[]) {
  return new Set(
    receipts.flatMap((r) => r.items.flatMap((item) => (item.billableId ? [item.billableId] : []))),
  );
}

export function unpaidBillables(billables: BillableUi[], receipts: CollectionReceiptUi[]) {
  const paid = collectedBillableIds(receipts);
  return billables.filter((b) => !paid.has(b.id));
}

export function summarizeClientCollections(
  billables: BillableUi[],
  receipts: CollectionReceiptUi[],
): ClientCollectionSummary {
  const unpaid = unpaidBillables(billables, receipts);
  const dueOf = (b: BillableUi) => billableAmountDue(b.totalInvoiceAmt, b.withholdingTax);
  return {
    billed: roundMoney(billables.reduce((sum, b) => sum + dueOf(b), 0)),
    collected: roundMoney(receipts.reduce((sum, r) => sum + r.collectionAmount, 0)),
    outstanding: roundMoney(unpaid.reduce((sum, b) => sum + dueOf(b), 0)),
    invoiceCount: billables.length,
    unpaidCount: unpaid.length,
    receiptCount: receipts.length,
    lastCollectedOn: receipts.reduce<string | null>(
      (latest, r) => (!latest || r.datePaid > latest ? r.datePaid : latest),
      null,
    ),
  };
}

/** Whole days from an ISO date to today. */
export function daysSince(isoDate: string) {
  const then = new Date(`${isoDate}T00:00:00`).getTime();
  return Math.max(0, Math.floor((Date.now() - then) / 86_400_000));
}

/** Two-letter monogram from the registered or short name. */
export function clientInitials(name: string) {
  const words = name.replace(/[^A-Za-z0-9 ]/g, " ").split(/\s+/).filter(Boolean);
  return ((words[0]?.[0] ?? "") + (words[1]?.[0] ?? words[0]?.[1] ?? "")).toUpperCase();
}
