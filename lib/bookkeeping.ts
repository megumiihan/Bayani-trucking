/** Ordered in pairs: money in (billables, collections), then money out (expenses, disbursements). */
export const BOOKKEEPING_LEDGERS = [
  "billables",
  "collection-receipt",
  "expenses",
  "disbursement",
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
  const totalTax = roundMoney(outputTax + withholdingTax);
  const totalAmountDue = billableAmountDue(totalInvoiceAmt, withholdingTax);

  return { taxableAmt, outputTax, withholdingTax, totalTax, totalAmountDue };
}

/** What the client actually pays: total invoice amount less the tax they withhold. */
export function billableAmountDue(totalInvoiceAmt: number, withholdingTax: number) {
  return roundMoney(totalInvoiceAmt - withholdingTax);
}

export type BillableUi = {
  id: string;
  date: string;
  invoiceNo: string;
  vatRegNo: string;
  buyerName: string;
  buyerAddress: string;
  clientId: string;
  totalInvoiceAmt: number;
  taxableAmt: number;
  outputTax: number;
  withholdingTax: number;
  totalTax: number;
  vatDeduction: boolean;
  withholdingTaxDeduction: boolean;
  createdByName: string;
};

/** Typed in when "Others" is picked: creates (or reuses) a temporary client. */
export type NewTemporaryClientInput = {
  name: string;
  address?: string;
  tin?: string;
};

export type BillableWriteInput = {
  date: string;
  invoiceNo: string;
  vatRegNo: string;
  /** Empty when newClient is given. */
  clientId: string;
  /** Billables take the address and TIN from buyerAddress / vatRegNo. */
  newClient?: NewTemporaryClientInput;
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
  invoiceNo: string;
  vatRegNo: string;
  description: string;
  createdByName: string;
};

export type DisbursementWriteInput = {
  date: string;
  payee: string;
  amount: number;
  referenceNo?: string;
  invoiceNo?: string;
  vatRegNo?: string;
  description?: string;
};

export type CollectionReceiptUi = {
  id: string;
  datePaid: string;
  orNumber: string;
  collectionAmount: number;
  paymentDetails: string;
  whoPaid: string;
  whoReceived: string;
  clientId: string;
  clientName: string;
  createdByName: string;
  /** SIs paid by this receipt. Empty for receipts logged before SIs were linked. */
  items: CollectionReceiptItemUi[];
};

export type CollectionReceiptItemUi = {
  id: string;
  billableId: string | null;
  invoiceNo: string;
  buyerName: string;
  buyerAddress: string;
  vatRegNo: string;
  amountDue: number;
  /** The SI's date (YYYY-MM-DD); null if the SI was deleted. */
  siDate: string | null;
};

/**
 * Collection amount is normally the sum of the selected SIs' amounts due. Only
 * temporary ("Others") clients may log a receipt with no SIs, using
 * collectionAmount instead.
 */
export type CollectionReceiptWriteInput = {
  datePaid: string;
  orNumber: string;
  paymentDetails: string;
  whoPaid: string;
  whoReceived: string;
  /** Empty when newClient is given. */
  clientId: string;
  newClient?: NewTemporaryClientInput;
  billableIds: string[];
  collectionAmount?: number;
};
