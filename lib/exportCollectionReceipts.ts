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
    "SI / invoice no.",
    "Buyer name",
    "Buyer address",
    "VAT Reg. No.",
    "Total amount due",
    "Collection amount",
    "Payment details",
    "Date paid",
    "Who paid",
    "Who received",
    "Logged by",
  ];

  // One row per SI. The receipt's collection amount appears only on its first row,
  // so summing the column in Excel gives the true total.
  const rows = receipts.flatMap((row) => {
    const items = row.items.length > 0 ? row.items : [null];
    return items.map((item, index) => [
      row.clientName,
      row.orNumber,
      item?.invoiceNo ?? "",
      item?.buyerName ?? "",
      item?.buyerAddress ?? "",
      item?.vatRegNo ?? "",
      item ? item.amountDue.toFixed(2) : "",
      index === 0 ? row.collectionAmount.toFixed(2) : "",
      row.paymentDetails,
      row.datePaid,
      row.whoPaid,
      row.whoReceived,
      row.createdByName,
    ]);
  });

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
