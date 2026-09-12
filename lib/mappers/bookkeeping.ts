import type {
  Billable,
  Client,
  CollectionReceipt,
  Disbursement,
  Profile,
} from "@prisma/client";
import {
  roundMoney,
  type BillableUi,
  type CollectionReceiptUi,
  type DisbursementUi,
} from "@/lib/bookkeeping";

export const bookkeepingActorInclude = {
  createdBy: {
    select: { email: true, employee: { select: { fullName: true } } },
  },
} as const;

export const billableInclude = {
  ...bookkeepingActorInclude,
  client: { select: { id: true, name: true } },
} as const;

export const collectionReceiptInclude = {
  ...bookkeepingActorInclude,
  client: { select: { id: true, name: true } },
} as const;

type BookkeepingActor = Pick<Profile, "email"> & {
  employee: { fullName: string } | null;
};

function actorName(createdBy: BookkeepingActor) {
  return createdBy.employee?.fullName ?? createdBy.email;
}

function isoDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

export function mapBillableToUi(
  record: Billable & {
    createdBy: BookkeepingActor;
    client: Pick<Client, "id" | "name"> | null;
  }
): BillableUi {
  return {
    id: record.id,
    date: isoDate(record.date),
    invoiceNo: record.invoiceNo,
    vatRegNo: record.vatRegNo,
    buyerName: record.client?.name || record.buyerName,
    buyerAddress: record.buyerAddress,
    clientId: record.clientId,
    totalInvoiceAmt: record.totalInvoiceAmt,
    taxableAmt: record.taxableAmt,
    outputTax: record.outputTax,
    withholdingTax: record.withholdingTax,
    totalTax:
      record.totalTax ||
      roundMoney(record.outputTax + record.withholdingTax),
    vatDeduction: record.vatDeduction,
    withholdingTaxDeduction: record.withholdingTaxDeduction,
    createdByName: actorName(record.createdBy),
  };
}

export function mapDisbursementToUi(
  record: Disbursement & { createdBy: BookkeepingActor }
): DisbursementUi {
  return {
    id: record.id,
    date: isoDate(record.date),
    payee: record.payee,
    amount: record.amount,
    referenceNo: record.referenceNo ?? "",
    description: record.description ?? "",
    createdByName: actorName(record.createdBy),
  };
}

export function mapCollectionReceiptToUi(
  record: CollectionReceipt & {
    createdBy: BookkeepingActor;
    client: Pick<Client, "id" | "name"> | null;
  }
): CollectionReceiptUi {
  return {
    id: record.id,
    datePaid: isoDate(record.datePaid),
    orNumber: record.orNumber,
    amount: record.amount,
    paymentDetails: record.paymentDetails,
    whoPaid: record.whoPaid,
    whoReceived: record.whoReceived,
    clientId: record.clientId,
    clientName: record.client?.name || record.clientName,
    createdByName: actorName(record.createdBy),
  };
}
