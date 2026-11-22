"use server";

import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import { requireAdmin, requireTruckLogger } from "@/lib/auth";
import { computeExpenseVat } from "@/lib/expenses";
import { prisma } from "@/lib/prisma";
import { mapTruckToUi } from "@/lib/mappers/truck";
import {
  checkInclude,
  getMaintenanceConfig,
  mapCheck,
  mapRepair,
  repairInclude,
} from "@/lib/queries/trucks";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  MAX_INTERVAL_MONTHS,
  REPAIR_TYPE_KEY,
  TRUCK_CERTIFICATE_MAX_BYTES,
  TRUCK_CERTIFICATE_TYPES,
  TRUCK_DOCUMENT_BUCKET,
  TRUCK_DOCUMENT_TYPES,
  checkItemsFor,
  truckDocumentLabel,
  type MaintenanceConfig,
} from "@/lib/truckMaintenance";
import type {
  CheckItemInput,
  CheckWriteInput,
  MaintenanceTypeInput,
  FuelWriteInput,
  NewTruckInput,
  TruckFuelEntry,
  RepairWriteInput,
  TruckCheckUi,
  TruckDetailsInput,
  TruckDocumentUi,
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

// ─── New truck ──────────────────────────────────────────────────────────────

export async function createTruck(input: NewTruckInput): Promise<Result<{ truck: Truck }>> {
  try {
    await requireAdmin();
    const thisYear = new Date().getFullYear();
    const plateNumber = input.plateNumber.trim().toUpperCase();
    const mvFileNo = input.mvFileNo.trim();
    const make = input.make.trim().toUpperCase();
    const truckType = input.truckType.trim().toUpperCase();

    if (!plateNumber) return { success: false, error: "Plate number is required." };
    if (!mvFileNo) return { success: false, error: "MV file no. is required." };
    if (!make) return { success: false, error: "Make is required." };
    if (!truckType) return { success: false, error: "Truck type is required." };
    if (!Number.isInteger(input.yearModel) || input.yearModel < 1950 || input.yearModel > thisYear + 1) {
      return { success: false, error: `Year model must be between 1950 and ${thisYear + 1}.` };
    }
    if (!Number.isInteger(input.wheelCount) || input.wheelCount < 2 || input.wheelCount > 22) {
      return { success: false, error: "Wheel count must be between 2 and 22." };
    }
    if (!DATE_RE.test(input.crIssueDate)) return { success: false, error: "CR issue date is required." };
    if (!DATE_RE.test(input.firstRegistrationDate)) {
      return { success: false, error: "First registration date is required." };
    }
    if (
      input.purchaseYear !== null &&
      (!Number.isInteger(input.purchaseYear) || input.purchaseYear < 1950 || input.purchaseYear > thisYear)
    ) {
      return { success: false, error: `Purchase year must be between 1950 and ${thisYear}.` };
    }
    if (input.purchasePrice !== null && (!Number.isFinite(input.purchasePrice) || input.purchasePrice < 0)) {
      return { success: false, error: "Purchase price can't be negative." };
    }

    const duplicate = await prisma.truck.findFirst({
      where: { OR: [{ plateNumber }, { mvFileNo }] },
      select: { plateNumber: true, mvFileNo: true },
    });
    if (duplicate) {
      return {
        success: false,
        error:
          duplicate.plateNumber === plateNumber
            ? `A truck with plate ${plateNumber} already exists.`
            : `A truck with MV file no. ${mvFileNo} already exists.`,
      };
    }

    const record = await prisma.truck.create({
      data: {
        plateNumber,
        mvFileNo,
        engineNo: input.engineNo.trim().toUpperCase(),
        chassisNo: input.chassisNo.trim().toUpperCase(),
        make,
        yearModel: input.yearModel,
        truckType,
        wheelCount: input.wheelCount,
        crIssueDate: new Date(input.crIssueDate),
        firstRegistrationDate: new Date(input.firstRegistrationDate),
        purchaseYear: input.purchaseYear,
        purchasePrice: input.purchasePrice,
        isActive: true,
      },
    });
    // Truck pickers on the shipment and expense forms read the truck list.
    for (const path of ["/admin/trucks", "/", "/employee/shipments/new", "/admin/bookkeeping", "/admin/expenses"]) {
      revalidatePath(path);
    }
    return { success: true, truck: mapTruckToUi(record) };
  } catch (error) {
    return fail("createTruck", error, "Could not add the truck.");
  }
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
    const soldYear = input.isActive ? null : input.soldYear;
    if (!input.isActive) {
      if (soldYear === null) return { success: false, error: "Enter the year the truck was sold." };
      const earliest = input.purchaseYear ?? 1950;
      if (!Number.isInteger(soldYear) || soldYear < earliest || soldYear > thisYear) {
        return {
          success: false,
          error:
            input.purchaseYear !== null && soldYear < input.purchaseYear
              ? "Year sold can't be before the year purchased."
              : `Year sold must be between ${earliest} and ${thisYear}.`,
        };
      }
    }
    if (!(await truckExists(id))) return { success: false, error: "Truck not found." };

    const record = await prisma.truck.update({
      where: { id },
      data: {
        purchaseYear: input.purchaseYear,
        purchasePrice: input.purchasePrice,
        isActive: input.isActive,
        soldYear,
      },
    });
    revalidateTruck(id);
    return { success: true, truck: mapTruckToUi(record) };
  } catch (error) {
    return fail("updateTruckDetails", error, "Could not save the truck details.");
  }
}

// ─── Repairs ────────────────────────────────────────────────────────────────

/**
 * `currentType` is the repair's saved type when editing, so a repair logged under
 * a type that has since been removed can still be corrected without changing it.
 */
async function validateRepair(input: RepairWriteInput, currentType?: string) {
  if (!DATE_RE.test(input.date)) return "Date is required.";
  const type = await prisma.maintenanceType.findUnique({
    where: { key: input.maintenanceType },
    select: { archived: true },
  });
  if (!type || (type.archived && input.maintenanceType !== currentType)) {
    return "Choose a maintenance type.";
  }
  if (!Number.isFinite(input.cost) || input.cost < 0) return "Cost can't be negative.";
  return null;
}

function expenseData(plateNumber: string, input: RepairWriteInput, label: string) {
  const vat = computeExpenseVat(input.cost);
  const detail = input.description.trim();
  return {
    date: new Date(input.date),
    category: "MAINTENANCE_AND_REPAIRS" as const,
    amount: input.cost,
    address: input.shop.trim(),
    vatPurchase: vat.vatPurchase,
    inputTax: vat.inputTax,
    description: `${plateNumber}: ${label}${detail ? ` — ${detail}` : ""}`,
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
  const type = await tx.maintenanceType.findUnique({
    where: { key: input.maintenanceType },
    select: { label: true },
  });
  const data = expenseData(truck.plateNumber, input, type?.label ?? input.maintenanceType);
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
    const user = await requireTruckLogger();
    const invalid = await validateRepair(input);
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
    // Drivers and the secretary log only; corrections go through an admin.
    const user = await requireAdmin();
    const existing = await prisma.truckRepair.findUnique({
      where: { id },
      select: {
        expenseId: true,
        maintenanceType: true,
        truck: { select: { id: true, plateNumber: true } },
      },
    });
    if (!existing) return { success: false, error: "Repair not found." };
    const invalid = await validateRepair(input, existing.maintenanceType);
    if (invalid) return { success: false, error: invalid };

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

// ─── Fuel ───────────────────────────────────────────────────────────────────

/** Logs a fill-up as a FUEL expense tagged to the truck, so it shows in Bookkeeping too. */
export async function saveTruckFuel(
  truckId: string,
  input: FuelWriteInput
): Promise<Result<{ fuel: TruckFuelEntry }>> {
  try {
    const user = await requireTruckLogger();
    if (!DATE_RE.test(input.date)) return { success: false, error: "Date is required." };
    if (!Number.isFinite(input.amount) || input.amount <= 0) {
      return { success: false, error: "Amount must be more than zero." };
    }
    const truck = await truckExists(truckId);
    if (!truck) return { success: false, error: "Truck not found." };

    const vat = computeExpenseVat(input.amount);
    const record = await prisma.expense.create({
      data: {
        date: new Date(input.date),
        category: "FUEL",
        amount: input.amount,
        address: input.station.trim(),
        invoiceNo: input.invoiceNo.trim(),
        vatPurchase: vat.vatPurchase,
        inputTax: vat.inputTax,
        // Bookkeeping shows the truck from truckId, so the notes stay as typed.
        description: input.notes.trim(),
        truckId,
        createdById: user.id,
      },
      include: { createdBy: { select: { email: true, employee: { select: { fullName: true } } } } },
    });

    revalidateTruck(truckId, true);
    return {
      success: true,
      fuel: {
        id: record.id,
        date: record.date.toISOString().slice(0, 10),
        amount: record.amount,
        invoiceNo: record.invoiceNo,
        address: record.address,
        description: record.description ?? "",
        createdByName: record.createdBy.employee?.fullName ?? record.createdBy.email,
      },
    };
  } catch (error) {
    return fail("saveTruckFuel", error, "Could not save the fuel entry.");
  }
}

/** Deletes a fuel expense from the truck page. Only FUEL expenses tagged to a truck. */
export async function deleteTruckFuel(id: string): Promise<Result<object>> {
  try {
    await requireAdmin();
    const existing = await prisma.expense.findUnique({
      where: { id },
      select: { truckId: true, category: true },
    });
    if (!existing || existing.category !== "FUEL" || !existing.truckId) {
      return { success: false, error: "Fuel entry not found." };
    }
    await prisma.expense.delete({ where: { id } });
    revalidateTruck(existing.truckId, true);
    return { success: true };
  } catch (error) {
    return fail("deleteTruckFuel", error, "Could not delete the fuel entry.");
  }
}

// ─── Monthly checks ─────────────────────────────────────────────────────────

export async function saveTruckCheck(
  truckId: string,
  input: CheckWriteInput
): Promise<Result<{ check: TruckCheckUi }>> {
  try {
    const user = await requireTruckLogger();
    if (!DATE_RE.test(input.checkedAt)) return { success: false, error: "Check date is required." };
    const truck = await prisma.truck.findUnique({ where: { id: truckId }, select: { truckType: true } });
    if (!truck) return { success: false, error: "Truck not found." };

    const { checkItems } = await getMaintenanceConfig();
    const known = new Set(checkItemsFor(checkItems, truck.truckType).map((item) => item.key));
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
    // Staff and drivers may view truck papers; only admins change them.
    await requireTruckLogger();
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

// ─── Documents (title, LTFRB, NMIS, insurance) ──────────────────────────────

function isDocumentType(docType: string) {
  return TRUCK_DOCUMENT_TYPES.some((type) => type.key === docType);
}

function mapDocument(doc: {
  docType: string;
  renewalDueDate: Date;
  filePath: string | null;
  fileName: string | null;
}): TruckDocumentUi {
  return {
    docType: doc.docType,
    renewalDueDate: doc.renewalDueDate.toISOString().slice(0, 10),
    hasFile: Boolean(doc.filePath),
    fileName: doc.fileName,
  };
}

/**
 * Saves a document's renewal due date and, when FormData has a `file`, uploads it
 * (replacing any earlier file). Expects `renewalDueDate` ("YYYY-MM-DD"), optional
 * `file` (PDF, or an image already resized in the browser) and `name`.
 */
export async function saveTruckDocument(
  truckId: string,
  docType: string,
  formData: FormData
): Promise<Result<{ document: TruckDocumentUi }>> {
  try {
    await requireAdmin();
    if (!isDocumentType(docType)) return { success: false, error: "Unknown document type." };
    const due = String(formData.get("renewalDueDate") ?? "");
    if (!DATE_RE.test(due)) return { success: false, error: "Renewal due date is required." };

    const file = formData.get("file");
    const hasNewFile = file instanceof File && file.size > 0;
    if (hasNewFile) {
      if (!(TRUCK_CERTIFICATE_TYPES as readonly string[]).includes(file.type)) {
        return { success: false, error: "File must be a PDF or a JPEG, PNG or WebP image." };
      }
      if (file.size > TRUCK_CERTIFICATE_MAX_BYTES) {
        return { success: false, error: "File is too large (3.5 MB max)." };
      }
    }

    if (!(await truckExists(truckId))) return { success: false, error: "Truck not found." };
    const existing = await prisma.truckDocument.findUnique({
      where: { truckId_docType: { truckId, docType } },
      select: { filePath: true },
    });

    const storage = createSupabaseAdminClient().storage.from(TRUCK_DOCUMENT_BUCKET);
    let fileData: { filePath: string; fileName: string } | null = null;
    if (hasNewFile) {
      const path = `${truckId}/${docType.toLowerCase()}-${Date.now()}.${EXT_BY_TYPE[file.type]}`;
      const { error: uploadError } = await storage.upload(path, file, {
        contentType: file.type,
        upsert: false,
      });
      if (uploadError) return { success: false, error: `Upload failed: ${uploadError.message}` };
      const name = String(formData.get("name") ?? "").trim().slice(0, 200);
      fileData = { filePath: path, fileName: name || file.name || truckDocumentLabel(docType) };
    }

    const record = await prisma.truckDocument.upsert({
      where: { truckId_docType: { truckId, docType } },
      create: { truckId, docType, renewalDueDate: new Date(due), ...fileData },
      update: { renewalDueDate: new Date(due), ...fileData },
    });

    if (fileData && existing?.filePath) {
      const { error } = await storage.remove([existing.filePath]);
      if (error) console.error("[saveTruckDocument] remove old", existing.filePath, error);
    }

    revalidateTruck(truckId);
    return { success: true, document: mapDocument(record) };
  } catch (error) {
    return fail("saveTruckDocument", error, "Could not save the document.");
  }
}

/** Removes the document record (due date and file). */
export async function removeTruckDocument(truckId: string, docType: string): Promise<Result<object>> {
  try {
    await requireAdmin();
    const existing = await prisma.truckDocument.findUnique({
      where: { truckId_docType: { truckId, docType } },
      select: { id: true, filePath: true },
    });
    if (!existing) return { success: false, error: "Document not found." };
    await prisma.truckDocument.delete({ where: { id: existing.id } });
    if (existing.filePath) {
      const { error } = await createSupabaseAdminClient()
        .storage.from(TRUCK_DOCUMENT_BUCKET)
        .remove([existing.filePath]);
      if (error) console.error("[removeTruckDocument]", existing.filePath, error);
    }
    revalidateTruck(truckId);
    return { success: true };
  } catch (error) {
    return fail("removeTruckDocument", error, "Could not remove the document.");
  }
}

/** Short-lived link to open a document file. Generated per click; never stored. */
export async function getTruckDocumentUrl(
  truckId: string,
  docType: string
): Promise<Result<{ url: string }>> {
  try {
    // Staff and drivers may view truck papers; only admins change them.
    await requireTruckLogger();
    const doc = await prisma.truckDocument.findUnique({
      where: { truckId_docType: { truckId, docType } },
      select: { filePath: true },
    });
    if (!doc?.filePath) return { success: false, error: "No file on record." };
    const { data, error } = await createSupabaseAdminClient()
      .storage.from(TRUCK_DOCUMENT_BUCKET)
      .createSignedUrl(doc.filePath, SIGNED_URL_SECONDS);
    if (error || !data) return { success: false, error: error?.message ?? "Could not open the file." };
    return { success: true, url: data.signedUrl };
  } catch (error) {
    return fail("getTruckDocumentUrl", error, "Could not open the file.");
  }
}

// ─── Maintenance settings (applied to every truck) ──────────────────────────

const LABEL_MAX = 80;

function revalidateAllTrucks() {
  revalidatePath("/admin/trucks", "layout");
}

/** Readable, unique key for a new type or item, e.g. "WHEEL_ALIGNMENT_3f9a". */
function newKey(label: string, upper: boolean) {
  const slug = label
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 32);
  const base = upper ? slug.toUpperCase() : slug.toLowerCase();
  return `${base || "ITEM"}_${crypto.randomUUID().slice(0, 4)}`;
}

async function nextSortOrder(table: "type" | "item") {
  const agg =
    table === "type"
      ? await prisma.maintenanceType.aggregate({ _max: { sortOrder: true } })
      : await prisma.truckCheckItem.aggregate({ _max: { sortOrder: true } });
  return (agg._max.sortOrder ?? -1) + 1;
}

function cleanLabel(label: string) {
  const value = label.trim().replace(/\s+/g, " ");
  if (!value) return { error: "Name is required." };
  if (value.length > LABEL_MAX) return { error: `Keep the name under ${LABEL_MAX} characters.` };
  return { value };
}

export async function saveMaintenanceType(
  input: MaintenanceTypeInput
): Promise<Result<{ config: MaintenanceConfig }>> {
  try {
    await requireAdmin();
    const label = cleanLabel(input.label);
    if (label.error) return { success: false, error: label.error };

    const isRepair = input.key === REPAIR_TYPE_KEY;
    const interval = isRepair ? null : input.intervalMonths;
    if (
      interval !== null &&
      (!Number.isInteger(interval) || interval < 1 || interval > MAX_INTERVAL_MONTHS)
    ) {
      return { success: false, error: `Period must be 1 to ${MAX_INTERVAL_MONTHS} months.` };
    }

    const duplicate = await prisma.maintenanceType.findFirst({
      where: {
        archived: false,
        label: { equals: label.value, mode: "insensitive" },
        ...(input.key ? { key: { not: input.key } } : {}),
      },
      select: { key: true },
    });
    if (duplicate) return { success: false, error: "A type with that name already exists." };

    const data = {
      label: label.value!,
      intervalMonths: interval,
      // An unscheduled type is never due, so "mandatory" has no effect on it.
      mandatory: interval === null ? false : input.mandatory,
      reeferOnly: isRepair ? false : input.reeferOnly,
    };

    if (input.key) {
      const existing = await prisma.maintenanceType.findUnique({
        where: { key: input.key },
        select: { archived: true },
      });
      if (!existing || existing.archived) return { success: false, error: "Maintenance type not found." };
      await prisma.maintenanceType.update({ where: { key: input.key }, data });
    } else {
      await prisma.maintenanceType.create({
        data: { ...data, key: newKey(label.value!, true), sortOrder: await nextSortOrder("type") },
      });
    }

    revalidateAllTrucks();
    return { success: true, config: await getMaintenanceConfig() };
  } catch (error) {
    return fail("saveMaintenanceType", error, "Could not save the maintenance type.");
  }
}

/** Archives the type: it leaves the schedule and the repair form; logged repairs keep their label. */
export async function removeMaintenanceType(
  key: string
): Promise<Result<{ config: MaintenanceConfig }>> {
  try {
    await requireAdmin();
    if (key === REPAIR_TYPE_KEY) {
      return { success: false, error: "The unscheduled repair type can't be removed." };
    }
    const existing = await prisma.maintenanceType.findUnique({ where: { key }, select: { key: true } });
    if (!existing) return { success: false, error: "Maintenance type not found." };
    await prisma.maintenanceType.update({ where: { key }, data: { archived: true } });
    revalidateAllTrucks();
    return { success: true, config: await getMaintenanceConfig() };
  } catch (error) {
    return fail("removeMaintenanceType", error, "Could not remove the maintenance type.");
  }
}

export async function saveCheckItem(
  input: CheckItemInput
): Promise<Result<{ config: MaintenanceConfig }>> {
  try {
    await requireAdmin();
    const label = cleanLabel(input.label);
    if (label.error) return { success: false, error: label.error };

    const duplicate = await prisma.truckCheckItem.findFirst({
      where: {
        archived: false,
        label: { equals: label.value, mode: "insensitive" },
        ...(input.key ? { key: { not: input.key } } : {}),
      },
      select: { key: true },
    });
    if (duplicate) return { success: false, error: "That check is already on the list." };

    const data = { label: label.value!, reeferOnly: input.reeferOnly };
    if (input.key) {
      const existing = await prisma.truckCheckItem.findUnique({
        where: { key: input.key },
        select: { archived: true },
      });
      if (!existing || existing.archived) return { success: false, error: "Check not found." };
      await prisma.truckCheckItem.update({ where: { key: input.key }, data });
    } else {
      await prisma.truckCheckItem.create({
        data: { ...data, key: newKey(label.value!, false), sortOrder: await nextSortOrder("item") },
      });
    }

    revalidateAllTrucks();
    return { success: true, config: await getMaintenanceConfig() };
  } catch (error) {
    return fail("saveCheckItem", error, "Could not save the check.");
  }
}

/** Archives the item: it leaves the monthly checklist; past checks keep their label. */
export async function removeCheckItem(key: string): Promise<Result<{ config: MaintenanceConfig }>> {
  try {
    await requireAdmin();
    const existing = await prisma.truckCheckItem.findUnique({ where: { key }, select: { key: true } });
    if (!existing) return { success: false, error: "Check not found." };
    await prisma.truckCheckItem.update({ where: { key }, data: { archived: true } });
    revalidateAllTrucks();
    return { success: true, config: await getMaintenanceConfig() };
  } catch (error) {
    return fail("removeCheckItem", error, "Could not remove the check.");
  }
}
