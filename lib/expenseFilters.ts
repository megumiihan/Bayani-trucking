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
  search: string;
}

export const defaultExpenseFilters: ExpenseFilters = {
  category: "all",
  dateDuration: "all",
  customStartDate: "",
  customEndDate: "",
  search: "",
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

    const search = filters.search;
    if (
      !matchesText(expense.address, search) &&
      !matchesText(expense.invoiceNo, search) &&
      !matchesText(expense.vatRegNo, search) &&
      !matchesText(expense.description, search) &&
      !matchesText(expense.createdByName, search)
    ) {
      return false;
    }

    return true;
  });
}

export function hasActiveExpenseFilters(filters: ExpenseFilters) {
  return (
    filters.category !== "all" ||
    filters.dateDuration !== "all" ||
    filters.search.trim() !== ""
  );
}
