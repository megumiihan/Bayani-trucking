import type { CollectionReceiptUi } from "@/lib/bookkeeping";

function csvCell(value: string | number) {
  const text = String(value);
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function exportCollectionReceiptsToCsv(receipts: CollectionReceiptUi[]) {
  const header = [
    "Client",
    "OR number",
    "Collection amount",
    "Payment details",
    "Date paid",
    "Who paid",
    "Who received",
    "Logged by",
  ];

  const rows = receipts.map((row) => [
    row.clientName,
    row.orNumber,
    row.collectionAmount.toFixed(2),
    row.paymentDetails,
    row.datePaid,
    row.whoPaid,
    row.whoReceived,
    row.createdByName,
  ]);

  const csv = [header, ...rows]
    .map((row) => row.map(csvCell).join(","))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `bayani-collection-receipts-${new Date()
    .toISOString()
    .slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
