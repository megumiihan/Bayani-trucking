"use client";

import {
  EXPENSE_CATEGORIES,
  EXPENSE_CATEGORY_LABELS,
} from "@/lib/expenses";
import type { ExpenseFilters } from "@/lib/expenseFilters";
import type { DateDuration } from "@/lib/shipmentFilters";
import type { ExpenseCategory } from "@prisma/client";

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
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <label>
          <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-gray-500">
            Category
          </span>
          <select
            value={filters.category}
            onChange={(e) =>
              update("category", e.target.value as ExpenseFilters["category"])
            }
            className={inputClass}
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
          <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-gray-500">
            Date
          </span>
          <select
            value={filters.dateDuration}
            onChange={(e) =>
              update("dateDuration", e.target.value as DateDuration)
            }
            className={inputClass}
          >
            <option value="all">All time</option>
            <option value="today">Today</option>
            <option value="this-week">This week</option>
            <option value="this-month">This month</option>
            <option value="custom">Custom range</option>
          </select>
        </label>

        <label className="flex items-end pb-2">
          <span className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={filters.flaggedOnly}
              onChange={(e) => update("flaggedOnly", e.target.checked)}
              className="rounded border-gray-300 text-amber-600 focus:ring-amber-500"
            />
            Flagged only
          </span>
        </label>
      </div>

      {filters.dateDuration === "custom" && (
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:max-w-md">
          <label>
            <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-gray-500">
              Start date
            </span>
            <input
              type="date"
              value={filters.customStartDate}
              onChange={(e) => update("customStartDate", e.target.value)}
              className={inputClass}
            />
          </label>
          <label>
            <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-gray-500">
              End date
            </span>
            <input
              type="date"
              value={filters.customEndDate}
              onChange={(e) => update("customEndDate", e.target.value)}
              className={inputClass}
            />
          </label>
        </div>
      )}
    </div>
  );
}

const inputClass =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20";
