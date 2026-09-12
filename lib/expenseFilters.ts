import type { ExpenseCategory } from "@prisma/client";
import type { ExpenseUi } from "@/lib/expenses";
import {
  isWithinDateDuration,
  type DateDuration,
} from "@/lib/shipmentFilters";

export interface ExpenseFilters {
  category: "all" | ExpenseCategory;
  dateDuration: DateDuration;
  customStartDate: string;
  customEndDate: string;
  nameAndAddress: string;
  invoiceNo: string;
  vatRegNo: string;
  description: string;
  loggedBy: string;
}

export const defaultExpenseFilters: ExpenseFilters = {
  category: "all",
  dateDuration: "all",
  customStartDate: "",
  customEndDate: "",
  nameAndAddress: "",
  invoiceNo: "",
  vatRegNo: "",
  description: "",
  loggedBy: "",
};

function matchesText(value: string, query: string) {
  const term = query.trim().toLowerCase();
  if (!term) return true;
  return value.toLowerCase().includes(term);
}

export function filterExpenses(
  expenses: ExpenseUi[],
  filters: ExpenseFilters
): ExpenseUi[] {
  return expenses.filter((expense) => {
    if (filters.category !== "all" && expense.category !== filters.category) {
      return false;
    }

    if (
      !isWithinDateDuration(
        expense.date,
        filters.dateDuration,
        filters.customStartDate,
        filters.customEndDate
      )
    ) {
      return false;
    }

    if (!matchesText(expense.address, filters.nameAndAddress)) return false;
    if (!matchesText(expense.invoiceNo, filters.invoiceNo)) return false;
    if (!matchesText(expense.vatRegNo, filters.vatRegNo)) return false;
    if (!matchesText(expense.description, filters.description)) return false;
    if (!matchesText(expense.createdByName, filters.loggedBy)) return false;

    return true;
  });
}

export function hasActiveExpenseFilters(filters: ExpenseFilters) {
  return (
    filters.category !== "all" ||
    filters.dateDuration !== "all" ||
    filters.nameAndAddress.trim() !== "" ||
    filters.invoiceNo.trim() !== "" ||
    filters.vatRegNo.trim() !== "" ||
    filters.description.trim() !== "" ||
    filters.loggedBy.trim() !== ""
  );
}
