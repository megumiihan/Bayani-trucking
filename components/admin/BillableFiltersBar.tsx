"use client";

import type { BillableFilters } from "@/lib/billableFilters";
import type { Client } from "@/lib/clients";
import type { DateDuration } from "@/lib/shipmentFilters";
import { filterInputClass } from "@/components/ui/formStyles";
import MultiSelect from "@/components/ui/MultiSelect";

interface BillableFiltersBarProps {
  filters: BillableFilters;
  clients: Client[];
  onChange: (filters: BillableFilters) => void;
}

export default function BillableFiltersBar({
  filters,
  clients,
  onChange,
}: BillableFiltersBarProps) {
  const update = <K extends keyof BillableFilters>(
    key: K,
    value: BillableFilters[K]
  ) => {
    onChange({ ...filters, [key]: value });
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label>
          <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-500">
            Clients
          </span>
          <MultiSelect
            aria-label="Filter by clients"
            allLabel="All clients"
            options={clients.map((client) => ({
              id: client.id,
              label: client.name,
            }))}
            value={filters.clientIds}
            onChange={(clientIds) => update("clientIds", clientIds)}
          />
        </label>

        <label>
          <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-500">
            Date
          </span>
          <select
            value={filters.dateDuration}
            onChange={(e) => {
              const dateDuration = e.target.value as DateDuration;
              onChange({
                ...filters,
                dateDuration,
                customStartDate:
                  dateDuration === "custom" ? filters.customStartDate : "",
                customEndDate:
                  dateDuration === "custom" ? filters.customEndDate : "",
              });
            }}
            className={filterInputClass}
          >
            <option value="all">All time</option>
            <option value="today">Today</option>
            <option value="this-week">This week</option>
            <option value="this-month">This month</option>
            <option value="custom">Custom range</option>
          </select>
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
              min={filters.customStartDate || undefined}
              onChange={(e) => update("customEndDate", e.target.value)}
              className={filterInputClass}
            />
          </label>
        </div>
      )}
    </div>
  );
}
