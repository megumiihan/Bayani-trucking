export const BOOKKEEPING_LEDGERS = [
  "billables",
  "expenses",
  "disbursement",
  "collection-receipt",
] as const;

export type BookkeepingLedger = (typeof BOOKKEEPING_LEDGERS)[number];

export const BOOKKEEPING_LEDGER_LABELS: Record<BookkeepingLedger, string> = {
  billables: "Billables",
  expenses: "Expenses",
  disbursement: "Disbursement",
  "collection-receipt": "Collection receipt",
};

export function isBookkeepingLedger(value: string): value is BookkeepingLedger {
  return (BOOKKEEPING_LEDGERS as readonly string[]).includes(value);
}

export const VAT_INCLUSIVE_DIVISOR = 1.12;
export const OUTPUT_TAX_RATE = 0.12;
export const WITHHOLDING_TAX_RATE = 0.02;

export function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

export function computeBillableBreakdown(
  totalInvoiceAmt: number,
  vatDeduction: boolean,
  withholdingTaxDeduction: boolean
) {
  const taxableAmt = roundMoney(totalInvoiceAmt / VAT_INCLUSIVE_DIVISOR);
  const outputTax = vatDeduction
    ? roundMoney(taxableAmt * OUTPUT_TAX_RATE)
    : 0;
  const withholdingTax = withholdingTaxDeduction
    ? roundMoney(taxableAmt * WITHHOLDING_TAX_RATE)
    : 0;
  const invoiceTotal = roundMoney(taxableAmt + outputTax + withholdingTax);

  return { taxableAmt, outputTax, withholdingTax, invoiceTotal };
}

export type BillableUi = {
  id: string;
  date: string;
  invoiceNo: string;
  vatRegNo: string;
  buyerName: string;
  buyerAddress: string;
  clientId: string | null;
  totalInvoiceAmt: number;
  taxableAmt: number;
  outputTax: number;
  withholdingTax: number;
  invoiceTotal: number;
  vatDeduction: boolean;
  withholdingTaxDeduction: boolean;
  createdByName: string;
};

export type BillableWriteInput = {
  date: string;
  invoiceNo: string;
  vatRegNo: string;
  clientId: string;
  buyerAddress: string;
  totalInvoiceAmt: number;
  vatDeduction: boolean;
  withholdingTaxDeduction: boolean;
};

export type DisbursementUi = {
  id: string;
  date: string;
  payee: string;
  amount: number;
  referenceNo: string;
  description: string;
  createdByName: string;
};

export type DisbursementWriteInput = {
  date: string;
  payee: string;
  amount: number;
  referenceNo?: string;
  description?: string;
};

export type CollectionReceiptUi = {
  id: string;
  date: string;
  receivedFrom: string;
  amount: number;
  receiptNo: string;
  description: string;
  createdByName: string;
};

export type CollectionReceiptWriteInput = {
  date: string;
  receivedFrom: string;
  amount: number;
  receiptNo: string;
  description?: string;
};
