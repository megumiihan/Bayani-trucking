"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { mapSalaryPaymentToUi, type SalaryPaymentUi } from "@/lib/mappers/salaryPayment";
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
    const user = await requireAdmin();

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
