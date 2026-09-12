import type { BillableUi } from "@/lib/bookkeeping";

function csvCell(value: string | number) {
  const text = String(value);
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function exportBillablesToCsv(billables: BillableUi[]) {
  const header = [
    "Date",
    "Invoice no.",
    "VAT Reg. No.",
    "Buyer name",
    "Buyer address",
    "Total invoice amount",
    "Taxable amount",
    "Output tax",
    "Withholding tax",
    "Total tax",
    "VAT deduction",
    "Withholding tax deduction",
    "Logged by",
  ];

  const rows = billables.map((row) => [
    row.date,
    row.invoiceNo,
    row.vatRegNo,
    row.buyerName,
    row.buyerAddress,
    row.totalInvoiceAmt.toFixed(2),
    row.taxableAmt.toFixed(2),
    row.outputTax.toFixed(2),
    row.withholdingTax.toFixed(2),
    row.totalTax.toFixed(2),
    row.vatDeduction ? "Yes" : "No",
    row.withholdingTaxDeduction ? "Yes" : "No",
    row.createdByName,
  ]);

  const csv = [header, ...rows]
    .map((row) => row.map(csvCell).join(","))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `bayani-billables-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
