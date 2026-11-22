"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { formatTin } from "@/lib/clientDirectory";
import { mapSupplierToUi } from "@/lib/mappers/supplier";
import { prisma } from "@/lib/prisma";
import type { Supplier } from "@/lib/suppliers";

export type SupplierActionResult =
  | { success: true; supplier: Supplier }
  | { success: false; error: string };

export interface SupplierInput {
  name: string;
  address: string;
  tin: string;
}

function clean(input: SupplierInput) {
  const name = input.name.trim().replace(/\s+/g, " ");
  if (!name) throw new Error("Supplier name is required.");
  return {
    name,
    address: input.address.trim().replace(/\s+/g, " "),
    tin: formatTin(input.tin),
  };
}

/** Same name and address is the same branch; a second row would just be a copy. */
async function findDuplicate(data: { name: string; address: string }, exceptId?: string) {
  const match = await prisma.supplier.findFirst({
    where: {
      name: { equals: data.name, mode: "insensitive" },
      address: { equals: data.address, mode: "insensitive" },
      ...(exceptId ? { NOT: { id: exceptId } } : {}),
    },
    select: { id: true },
  });
  return match !== null;
}

const duplicateError = (name: string) =>
  `${name} at that address is already listed. Use a different address for another branch.`;

function revalidateSupplierPages() {
  revalidatePath("/admin/bookkeeping");
  revalidatePath("/admin/bookkeeping/directory");
}

function failure(error: unknown, fallback: string): SupplierActionResult {
  return { success: false, error: error instanceof Error ? error.message : fallback };
}

export async function createSupplier(input: SupplierInput): Promise<SupplierActionResult> {
  try {
    await requireAdmin();
    const data = clean(input);
    if (await findDuplicate(data)) return { success: false, error: duplicateError(data.name) };
    const record = await prisma.supplier.create({ data });
    revalidateSupplierPages();
    return { success: true, supplier: mapSupplierToUi(record) };
  } catch (error) {
    console.error("[createSupplier]", error);
    return failure(error, "Could not add the supplier.");
  }
}

export async function updateSupplier(
  input: SupplierInput & { id: string },
): Promise<SupplierActionResult> {
  try {
    await requireAdmin();
    const data = clean(input);
    if (await findDuplicate(data, input.id)) {
      return { success: false, error: duplicateError(data.name) };
    }
    const record = await prisma.supplier.update({ where: { id: input.id }, data });
    revalidateSupplierPages();
    return { success: true, supplier: mapSupplierToUi(record) };
  } catch (error) {
    console.error("[updateSupplier]", error);
    return failure(error, "Could not save the supplier.");
  }
}

/** Safe to delete: past expenses and disbursements keep their own copy of the details. */
export async function deleteSupplier(
  id: string,
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    await requireAdmin();
    await prisma.supplier.delete({ where: { id } });
    revalidateSupplierPages();
    return { success: true };
  } catch (error) {
    console.error("[deleteSupplier]", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Could not delete the supplier.",
    };
  }
}
