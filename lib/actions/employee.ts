"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { mapEmployeeToUi } from "@/lib/mappers/employee";
import { trimOrNull } from "@/lib/mappers/shipmentRemarks";
import { prisma } from "@/lib/prisma";
import { BOUNTY_EXP_NEW, BOUNTY_EXP_OLD } from "@/lib/weight";
import type { Employee } from "@/lib/mockData";

export type UpdateEmployeeRemarksResult =
  | { success: true; employee: Employee }
  | { success: false; error: string };

export interface EmployeeDetailsInput {
  name: string;
  role: "Driver" | "Helper";
  bountyExp: string;
  isActive: boolean;
}

export async function updateEmployeeDetails(
  id: string,
  input: EmployeeDetailsInput
): Promise<UpdateEmployeeRemarksResult> {
  try {
    await requireAdmin();

    const fullName = input.name.trim().replace(/\s+/g, " ");
    if (!fullName) return { success: false, error: "Name is required." };
    if (input.role !== "Driver" && input.role !== "Helper") {
      return { success: false, error: "Role must be Driver or Helper." };
    }
    if (input.bountyExp !== BOUNTY_EXP_OLD && input.bountyExp !== BOUNTY_EXP_NEW) {
      return { success: false, error: "Choose a bounty experience." };
    }

    const existing = await prisma.employee.findUnique({
      where: { id },
      select: { fullName: true },
    });
    if (!existing) return { success: false, error: "Employee not found." };

    const oldName = existing.fullName;
    const renamed = fullName !== oldName;

    if (renamed) {
      const clash = await prisma.employee.findFirst({
        where: { id: { not: id }, fullName: { equals: fullName, mode: "insensitive" } },
        select: { id: true },
      });
      if (clash) {
        return { success: false, error: `Another employee is already named "${fullName}".` };
      }
    }

    // Shipments keep a snapshot of crew names and payouts are matched by name,
    // so a rename has to carry over to this employee's existing shipments.
    const updated = await prisma.$transaction(async (tx) => {
      if (renamed) {
        await tx.shipmentLog.updateMany({
          where: { OR: [{ driverId: id }, { driverId: null, driverName: oldName }] },
          data: { driverName: fullName },
        });
        await tx.shipmentLog.updateMany({
          where: { OR: [{ helperId: id }, { helperId: null, helperName: oldName }] },
          data: { helperName: fullName },
        });
        await tx.shipmentLog.updateMany({
          where: { extraHelperName: oldName },
          data: { extraHelperName: fullName },
        });
      }

      return tx.employee.update({
        where: { id },
        data: {
          fullName,
          role: input.role === "Helper" ? "HELPER" : "DRIVER",
          bountyExp: input.bountyExp,
          isActive: input.isActive,
        },
      });
    });

    revalidatePath("/admin/employees");
    revalidatePath(`/admin/employees/${id}`);
    revalidatePath("/admin/bookkeeping");
    revalidatePath("/employee/profile");
    revalidatePath("/employee/shipments/new");
    revalidatePath("/");

    return { success: true, employee: mapEmployeeToUi(updated) };
  } catch (error) {
    console.error("[updateEmployeeDetails]", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "An unexpected error occurred while updating the employee.",
    };
  }
}

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
