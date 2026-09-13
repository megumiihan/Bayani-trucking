import type { BillableUi, CollectionReceiptUi } from "@/lib/bookkeeping";
import {
  isWithinDateDuration,
  type DateDuration,
} from "@/lib/shipmentFilters";

export interface BillableFilters {
  clientIds: string[];
  dateDuration: DateDuration;
  customStartDate: string;
  customEndDate: string;
}

export const defaultBillableFilters: BillableFilters = {
  clientIds: [],
  dateDuration: "all",
  customStartDate: "",
  customEndDate: "",
};

function matchesBillableDate(
  date: string,
  filters: Pick<
    BillableFilters,
    "dateDuration" | "customStartDate" | "customEndDate"
  >
) {
  if (filters.customStartDate || filters.customEndDate) {
    return isWithinDateDuration(
      date,
      "custom",
      filters.customStartDate,
      filters.customEndDate
    );
  }

  return isWithinDateDuration(date, filters.dateDuration, "", "");
}

export function filterBillables(
  billables: BillableUi[],
  filters: BillableFilters
): BillableUi[] {
  return billables.filter((billable) => {
    if (
      filters.clientIds.length > 0 &&
      !filters.clientIds.includes(billable.clientId)
    ) {
      return false;
    }

    return matchesBillableDate(billable.date, filters);
  });
}

export function filterCollectionReceipts(
  receipts: CollectionReceiptUi[],
  filters: BillableFilters
): CollectionReceiptUi[] {
  return receipts.filter((receipt) => {
    if (
      filters.clientIds.length > 0 &&
      !filters.clientIds.includes(receipt.clientId)
    ) {
      return false;
    }

    return matchesBillableDate(receipt.datePaid, filters);
  });
}

export type ClientBillableSummary = {
  clientId: string;
  clientName: string;
  totalBillables: number;
  totalCollections: number;
  afterCollections: number;
};

export function summarizeBillablesByClient(
  billables: BillableUi[],
  receipts: CollectionReceiptUi[],
  filters: BillableFilters = defaultBillableFilters
): ClientBillableSummary[] {
  const scopedBillables = filterBillables(billables, filters);
  const scopedReceipts = filterCollectionReceipts(receipts, filters);
  const byClient = new Map<string, ClientBillableSummary>();

  const ensure = (clientId: string, clientName: string) => {
    const existing = byClient.get(clientId);
    if (existing) return existing;

    const created: ClientBillableSummary = {
      clientId,
      clientName,
      totalBillables: 0,
      totalCollections: 0,
      afterCollections: 0,
    };
    byClient.set(clientId, created);
    return created;
  };

  for (const billable of scopedBillables) {
    ensure(billable.clientId, billable.buyerName).totalBillables +=
      billable.totalInvoiceAmt;
  }

  for (const receipt of scopedReceipts) {
    ensure(receipt.clientId, receipt.clientName).totalCollections +=
      receipt.collectionAmount;
  }

  return [...byClient.values()]
    .map((row) => ({
      ...row,
      afterCollections: row.totalBillables - row.totalCollections,
    }))
    .sort((a, b) => a.clientName.localeCompare(b.clientName));
}

export function hasActiveBillableFilters(filters: BillableFilters) {
  return (
    filters.clientIds.length > 0 ||
    filters.dateDuration !== "all" ||
    filters.customStartDate !== "" ||
    filters.customEndDate !== ""
  );
}
