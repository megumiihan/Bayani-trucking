"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import {
  billableAmountDue,
  computeBillableBreakdown,
  roundMoney,
  type BillableUi,
  type BillableWriteInput,
  type CollectionReceiptUi,
  type CollectionReceiptWriteInput,
  type DisbursementUi,
  type DisbursementWriteInput,
  type NewTemporaryClientInput,
} from "@/lib/bookkeeping";
import { formatTin } from "@/lib/clientDirectory";
import type { Client } from "@/lib/clients";
import { mapClientToUi } from "@/lib/mappers/client";
import {
  billableInclude,
  bookkeepingActorInclude,
  collectionReceiptInclude,
  mapBillableToUi,
  mapCollectionReceiptToUi,
  mapDisbursementToUi,
} from "@/lib/mappers/bookkeeping";
import { prisma } from "@/lib/prisma";

function revalidateBookkeeping() {
  revalidatePath("/admin/bookkeeping");
}

// ── Client on a billable / receipt: picked from the list, or "Others" ───────

type ClientPlan =
  | { kind: "existing"; id: string; name: string; isTemporary: boolean }
  | { kind: "new"; name: string; address: string; tin: string };

/** Validates the client choice without writing anything. */
async function planClient(
  clientId: string,
  newClient: NewTemporaryClientInput | undefined,
  requiredLabel: string
): Promise<{ ok: true; plan: ClientPlan } | { ok: false; error: string }> {
  if (newClient) {
    const name = newClient.name.trim().replace(/\s+/g, " ");
    if (!name) return { ok: false, error: "Enter the other client's name." };
    const address = (newClient.address ?? "").trim();
    const tin = formatTin(newClient.tin ?? "");
    const match = await prisma.client.findFirst({
      where: { name: { equals: name, mode: "insensitive" } },
      select: { id: true, name: true, isTemporary: true },
    });
    if (match && !match.isTemporary) {
      return {
        ok: false,
        error: `"${match.name}" is already a client. Pick it from the list instead of Others.`,
      };
    }
    // Typing a one-off client's name again reuses it instead of duplicating.
    if (match) return { ok: true, plan: { kind: "existing", ...match } };
    return { ok: true, plan: { kind: "new", name, address, tin } };
  }

  if (!clientId) return { ok: false, error: `${requiredLabel} is required.` };
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { id: true, name: true, isTemporary: true },
  });
  if (!client) return { ok: false, error: "Client not found." };
  return { ok: true, plan: { kind: "existing", ...client } };
}

/** Creates the planned temporary client inside the caller's transaction. */
async function materializeClient(
  tx: Prisma.TransactionClient,
  plan: ClientPlan
): Promise<{ id: string; name: string; created: Client | null }> {
  if (plan.kind === "existing") return { id: plan.id, name: plan.name, created: null };
  const record = await tx.client.create({
    data: {
      name: plan.name,
      legalName: plan.name,
      address: plan.address,
      tin: plan.tin,
      isTemporary: true,
    },
  });
  return { id: record.id, name: record.name, created: mapClientToUi(record) };
}

function revalidateClientDirectory() {
  revalidatePath("/admin/bookkeeping/directory");
}

function requireDate(date: string, label = "Date") {
  if (!date) return `${label} is required.`;
  return null;
}

function requirePositiveAmount(amount: number, label: string) {
  if (!Number.isFinite(amount) || amount <= 0) {
    return `Enter a ${label} greater than zero.`;
  }
  return null;
}

function uniqueConstraintMessage(error: unknown, message: string) {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  ) {
    return message;
  }
  return null;
}

export type SaveBillableResult =
  | { success: true; billable: BillableUi; createdClient: Client | null }
  | { success: false; error: string };

type PreparedBillableWrite =
  | { ok: true; data: {
      date: Date;
      invoiceNo: string;
      vatRegNo: string;
      buyerAddress: string;
      totalInvoiceAmt: number;
      taxableAmt: number;
      outputTax: number;
      withholdingTax: number;
      totalTax: number;
      vatDeduction: boolean;
      withholdingTaxDeduction: boolean;
    }; plan: ClientPlan }
  | { ok: false; error: string };

async function prepareBillableWrite(
  input: BillableWriteInput
): Promise<PreparedBillableWrite> {
  const invalid =
    requireDate(input.date) ??
    requirePositiveAmount(input.totalInvoiceAmt, "total invoice amount");
  if (invalid) return { ok: false, error: invalid };

  const invoiceNo = input.invoiceNo.trim();
  const vatRegNo = input.vatRegNo.trim();
  const buyerAddress = input.buyerAddress.trim();
  if (!invoiceNo) return { ok: false, error: "Invoice no. is required." };
  if (!vatRegNo) return { ok: false, error: "VAT Reg. No. is required." };
  if (!buyerAddress) return { ok: false, error: "Buyer address is required." };

  const planned = await planClient(
    input.clientId,
    input.newClient && { ...input.newClient, address: buyerAddress, tin: vatRegNo },
    "Buyer name"
  );
  if (!planned.ok) return planned;

  const breakdown = computeBillableBreakdown(
    input.totalInvoiceAmt,
    input.vatDeduction,
    input.withholdingTaxDeduction
  );

  return {
    ok: true,
    data: {
      date: new Date(input.date),
      invoiceNo,
      vatRegNo,
      buyerAddress,
      totalInvoiceAmt: input.totalInvoiceAmt,
      taxableAmt: breakdown.taxableAmt,
      outputTax: breakdown.outputTax,
      withholdingTax: breakdown.withholdingTax,
      totalTax: breakdown.totalTax,
      vatDeduction: input.vatDeduction,
      withholdingTaxDeduction: input.withholdingTaxDeduction,
    },
    plan: planned.plan,
  };
}

export async function saveBillable(
  input: BillableWriteInput
): Promise<SaveBillableResult> {
  try {
    const user = await requireAdmin();
    const prepared = await prepareBillableWrite(input);
    if (!prepared.ok) return { success: false, error: prepared.error };

    const { record, created } = await prisma.$transaction(async (tx) => {
      const client = await materializeClient(tx, prepared.plan);
      const record = await tx.billable.create({
        data: {
          ...prepared.data,
          clientId: client.id,
          buyerName: client.name,
          createdById: user.id,
        },
        include: billableInclude,
      });
      return { record, created: client.created };
    });

    revalidateBookkeeping();
    if (created) revalidateClientDirectory();
    return { success: true, billable: mapBillableToUi(record), createdClient: created };
  } catch (error) {
    const duplicate = uniqueConstraintMessage(
      error,
      "An entry with this invoice no. already exists."
    );
    if (duplicate) return { success: false, error: duplicate };

    console.error("[saveBillable]", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "An unexpected error occurred while saving the billable.",
    };
  }
}

export async function updateBillable(
  id: string,
  input: BillableWriteInput
): Promise<SaveBillableResult> {
  try {
    await requireAdmin();
    const prepared = await prepareBillableWrite(input);
    if (!prepared.ok) return { success: false, error: prepared.error };

    const existing = await prisma.billable.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) return { success: false, error: "Billable not found." };

    const { record, created } = await prisma.$transaction(async (tx) => {
      const client = await materializeClient(tx, prepared.plan);
      const record = await tx.billable.update({
        where: { id },
        data: { ...prepared.data, clientId: client.id, buyerName: client.name },
        include: billableInclude,
      });
      return { record, created: client.created };
    });

    revalidateBookkeeping();
    if (created) revalidateClientDirectory();
    return { success: true, billable: mapBillableToUi(record), createdClient: created };
  } catch (error) {
    const duplicate = uniqueConstraintMessage(
      error,
      "An entry with this invoice no. already exists."
    );
    if (duplicate) return { success: false, error: duplicate };

    console.error("[updateBillable]", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "An unexpected error occurred while updating the billable.",
    };
  }
}

export type DeleteBillableResult =
  | { success: true }
  | { success: false; error: string };

export async function deleteBillable(
  id: string
): Promise<DeleteBillableResult> {
  try {
    await requireAdmin();

    const existing = await prisma.billable.findUnique({
      where: { id },
      select: { id: true, collectionItem: { select: { receipt: { select: { orNumber: true } } } } },
    });
    if (!existing) return { success: false, error: "Billable not found." };
    if (existing.collectionItem) {
      return {
        success: false,
        error: `This SI was collected on OR ${existing.collectionItem.receipt.orNumber}, so it can't be deleted.`,
      };
    }

    await prisma.billable.delete({ where: { id } });
    revalidateBookkeeping();
    return { success: true };
  } catch (error) {
    console.error("[deleteBillable]", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "An unexpected error occurred while deleting the billable.",
    };
  }
}

export type SaveDisbursementResult =
  | { success: true; disbursement: DisbursementUi }
  | { success: false; error: string };

/** Validates a disbursement form; returns the fields to write, or an error. */
function disbursementFields(input: DisbursementWriteInput) {
  const invalid =
    requireDate(input.date) ?? requirePositiveAmount(input.amount, "amount");
  if (invalid) return { ok: false as const, error: invalid };

  const payee = input.payee.trim();
  if (!payee) return { ok: false as const, error: "Payee is required." };

  return {
    ok: true as const,
    data: {
      date: new Date(input.date),
      payee,
      amount: input.amount,
      referenceNo: input.referenceNo?.trim() || null,
      invoiceNo: input.invoiceNo?.trim() || "",
      vatRegNo: input.vatRegNo?.trim() || "",
      description: input.description?.trim() || null,
    },
  };
}

export async function saveDisbursement(
  input: DisbursementWriteInput
): Promise<SaveDisbursementResult> {
  try {
    const user = await requireAdmin();
    const fields = disbursementFields(input);
    if (!fields.ok) return { success: false, error: fields.error };

    const record = await prisma.disbursement.create({
      data: { ...fields.data, createdById: user.id },
      include: bookkeepingActorInclude,
    });

    revalidateBookkeeping();
    return { success: true, disbursement: mapDisbursementToUi(record) };
  } catch (error) {
    console.error("[saveDisbursement]", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "An unexpected error occurred while saving the disbursement.",
    };
  }
}

export async function updateDisbursement(
  id: string,
  input: DisbursementWriteInput
): Promise<SaveDisbursementResult> {
  try {
    await requireAdmin();
    const fields = disbursementFields(input);
    if (!fields.ok) return { success: false, error: fields.error };

    const record = await prisma.disbursement.update({
      where: { id },
      data: fields.data,
      include: bookkeepingActorInclude,
    });

    revalidateBookkeeping();
    return { success: true, disbursement: mapDisbursementToUi(record) };
  } catch (error) {
    console.error("[updateDisbursement]", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "An unexpected error occurred while updating the disbursement.",
    };
  }
}

export type SaveCollectionReceiptResult =
  | { success: true; receipt: CollectionReceiptUi; createdClient: Client | null }
  | { success: false; error: string };

export async function saveCollectionReceipt(
  input: CollectionReceiptWriteInput
): Promise<SaveCollectionReceiptResult> {
  return writeCollectionReceipt(input, null);
}

/**
 * Edits a receipt, including which SIs it covers. SIs dropped from the receipt
 * become uncollected again; the logger stays the original one.
 */
export async function updateCollectionReceipt(
  id: string,
  input: CollectionReceiptWriteInput
): Promise<SaveCollectionReceiptResult> {
  return writeCollectionReceipt(input, id);
}

async function writeCollectionReceipt(
  input: CollectionReceiptWriteInput,
  existingId: string | null
): Promise<SaveCollectionReceiptResult> {
  try {
    const user = await requireAdmin();
    const invalid = requireDate(input.datePaid, "Date paid");
    if (invalid) return { success: false, error: invalid };
    const billableIds = [...new Set(input.billableIds ?? [])];

    const orNumber = input.orNumber.trim();
    const paymentDetails = input.paymentDetails.trim();
    const whoPaid = input.whoPaid.trim();
    const whoReceived = input.whoReceived.trim();
    if (!orNumber) return { success: false, error: "OR number is required." };
    if (!paymentDetails) {
      return { success: false, error: "Payment details are required." };
    }
    if (!whoPaid) return { success: false, error: "Who paid is required." };
    if (!whoReceived) {
      return { success: false, error: "Who received is required." };
    }

    const planned = await planClient(input.clientId, input.newClient, "Client");
    if (!planned.ok) return { success: false, error: planned.error };
    const plan = planned.plan;
    const isTemporary = plan.kind === "new" || plan.isTemporary;

    // Only one-off clients may be paid without an SI; their amount is typed in.
    let manualAmount: number | null = null;
    if (billableIds.length === 0) {
      if (!isTemporary) {
        return { success: false, error: "Select at least one SI / invoice number." };
      }
      const amount = input.collectionAmount ?? NaN;
      const invalidAmount = requirePositiveAmount(amount, "collection amount");
      if (invalidAmount) return { success: false, error: invalidAmount };
      manualAmount = roundMoney(amount);
    }

    const billables = await prisma.billable.findMany({
      where: { id: { in: billableIds } },
      select: {
        id: true,
        clientId: true,
        invoiceNo: true,
        buyerName: true,
        buyerAddress: true,
        vatRegNo: true,
        totalInvoiceAmt: true,
        withholdingTax: true,
        collectionItem: { select: { receiptId: true, receipt: { select: { orNumber: true } } } },
      },
    });
    if (billables.length !== billableIds.length) {
      return { success: false, error: "One of the selected invoices no longer exists." };
    }
    const otherClient = billables.find((b) => plan.kind === "new" || b.clientId !== plan.id);
    if (otherClient) {
      return {
        success: false,
        error: `SI ${otherClient.invoiceNo} belongs to a different client.`,
      };
    }
    // When editing, SIs already on this receipt are fine to keep.
    const collected = billables.find(
      (b) => b.collectionItem && b.collectionItem.receiptId !== existingId
    );
    if (collected) {
      return {
        success: false,
        error: `SI ${collected.invoiceNo} was already collected on OR ${collected.collectionItem!.receipt.orNumber}.`,
      };
    }

    const items = billables.map((b) => ({
      billableId: b.id,
      invoiceNo: b.invoiceNo,
      buyerName: b.buyerName,
      buyerAddress: b.buyerAddress,
      vatRegNo: b.vatRegNo,
      amountDue: billableAmountDue(b.totalInvoiceAmt, b.withholdingTax),
    }));
    // Total collection = sum of each SI's total amount due.
    const collectionAmount =
      manualAmount ?? roundMoney(items.reduce((sum, item) => sum + item.amountDue, 0));

    const { record, created } = await prisma.$transaction(async (tx) => {
      const client = await materializeClient(tx, plan);
      const fields = {
        datePaid: new Date(input.datePaid),
        orNumber,
        collectionAmount,
        paymentDetails,
        whoPaid,
        whoReceived,
        clientId: client.id,
        clientName: client.name,
      };
      if (existingId) {
        // Clear the old SI links first so re-adding the same SI doesn't trip its unique key.
        await tx.collectionReceiptItem.deleteMany({ where: { receiptId: existingId } });
        const record = await tx.collectionReceipt.update({
          where: { id: existingId },
          data: { ...fields, items: { create: items } },
          include: collectionReceiptInclude,
        });
        return { record, created: client.created };
      }
      const record = await tx.collectionReceipt.create({
        data: { ...fields, items: { create: items }, createdById: user.id },
        include: collectionReceiptInclude,
      });
      return { record, created: client.created };
    });

    revalidateBookkeeping();
    if (created) revalidateClientDirectory();
    return { success: true, receipt: mapCollectionReceiptToUi(record), createdClient: created };
  } catch (error) {
    const duplicate = uniqueConstraintMessage(
      error,
      "That OR number is already used, or one of the SIs was just collected on another receipt."
    );
    if (duplicate) return { success: false, error: duplicate };

    console.error(existingId ? "[updateCollectionReceipt]" : "[saveCollectionReceipt]", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "An unexpected error occurred while saving the collection receipt.",
    };
  }
}
