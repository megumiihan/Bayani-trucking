"use client";

import type { ExpenseCategory } from "@prisma/client";
import {
  EXPENSE_CATEGORIES,
  EXPENSE_CATEGORY_LABELS,
} from "@/lib/expenses";
import type { ExpenseFilters } from "@/lib/expenseFilters";
import type { DateDuration } from "@/lib/shipmentFilters";
import { filterInputClass } from "@/components/ui/formStyles";

interface ExpenseFiltersBarProps {
  filters: ExpenseFilters;
  onChange: (filters: ExpenseFilters) => void;
}

export default function ExpenseFiltersBar({
  filters,
  onChange,
}: ExpenseFiltersBarProps) {
  const update = <K extends keyof ExpenseFilters>(
    key: K,
    value: ExpenseFilters[K]
  ) => {
    onChange({ ...filters, [key]: value });
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <label>
          <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-500">
            Category
          </span>
          <select
            value={filters.category}
            onChange={(e) =>
              update("category", e.target.value as ExpenseFilters["category"])
            }
            className={filterInputClass}
          >
            <option value="all">All categories</option>
            {EXPENSE_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {EXPENSE_CATEGORY_LABELS[category as ExpenseCategory]}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-500">
            Date
          </span>
          <select
            value={filters.dateDuration}
            onChange={(e) =>
              update("dateDuration", e.target.value as DateDuration)
            }
            className={filterInputClass}
          >
            <option value="all">All time</option>
            <option value="today">Today</option>
            <option value="this-week">This week</option>
            <option value="this-month">This month</option>
            <option value="custom">Custom range</option>
          </select>
        </label>

        <label>
          <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-500">
            Search
          </span>
          <input
            type="search"
            value={filters.search}
            onChange={(e) => update("search", e.target.value)}
            placeholder="Name, invoice, VAT, description, logged by"
            className={filterInputClass}
          />
        </label>
      </div>

      {filters.dateDuration === "custom" && (
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label>
            <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-500">
              Start date
            </span>
            <input
              type="date"
              value={filters.customStartDate}
              onChange={(e) => update("customStartDate", e.target.value)}
              className={filterInputClass}
            />
          </label>
          <label>
            <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-500">
              End date
            </span>
            <input
              type="date"
              value={filters.customEndDate}
              onChange={(e) => update("customEndDate", e.target.value)}
              className={filterInputClass}
            />
          </label>
        </div>
      )}
    </div>
  );
}
