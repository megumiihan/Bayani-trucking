"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin, requireStaff } from "@/lib/auth";
import {
  mapSalaryPaymentToUi,
  paymentInclude,
  type SalaryPaymentUi,
} from "@/lib/mappers/salaryPayment";
import { prisma } from "@/lib/prisma";

export type RecordSalaryPaymentResult =
  | { success: true; payment: SalaryPaymentUi }
  | { success: false; error: string };

export async function recordSalaryPayment(
  employeeId: string,
  amount: number,
  paidAt: string,
  note?: string
): Promise<RecordSalaryPaymentResult> {
  try {
    const user = await requireStaff();

    if (!Number.isFinite(amount) || amount <= 0) {
      return { success: false, error: "Enter an amount greater than zero." };
    }

    if (!paidAt) {
      return { success: false, error: "Payment date is required." };
    }

    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: { id: true },
    });

    if (!employee) {
      return { success: false, error: "Employee not found." };
    }

    const payment = await prisma.salaryPayment.create({
      data: {
        employeeId,
        amount,
        paidAt: new Date(paidAt),
        note: note?.trim() || null,
        createdById: user.id,
      },
      include: paymentInclude,
    });

    revalidatePath(`/admin/employees/${employeeId}`);
    revalidatePath("/admin/employees");
    revalidatePath("/employee/profile");

    return { success: true, payment: mapSalaryPaymentToUi(payment) };
  } catch (error) {
    console.error("[recordSalaryPayment]", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "An unexpected error occurred while recording the payout.",
    };
  }
}

/** Admin-only: correct the amount, date or note of a payout already logged. */
export async function updateSalaryPayment(
  paymentId: string,
  amount: number,
  paidAt: string,
  note?: string
): Promise<RecordSalaryPaymentResult> {
  try {
    await requireAdmin();

    if (!Number.isFinite(amount) || amount <= 0) {
      return { success: false, error: "Enter an amount greater than zero." };
    }

    if (!paidAt) {
      return { success: false, error: "Payment date is required." };
    }

    const existing = await prisma.salaryPayment.findUnique({
      where: { id: paymentId },
      select: { employeeId: true },
    });

    if (!existing) {
      return { success: false, error: "Payout not found." };
    }

    const payment = await prisma.salaryPayment.update({
      where: { id: paymentId },
      data: {
        amount,
        paidAt: new Date(paidAt),
        note: note?.trim() || null,
      },
      include: paymentInclude,
    });

    revalidatePath(`/admin/employees/${existing.employeeId}`);
    revalidatePath("/admin/employees");
    revalidatePath("/employee/profile");

    return { success: true, payment: mapSalaryPaymentToUi(payment) };
  } catch (error) {
    console.error("[updateSalaryPayment]", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "An unexpected error occurred while updating the payout.",
    };
  }
}
