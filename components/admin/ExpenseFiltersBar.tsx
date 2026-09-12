"use client";

import type { ExpenseCategory } from "@prisma/client";
import {
  EXPENSE_CATEGORIES,
  EXPENSE_CATEGORY_LABELS,
} from "@/lib/expenses";
import type { ExpenseFilters } from "@/lib/expenseFilters";
import type { DateDuration } from "@/lib/shipmentFilters";
import { inputClass } from "@/components/ui/formStyles";

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
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <label>
          <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-500">
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
          <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-500">
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

        <label>
          <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-500">
            Name and address
          </span>
          <input
            type="search"
            value={filters.nameAndAddress}
            onChange={(e) => update("nameAndAddress", e.target.value)}
            className={inputClass}
          />
        </label>

        <label>
          <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-500">
            Invoice no.
          </span>
          <input
            type="search"
            value={filters.invoiceNo}
            onChange={(e) => update("invoiceNo", e.target.value)}
            className={inputClass}
          />
        </label>

        <label>
          <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-500">
            VAT Reg. No.
          </span>
          <input
            type="search"
            value={filters.vatRegNo}
            onChange={(e) => update("vatRegNo", e.target.value)}
            className={inputClass}
          />
        </label>

        <label>
          <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-500">
            Description
          </span>
          <input
            type="search"
            value={filters.description}
            onChange={(e) => update("description", e.target.value)}
            className={inputClass}
          />
        </label>

        <label>
          <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-500">
            Logged by
          </span>
          <input
            type="search"
            value={filters.loggedBy}
            onChange={(e) => update("loggedBy", e.target.value)}
            className={inputClass}
          />
        </label>
      </div>

      {filters.dateDuration === "custom" && (
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label>
            <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-500">
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
            <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-500">
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
