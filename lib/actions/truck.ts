"use server";

import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import { requireAdmin } from "@/lib/auth";
import { computeExpenseVat } from "@/lib/expenses";
import { prisma } from "@/lib/prisma";
import { mapTruckToUi } from "@/lib/mappers/truck";
import { checkInclude, mapCheck, mapRepair, repairInclude } from "@/lib/queries/trucks";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  CHECK_ITEMS,
  MAINTENANCE_TYPE_KEYS,
  TRUCK_CERTIFICATE_MAX_BYTES,
  TRUCK_CERTIFICATE_TYPES,
  TRUCK_DOCUMENT_BUCKET,
  maintenanceTypeLabel,
} from "@/lib/truckMaintenance";
import type {
  CheckWriteInput,
  RepairWriteInput,
  TruckCheckUi,
  TruckDetailsInput,
  TruckRepairUi,
} from "@/lib/truckRecords";
import type { Truck } from "@/lib/trucks";

type Result<T> = ({ success: true } & T) | { success: false; error: string };

const SIGNED_URL_SECONDS = 60;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function fail(scope: string, error: unknown, fallback: string) {
  console.error(`[${scope}]`, error);
  return { success: false as const, error: error instanceof Error ? error.message : fallback };
}

function revalidateTruck(truckId: string, bookkeeping = false) {
  revalidatePath("/admin/trucks");
  revalidatePath(`/admin/trucks/${truckId}`);
  if (bookkeeping) {
    revalidatePath("/admin/expenses");
    revalidatePath("/admin/bookkeeping");
  }
}

async function truckExists(id: string) {
  return prisma.truck.findUnique({
    where: { id },
    select: { id: true, plateNumber: true, certificatePath: true },
  });
}

// ─── Truck details ──────────────────────────────────────────────────────────

export async function updateTruckDetails(
  id: string,
  input: TruckDetailsInput
): Promise<Result<{ truck: Truck }>> {
  try {
    await requireAdmin();
    const thisYear = new Date().getFullYear();
    if (
      input.purchaseYear !== null &&
      (!Number.isInteger(input.purchaseYear) || input.purchaseYear < 1950 || input.purchaseYear > thisYear)
    ) {
      return { success: false, error: `Purchase year must be between 1950 and ${thisYear}.` };
    }
    if (input.purchasePrice !== null && (!Number.isFinite(input.purchasePrice) || input.purchasePrice < 0)) {
      return { success: false, error: "Purchase price can't be negative." };
    }
    if (!(await truckExists(id))) return { success: false, error: "Truck not found." };

    const record = await prisma.truck.update({
      where: { id },
      data: {
        purchaseYear: input.purchaseYear,
        purchasePrice: input.purchasePrice,
        isActive: input.isActive,
      },
    });
    revalidateTruck(id);
    return { success: true, truck: mapTruckToUi(record) };
  } catch (error) {
    return fail("updateTruckDetails", error, "Could not save the truck details.");
  }
}

// ─── Repairs ────────────────────────────────────────────────────────────────

function validateRepair(input: RepairWriteInput) {
  if (!DATE_RE.test(input.date)) return "Date is required.";
  if (!MAINTENANCE_TYPE_KEYS.includes(input.maintenanceType)) return "Choose a maintenance type.";
  if (!Number.isFinite(input.cost) || input.cost < 0) return "Cost can't be negative.";
  return null;
}

function expenseData(plateNumber: string, input: RepairWriteInput) {
  const vat = computeExpenseVat(input.cost);
  const detail = input.description.trim();
  return {
    date: new Date(input.date),
    category: "MAINTENANCE_AND_REPAIRS" as const,
    amount: input.cost,
    address: input.shop.trim(),
    vatPurchase: vat.vatPurchase,
    inputTax: vat.inputTax,
    description: `${plateNumber}: ${maintenanceTypeLabel(input.maintenanceType)}${detail ? ` — ${detail}` : ""}`,
  };
}

/**
 * Keeps the repair's bookkeeping expense in step with its cost: creates it when a
 * cost is added, updates it when it changes, deletes it when the cost goes to 0.
 */
async function syncRepairExpense(
  tx: Prisma.TransactionClient,
  truck: { id: string; plateNumber: string },
  input: RepairWriteInput,
  existingExpenseId: string | null,
  userId: string
): Promise<string | null> {
  if (input.cost <= 0) {
    if (existingExpenseId) await tx.expense.delete({ where: { id: existingExpenseId } });
    return null;
  }
  const data = expenseData(truck.plateNumber, input);
  if (existingExpenseId) {
    await tx.expense.update({ where: { id: existingExpenseId }, data });
    return existingExpenseId;
  }
  const expense = await tx.expense.create({
    data: { ...data, truckId: truck.id, createdById: userId },
    select: { id: true },
  });
  return expense.id;
}

export async function saveTruckRepair(
  truckId: string,
  input: RepairWriteInput
): Promise<Result<{ repair: TruckRepairUi }>> {
  try {
    const user = await requireAdmin();
    const invalid = validateRepair(input);
    if (invalid) return { success: false, error: invalid };
    const truck = await truckExists(truckId);
    if (!truck) return { success: false, error: "Truck not found." };

    const record = await prisma.$transaction(async (tx) => {
      const expenseId = await syncRepairExpense(tx, truck, input, null, user.id);
      return tx.truckRepair.create({
        data: {
          truckId,
          date: new Date(input.date),
          maintenanceType: input.maintenanceType,
          description: input.description.trim(),
          shop: input.shop.trim(),
          cost: input.cost,
          expenseId,
          createdById: user.id,
        },
        include: repairInclude,
      });
    });

    revalidateTruck(truckId, input.cost > 0);
    return { success: true, repair: mapRepair(record) };
  } catch (error) {
    return fail("saveTruckRepair", error, "Could not save the repair.");
  }
}

export async function updateTruckRepair(
  id: string,
  input: RepairWriteInput
): Promise<Result<{ repair: TruckRepairUi }>> {
  try {
    const user = await requireAdmin();
    const invalid = validateRepair(input);
    if (invalid) return { success: false, error: invalid };
    const existing = await prisma.truckRepair.findUnique({
      where: { id },
      select: { expenseId: true, truck: { select: { id: true, plateNumber: true } } },
    });
    if (!existing) return { success: false, error: "Repair not found." };

    const record = await prisma.$transaction(async (tx) => {
      const expenseId = await syncRepairExpense(tx, existing.truck, input, existing.expenseId, user.id);
      return tx.truckRepair.update({
        where: { id },
        data: {
          date: new Date(input.date),
          maintenanceType: input.maintenanceType,
          description: input.description.trim(),
          shop: input.shop.trim(),
          cost: input.cost,
          expenseId,
        },
        include: repairInclude,
      });
    });

    revalidateTruck(existing.truck.id, true);
    return { success: true, repair: mapRepair(record) };
  } catch (error) {
    return fail("updateTruckRepair", error, "Could not update the repair.");
  }
}

/** Deletes the repair and the bookkeeping expense it created. */
export async function deleteTruckRepair(id: string): Promise<Result<object>> {
  try {
    await requireAdmin();
    const existing = await prisma.truckRepair.findUnique({
      where: { id },
      select: { truckId: true, expenseId: true },
    });
    if (!existing) return { success: false, error: "Repair not found." };

    await prisma.$transaction(async (tx) => {
      await tx.truckRepair.delete({ where: { id } });
      if (existing.expenseId) {
        await tx.expense.deleteMany({ where: { id: existing.expenseId } });
      }
    });

    revalidateTruck(existing.truckId, Boolean(existing.expenseId));
    return { success: true };
  } catch (error) {
    return fail("deleteTruckRepair", error, "Could not delete the repair.");
  }
}

// ─── Monthly checks ─────────────────────────────────────────────────────────

export async function saveTruckCheck(
  truckId: string,
  input: CheckWriteInput
): Promise<Result<{ check: TruckCheckUi }>> {
  try {
    const user = await requireAdmin();
    if (!DATE_RE.test(input.checkedAt)) return { success: false, error: "Check date is required." };
    if (!(await truckExists(truckId))) return { success: false, error: "Truck not found." };

    const known = new Set(CHECK_ITEMS.map((item) => item.key));
    const items: Record<string, "ok" | "issue"> = {};
    for (const [key, result] of Object.entries(input.items)) {
      if (known.has(key) && (result === "ok" || result === "issue")) items[key] = result;
    }
    if (Object.keys(items).length === 0) {
      return { success: false, error: "Mark at least one item as OK or Issue." };
    }

    const record = await prisma.truckCheck.create({
      data: {
        truckId,
        checkedAt: new Date(input.checkedAt),
        items,
        notes: input.notes.trim(),
        createdById: user.id,
      },
      include: checkInclude,
    });

    revalidateTruck(truckId);
    return { success: true, check: mapCheck(record) };
  } catch (error) {
    return fail("saveTruckCheck", error, "Could not save the check.");
  }
}

export async function deleteTruckCheck(id: string): Promise<Result<object>> {
  try {
    await requireAdmin();
    const existing = await prisma.truckCheck.findUnique({ where: { id }, select: { truckId: true } });
    if (!existing) return { success: false, error: "Check not found." };
    await prisma.truckCheck.delete({ where: { id } });
    revalidateTruck(existing.truckId);
    return { success: true };
  } catch (error) {
    return fail("deleteTruckCheck", error, "Could not delete the check.");
  }
}

// ─── Certificate file ───────────────────────────────────────────────────────

const EXT_BY_TYPE: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/** Expects FormData with a `file` (PDF, or an image already resized in the browser). */
export async function uploadTruckCertificate(
  id: string,
  formData: FormData
): Promise<Result<{ truck: Truck }>> {
  try {
    await requireAdmin();
    const file = formData.get("file");
    const name = String(formData.get("name") ?? "").trim().slice(0, 200);
    if (!(file instanceof File) || file.size === 0) {
      return { success: false, error: "Choose a file." };
    }
    if (!(TRUCK_CERTIFICATE_TYPES as readonly string[]).includes(file.type)) {
      return { success: false, error: "Certificate must be a PDF or a JPEG, PNG or WebP image." };
    }
    if (file.size > TRUCK_CERTIFICATE_MAX_BYTES) {
      return { success: false, error: "File is too large (3.5 MB max)." };
    }

    const truck = await truckExists(id);
    if (!truck) return { success: false, error: "Truck not found." };

    const path = `${id}/certificate-${Date.now()}.${EXT_BY_TYPE[file.type]}`;
    const storage = createSupabaseAdminClient().storage.from(TRUCK_DOCUMENT_BUCKET);
    const { error: uploadError } = await storage.upload(path, file, {
      contentType: file.type,
      upsert: false,
    });
    if (uploadError) return { success: false, error: `Upload failed: ${uploadError.message}` };

    const record = await prisma.truck.update({
      where: { id },
      data: { certificatePath: path, certificateName: name || file.name || "Certificate" },
    });

    if (truck.certificatePath) {
      const { error } = await storage.remove([truck.certificatePath]);
      if (error) console.error("[uploadTruckCertificate] remove old", truck.certificatePath, error);
    }

    revalidateTruck(id);
    return { success: true, truck: mapTruckToUi(record) };
  } catch (error) {
    return fail("uploadTruckCertificate", error, "Could not upload the certificate.");
  }
}

export async function removeTruckCertificate(id: string): Promise<Result<{ truck: Truck }>> {
  try {
    await requireAdmin();
    const truck = await truckExists(id);
    if (!truck) return { success: false, error: "Truck not found." };

    const record = await prisma.truck.update({
      where: { id },
      data: { certificatePath: null, certificateName: null },
    });
    if (truck.certificatePath) {
      const { error } = await createSupabaseAdminClient()
        .storage.from(TRUCK_DOCUMENT_BUCKET)
        .remove([truck.certificatePath]);
      if (error) console.error("[removeTruckCertificate]", truck.certificatePath, error);
    }

    revalidateTruck(id);
    return { success: true, truck: mapTruckToUi(record) };
  } catch (error) {
    return fail("removeTruckCertificate", error, "Could not remove the certificate.");
  }
}

/** Short-lived link to open the certificate. Generated per click; never stored. */
export async function getTruckCertificateUrl(id: string): Promise<Result<{ url: string }>> {
  try {
    await requireAdmin();
    const truck = await truckExists(id);
    if (!truck?.certificatePath) return { success: false, error: "No certificate on file." };

    const { data, error } = await createSupabaseAdminClient()
      .storage.from(TRUCK_DOCUMENT_BUCKET)
      .createSignedUrl(truck.certificatePath, SIGNED_URL_SECONDS);
    if (error || !data) {
      return { success: false, error: error?.message ?? "Could not open the certificate." };
    }
    return { success: true, url: data.signedUrl };
  } catch (error) {
    return fail("getTruckCertificateUrl", error, "Could not open the certificate.");
  }
}
