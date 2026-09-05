"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { mapEmployeeToUi } from "@/lib/mappers/employee";
import { trimOrNull } from "@/lib/mappers/shipmentRemarks";
import { prisma } from "@/lib/prisma";
import type { Employee } from "@/lib/mockData";

export type UpdateEmployeeRemarksResult =
  | { success: true; employee: Employee }
  | { success: false; error: string };

export async function updateEmployeeBountyExp(
  id: string,
  bountyExp: string
): Promise<UpdateEmployeeRemarksResult> {
  try {
    await requireAdmin();

    const tag = bountyExp.trim();
    if (!tag) return { success: false, error: "Bounty experience tag is required." };

    const existing = await prisma.employee.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) return { success: false, error: "Employee not found." };

    const updated = await prisma.employee.update({
      where: { id },
      data: { bountyExp: tag },
    });

    revalidatePath("/admin/employees");
    revalidatePath(`/admin/employees/${id}`);
    revalidatePath("/employee/profile");
    revalidatePath("/employee/shipments/new");
    revalidatePath("/");

    return { success: true, employee: mapEmployeeToUi(updated) };
  } catch (error) {
    console.error("[updateEmployeeBountyExp]", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "An unexpected error occurred while updating bounty experience.",
    };
  }
}

export async function updateEmployeeRemarks(
  id: string,
  remarks: string
): Promise<UpdateEmployeeRemarksResult> {
  try {
    await requireAdmin();

    const existing = await prisma.employee.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existing) {
      return { success: false, error: "Employee not found." };
    }

    const updated = await prisma.employee.update({
      where: { id },
      data: { remarks: trimOrNull(remarks) },
    });

    revalidatePath("/admin/employees");
    revalidatePath(`/admin/employees/${id}`);
    revalidatePath("/employee/profile");

    return { success: true, employee: mapEmployeeToUi(updated) };
  } catch (error) {
    console.error("[updateEmployeeRemarks]", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "An unexpected error occurred while updating employee remarks.",
    };
  }
}
