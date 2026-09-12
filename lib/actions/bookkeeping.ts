"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import {
  computeBillableBreakdown,
  type BillableUi,
  type BillableWriteInput,
  type CollectionReceiptUi,
  type CollectionReceiptWriteInput,
  type DisbursementUi,
  type DisbursementWriteInput,
} from "@/lib/bookkeeping";
import {
  billableInclude,
  bookkeepingActorInclude,
  mapBillableToUi,
  mapCollectionReceiptToUi,
  mapDisbursementToUi,
} from "@/lib/mappers/bookkeeping";
import { prisma } from "@/lib/prisma";

function revalidateBookkeeping() {
  revalidatePath("/admin/bookkeeping");
}

function requireDate(date: string) {
  if (!date) return "Date is required.";
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
  | { success: true; billable: BillableUi }
  | { success: false; error: string };

type PreparedBillableWrite =
  | { ok: true; data: {
      date: Date;
      invoiceNo: string;
      vatRegNo: string;
      buyerName: string;
      buyerAddress: string;
      clientId: string;
      totalInvoiceAmt: number;
      taxableAmt: number;
      outputTax: number;
      withholdingTax: number;
      vatDeduction: boolean;
      withholdingTaxDeduction: boolean;
    } }
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
  if (!input.clientId) return { ok: false, error: "Buyer name is required." };
  if (!buyerAddress) return { ok: false, error: "Buyer address is required." };

  const client = await prisma.client.findUnique({
    where: { id: input.clientId },
    select: { id: true, name: true },
  });
  if (!client) return { ok: false, error: "Client not found." };

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
      buyerName: client.name,
      buyerAddress,
      clientId: client.id,
      totalInvoiceAmt: input.totalInvoiceAmt,
      taxableAmt: breakdown.taxableAmt,
      outputTax: breakdown.outputTax,
      withholdingTax: breakdown.withholdingTax,
      vatDeduction: input.vatDeduction,
      withholdingTaxDeduction: input.withholdingTaxDeduction,
    },
  };
}

export async function saveBillable(
  input: BillableWriteInput
): Promise<SaveBillableResult> {
  try {
    const user = await requireAdmin();
    const prepared = await prepareBillableWrite(input);
    if (!prepared.ok) return { success: false, error: prepared.error };

    const record = await prisma.billable.create({
      data: {
        ...prepared.data,
        createdById: user.id,
      },
      include: billableInclude,
    });

    revalidateBookkeeping();
    return { success: true, billable: mapBillableToUi(record) };
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

    const record = await prisma.billable.update({
      where: { id },
      data: prepared.data,
      include: billableInclude,
    });

    revalidateBookkeeping();
    return { success: true, billable: mapBillableToUi(record) };
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
      select: { id: true },
    });
    if (!existing) return { success: false, error: "Billable not found." };

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

export async function saveDisbursement(
  input: DisbursementWriteInput
): Promise<SaveDisbursementResult> {
  try {
    const user = await requireAdmin();
    const invalid =
      requireDate(input.date) ?? requirePositiveAmount(input.amount, "amount");
    if (invalid) return { success: false, error: invalid };

    const payee = input.payee.trim();
    if (!payee) return { success: false, error: "Payee is required." };

    const record = await prisma.disbursement.create({
      data: {
        date: new Date(input.date),
        payee,
        amount: input.amount,
        referenceNo: input.referenceNo?.trim() || null,
        description: input.description?.trim() || null,
        createdById: user.id,
      },
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

export type SaveCollectionReceiptResult =
  | { success: true; receipt: CollectionReceiptUi }
  | { success: false; error: string };

export async function saveCollectionReceipt(
  input: CollectionReceiptWriteInput
): Promise<SaveCollectionReceiptResult> {
  try {
    const user = await requireAdmin();
    const invalid =
      requireDate(input.date) ?? requirePositiveAmount(input.amount, "amount");
    if (invalid) return { success: false, error: invalid };

    const receivedFrom = input.receivedFrom.trim();
    const receiptNo = input.receiptNo.trim();
    if (!receivedFrom) {
      return { success: false, error: "Received from is required." };
    }
    if (!receiptNo) return { success: false, error: "Receipt no. is required." };

    const record = await prisma.collectionReceipt.create({
      data: {
        date: new Date(input.date),
        receivedFrom,
        amount: input.amount,
        receiptNo,
        description: input.description?.trim() || null,
        createdById: user.id,
      },
      include: bookkeepingActorInclude,
    });

    revalidateBookkeeping();
    return { success: true, receipt: mapCollectionReceiptToUi(record) };
  } catch (error) {
    const duplicate = uniqueConstraintMessage(
      error,
      "An entry with this receipt no. already exists."
    );
    if (duplicate) return { success: false, error: duplicate };

    console.error("[saveCollectionReceipt]", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "An unexpected error occurred while saving the collection receipt.",
    };
  }
}
