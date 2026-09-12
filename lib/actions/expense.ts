"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import {
  EXPENSE_CATEGORIES,
  computeExpenseVat,
  expenseAllowsTruck,
  type ExpenseUi,
  type ExpenseWriteInput,
} from "@/lib/expenses";
import { expenseInclude, mapExpenseToUi } from "@/lib/mappers/expense";
import { prisma } from "@/lib/prisma";

function validateWrite(input: ExpenseWriteInput) {
  if (!input.date) return "Date is required.";
  if (!EXPENSE_CATEGORIES.includes(input.category)) {
    return "Choose a valid category.";
  }
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    return "Enter a total invoice amount greater than zero.";
  }
  return null;
}

function resolvedTruckId(input: ExpenseWriteInput) {
  if (!expenseAllowsTruck(input.category)) return null;
  return input.truckId || null;
}

function toWriteData(input: ExpenseWriteInput) {
  const vat = computeExpenseVat(input.amount);
  return {
    date: new Date(input.date),
    category: input.category,
    amount: input.amount,
    address: input.address?.trim() || "",
    invoiceNo: input.invoiceNo?.trim() || "",
    vatRegNo: input.vatRegNo?.trim() || "",
    vatPurchase: vat.vatPurchase,
    inputTax: vat.inputTax,
    description: input.description?.trim() || null,
    employeeId: input.employeeId || null,
    truckId: resolvedTruckId(input),
    isReimbursed: input.reimbursed,
    isCredit: input.credit,
  };
}

async function assertEmployee(employeeId: string | null | undefined) {
  if (!employeeId) return null;
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: { id: true },
  });
  if (!employee) return "Employee not found.";
  return null;
}

async function assertTruck(truckId: string | null) {
  if (!truckId) return null;
  const truck = await prisma.truck.findUnique({
    where: { id: truckId },
    select: { id: true },
  });
  if (!truck) return "Truck not found.";
  return null;
}

export type SaveExpenseResult =
  | { success: true; expense: ExpenseUi }
  | { success: false; error: string };

export async function saveExpense(
  input: ExpenseWriteInput
): Promise<SaveExpenseResult> {
  try {
    const user = await requireAdmin();
    const invalid = validateWrite(input);
    if (invalid) return { success: false, error: invalid };
    const missingEmployee = await assertEmployee(input.employeeId);
    if (missingEmployee) return { success: false, error: missingEmployee };
    const missingTruck = await assertTruck(resolvedTruckId(input));
    if (missingTruck) return { success: false, error: missingTruck };

    const record = await prisma.expense.create({
      data: {
        ...toWriteData(input),
        createdById: user.id,
      },
      include: expenseInclude,
    });

    revalidatePath("/admin/expenses");
    revalidatePath("/admin/bookkeeping");

    return { success: true, expense: mapExpenseToUi(record) };
  } catch (error) {
    console.error("[saveExpense]", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "An unexpected error occurred while saving the expense.",
    };
  }
}

export async function updateExpense(
  id: string,
  input: ExpenseWriteInput
): Promise<SaveExpenseResult> {
  try {
    await requireAdmin();
    const invalid = validateWrite(input);
    if (invalid) return { success: false, error: invalid };
    const missingEmployee = await assertEmployee(input.employeeId);
    if (missingEmployee) return { success: false, error: missingEmployee };
    const missingTruck = await assertTruck(resolvedTruckId(input));
    if (missingTruck) return { success: false, error: missingTruck };

    const existing = await prisma.expense.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) return { success: false, error: "Expense not found." };

    const record = await prisma.expense.update({
      where: { id },
      data: toWriteData(input),
      include: expenseInclude,
    });

    revalidatePath("/admin/expenses");
    revalidatePath("/admin/bookkeeping");

    return { success: true, expense: mapExpenseToUi(record) };
  } catch (error) {
    console.error("[updateExpense]", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "An unexpected error occurred while updating the expense.",
    };
  }
}

export type ToggleExpenseFlagResult =
  | { success: true; expense: ExpenseUi }
  | { success: false; error: string };

export async function toggleExpenseFlag(
  id: string
): Promise<ToggleExpenseFlagResult> {
  try {
    await requireAdmin();

    const current = await prisma.expense.findUnique({
      where: { id },
      select: { isFlagged: true },
    });

    if (!current) {
      return { success: false, error: "Expense not found." };
    }

    const updated = await prisma.expense.update({
      where: { id },
      data: { isFlagged: !current.isFlagged },
      include: expenseInclude,
    });

    revalidatePath("/admin/expenses");
    revalidatePath("/admin/bookkeeping");

    return { success: true, expense: mapExpenseToUi(updated) };
  } catch (error) {
    console.error("[toggleExpenseFlag]", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "An unexpected error occurred while updating the expense.",
    };
  }
}

export type DeleteExpenseResult =
  | { success: true }
  | { success: false; error: string };

export async function deleteExpense(id: string): Promise<DeleteExpenseResult> {
  try {
    await requireAdmin();

    const existing = await prisma.expense.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) return { success: false, error: "Expense not found." };

    await prisma.expense.delete({ where: { id } });
    revalidatePath("/admin/expenses");
    revalidatePath("/admin/bookkeeping");
    return { success: true };
  } catch (error) {
    console.error("[deleteExpense]", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "An unexpected error occurred while deleting the expense.",
    };
  }
}
