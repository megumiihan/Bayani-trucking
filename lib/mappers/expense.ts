import type { Expense, ExpenseCategory, Profile } from "@prisma/client";
import type { ExpenseUi } from "@/lib/expenses";
import { formatTruckLabel } from "@/lib/trucks";

export const expenseInclude = {
  createdBy: {
    select: { email: true, employee: { select: { fullName: true } } },
  },
  employee: { select: { id: true, fullName: true } },
  truck: {
    select: {
      id: true,
      plateNumber: true,
      make: true,
      yearModel: true,
      truckType: true,
    },
  },
} as const;

type ExpenseRecord = Expense & {
  createdBy: Pick<Profile, "email"> & {
    employee: { fullName: string } | null;
  };
  employee: { id: string; fullName: string } | null;
  truck: {
    id: string;
    plateNumber: string;
    make: string;
    yearModel: number;
    truckType: string;
  } | null;
};

export function mapExpenseToUi(record: ExpenseRecord): ExpenseUi {
  return {
    id: record.id,
    date: record.date.toISOString().slice(0, 10),
    category: record.category as ExpenseCategory,
    amount: record.amount,
    address: record.address,
    invoiceNo: record.invoiceNo,
    vatRegNo: record.vatRegNo,
    vatPurchase: record.vatPurchase,
    inputTax: record.inputTax,
    description: record.description ?? "",
    flagged: record.isFlagged,
    reimbursed: record.isReimbursed,
    credit: record.isCredit,
    employeeId: record.employee?.id ?? null,
    employeeName: record.employee?.fullName ?? null,
    truckId: record.truck?.id ?? null,
    truckLabel: record.truck ? formatTruckLabel(record.truck) : null,
    createdByName: record.createdBy.employee?.fullName ?? record.createdBy.email,
  };
}
