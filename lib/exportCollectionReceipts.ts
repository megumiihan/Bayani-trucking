import type { WorkSheet } from "xlsx";
import type { CollectionReceiptUi } from "@/lib/bookkeeping";

/** As printed on the receipt pad. */
const COMPANY_HEADER = [
  "BAYANI TRUCKING SERVICES",
  "13 New Airport Road, San Fermin, Cauayan City, Isabela",
  "SHARON T. BAYANI - Prop.",
  "VAT REG. TIN 247-669-526-00001",
];
const NOT_VALID_NOTE = "\u201cTHIS DOCUMENT IS NOT VALID FOR CLAIM OF INPUT TAX\u201d";
const MONEY_FORMAT = "#,##0.00";
/** Longest description line that fits the merged description cells. */
const DESCRIPTION_LINE_MAX = 52;

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * SI dates for "Freight for the period of …": each date once, in order, with the
 * year written once per year, e.g. "Sep 30, Oct 3, Oct 6, 2025".
 */
function formatPeriod(isoDates: string[]) {
  const sorted = [...new Set(isoDates)].sort();
  const byYear = new Map<string, string[]>();
  for (const iso of sorted) {
    const [year, month, day] = iso.split("-");
    const label = `${MONTHS[Number(month) - 1]} ${Number(day)}`;
    byYear.set(year, [...(byYear.get(year) ?? []), label]);
  }
  return [...byYear].map(([year, days]) => `${days.join(", ")}, ${year}`).join("; ");
}

/** "SI #172, 173, 174". Strips any "SI"/"#" already typed into the number. */
function formatInvoiceRefs(invoiceNos: string[]) {
  const numbers = invoiceNos
    .map((no) => no.trim().replace(/^(SI\s*)?#?\s*/i, ""))
    .filter(Boolean);
  return numbers.length > 0 ? `SI #${numbers.join(", ")}` : "";
}

/** The buyer field shared by the receipt's SIs (distinct values joined if they differ). */
function buyerField(values: string[], fallback = "") {
  const distinct = [...new Set(values.map((v) => v.trim()).filter(Boolean))];
  return distinct.length > 0 ? distinct.join("; ") : fallback;
}

function formatDate(iso: string) {
  const [year, month, day] = iso.split("-");
  return `${MONTHS[Number(month) - 1]} ${Number(day)}, ${year}`;
}

/** Splits text at ", " / "; " so each line fits the description cells (like the handwritten lines). */
function wrapLines(text: string, max: number) {
  const parts = text.split(/(?<=[,;]) /);
  const lines: string[] = [];
  for (const part of parts) {
    const last = lines[lines.length - 1];
    if (last !== undefined && (last + " " + part).length <= max) lines[lines.length - 1] = `${last} ${part}`;
    else lines.push(part);
  }
  return lines;
}

function paymentFor(row: CollectionReceiptUi) {
  const siDates = row.items.flatMap((item) => (item.siDate ? [item.siDate] : []));
  return siDates.length > 0 ? `Freight for the period of ${formatPeriod(siDates)}` : "Freight";
}

type Cell = string | number | null;
type Merge = { s: { r: number; c: number }; e: { r: number; c: number } };

/**
 * Lays receipts out like the printed Collection Receipt, stacked down one sheet
 * (columns A–D). Returns the rows, merged ranges and the rows holding amounts.
 */
function buildReceiptSheet(receipts: CollectionReceiptUi[]) {
  const rows: Cell[][] = [];
  const merges: Merge[] = [];
  const moneyCells: { r: number; c: number }[] = [];

  const add = (cells: Cell[], merge?: [number, number][]) => {
    const r = rows.length;
    rows.push(cells);
    for (const [from, to] of merge ?? []) merges.push({ s: { r, c: from }, e: { r, c: to } });
    return r;
  };

  for (const row of receipts) {
    for (const line of COMPANY_HEADER) add([line], [[0, 3]]);
    add([]);
    add(["COLLECTION RECEIPT", null, "No.", row.orNumber], [[0, 1]]);
    add(["\u2610 Cash Sales", null, "Payment Date", formatDate(row.datePaid)]);
    add(["\u2610 Credit Sales", null, "Account No.", ""]);
    add(["RECEIVED FROM:"], [[0, 3]]);
    add(["Registered Name:", buyerField(row.items.map((i) => i.buyerName), row.clientName)], [[1, 3]]);
    add(["TIN:", buyerField(row.items.map((i) => i.vatRegNo))], [[1, 3]]);
    add(["Business Address:", buyerField(row.items.map((i) => i.buyerAddress))], [[1, 3]]);
    add(["Description of Transaction/Nature of Service", null, null, "AMOUNT"], [[0, 2]]);

    const lines = wrapLines(paymentFor(row), DESCRIPTION_LINE_MAX);
    lines.forEach((line, index) => {
      const isLast = index === lines.length - 1;
      const r = add([index === 0 ? "Payment for" : null, line, null, isLast ? row.collectionAmount : null], [[1, 2]]);
      if (isLast) moneyCells.push({ r, c: 3 });
    });

    add([]);
    const totalRow = add(["By:", row.whoReceived, "TOTAL PAID AMOUNT", row.collectionAmount]);
    moneyCells.push({ r: totalRow, c: 3 });
    add([null, "Signature Over Printed Name", "Invoice Reference No.", formatInvoiceRefs(row.items.map((i) => i.invoiceNo))]);
    add([NOT_VALID_NOTE], [[0, 1]]);
    add([]);
    add([]);
  }

  return { rows, merges, moneyCells };
}

/**
 * Downloads an Excel file: "Receipts" lays each collection receipt out like the
 * paper receipt; "List" has one row per receipt (with the app-only fields) for
 * sorting and totals. Cash/Credit Sales and Account No. aren't tracked, so they're blank.
 * A single receipt (the per-row Export) gets just the receipt, named by its OR number.
 */
export async function exportCollectionReceiptsToXlsx(receipts: CollectionReceiptUi[]) {
  const XLSX = await import("xlsx");

  const setMoney = (sheet: WorkSheet, r: number, c: number) => {
    const cell = sheet[XLSX.utils.encode_cell({ r, c })];
    if (cell && typeof cell.v === "number") cell.z = MONEY_FORMAT;
  };

  const receiptLayout = buildReceiptSheet(receipts);
  const receiptSheet = XLSX.utils.aoa_to_sheet(receiptLayout.rows);
  receiptSheet["!merges"] = receiptLayout.merges;
  receiptSheet["!cols"] = [{ wch: 20 }, { wch: 34 }, { wch: 22 }, { wch: 24 }];
  for (const { r, c } of receiptLayout.moneyCells) setMoney(receiptSheet, r, c);

  const listRows: Cell[][] = [
    [
      "No.",
      "Payment Date",
      "Registered Name",
      "TIN",
      "Business Address",
      "Payment for",
      "Total Paid Amount",
      "Invoice Reference No.",
      "Received by",
      "Client",
      "Payment details",
      "Who paid",
      "Logged by",
    ],
    ...receipts.map((row) => [
      row.orNumber,
      formatDate(row.datePaid),
      buyerField(row.items.map((i) => i.buyerName), row.clientName),
      buyerField(row.items.map((i) => i.vatRegNo)),
      buyerField(row.items.map((i) => i.buyerAddress)),
      paymentFor(row),
      row.collectionAmount,
      formatInvoiceRefs(row.items.map((i) => i.invoiceNo)),
      row.whoReceived,
      row.clientName,
      row.paymentDetails,
      row.whoPaid,
      row.createdByName,
    ]),
  ];
  const listSheet = XLSX.utils.aoa_to_sheet(listRows);
  listSheet["!cols"] = [10, 14, 32, 22, 32, 48, 16, 22, 18, 24, 24, 18, 18].map((wch) => ({ wch }));
  for (let r = 1; r < listRows.length; r++) setMoney(listSheet, r, 6);

  const workbook = XLSX.utils.book_new();
  if (receipts.length === 1) {
    const [receipt] = receipts;
    XLSX.utils.book_append_sheet(workbook, receiptSheet, "Receipt");
    const safeOr = receipt.orNumber.replace(/[^\w-]+/g, "_") || "receipt";
    XLSX.writeFile(workbook, `collection-receipt-${safeOr}.xlsx`);
    return;
  }
  XLSX.utils.book_append_sheet(workbook, receiptSheet, "Receipts");
  XLSX.utils.book_append_sheet(workbook, listSheet, "List");

  // Local date + time so each export gets its own file name (no "(1)", "(2)" copies).
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}`;
  XLSX.writeFile(workbook, `bayani-collection-receipts-${stamp}.xlsx`);
}
