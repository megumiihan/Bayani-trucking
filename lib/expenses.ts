import type { ExpenseCategory } from "@prisma/client";

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

export type ExpenseUi = {
  id: string;
  date: string;
  category: ExpenseCategory;
  amount: number;
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
