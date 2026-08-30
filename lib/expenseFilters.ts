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
  flaggedOnly: boolean;
}

export const defaultExpenseFilters: ExpenseFilters = {
  category: "all",
  dateDuration: "all",
  customStartDate: "",
  customEndDate: "",
  flaggedOnly: false,
};

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

    if (filters.flaggedOnly && !expense.flagged) return false;

    return true;
  });
}
