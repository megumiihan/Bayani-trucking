"use client";

import type { BillableFilters } from "@/lib/billableFilters";
import type { Client } from "@/lib/clients";
import type { DateDuration } from "@/lib/shipmentFilters";
import { inputClass } from "@/components/ui/formStyles";

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
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label>
          <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-500">
            Client
          </span>
          <select
            value={filters.clientId}
            onChange={(e) => update("clientId", e.target.value)}
            className={inputClass}
          >
            <option value="all">All clients</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
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
