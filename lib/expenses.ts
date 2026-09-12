import type { ExpenseCategory } from "@prisma/client";
import {
  VAT_INCLUSIVE_DIVISOR,
  roundMoney,
} from "@/lib/bookkeeping";

export const EXPENSE_CATEGORIES = [
  "SALARY",
  "GOVERNMENT_FEES",
  "INSURANCE_FEES",
  "MAINTENANCE_AND_REPAIRS",
  "ACCIDENTS",
  "LOAN_INTERESTS",
  "FUEL",
  "OTHERS",
] as const satisfies readonly ExpenseCategory[];

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  SALARY: "Salary",
  GOVERNMENT_FEES: "Government fees",
  INSURANCE_FEES: "Insurance fees",
  MAINTENANCE_AND_REPAIRS: "Maintenance and repairs",
  ACCIDENTS: "Accidents",
  LOAN_INTERESTS: "Loan interests",
  FUEL: "Fuel",
  OTHERS: "Others",
};

export function computeExpenseVat(amount: number) {
  const vatPurchase = roundMoney(amount / VAT_INCLUSIVE_DIVISOR);
  const inputTax = roundMoney(vatPurchase * VAT_INCLUSIVE_DIVISOR);
  return { vatPurchase, inputTax };
}

export type ExpenseUi = {
  id: string;
  date: string;
  category: ExpenseCategory;
  amount: number;
  address: string;
  invoiceNo: string;
  vatRegNo: string;
  vatPurchase: number;
  inputTax: number;
  description: string;
  flagged: boolean;
  reimbursed: boolean;
  credit: boolean;
  employeeId: string | null;
  employeeName: string | null;
  truckId: string | null;
  truckLabel: string | null;
  createdByName: string;
};

export type ExpenseWriteInput = {
  date: string;
  category: ExpenseCategory;
  amount: number;
  address?: string;
  invoiceNo?: string;
  vatRegNo?: string;
  description?: string;
  employeeId?: string | null;
  truckId?: string | null;
  reimbursed: boolean;
  credit: boolean;
};

export function expenseAllowsTruck(category: ExpenseCategory) {
  return category === "MAINTENANCE_AND_REPAIRS" || category === "FUEL";
}

export function expenseCategoryLabel(category: ExpenseCategory) {
  return EXPENSE_CATEGORY_LABELS[category];
}
