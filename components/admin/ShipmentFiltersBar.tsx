"use client";

import { useId, useState } from "react";
import {
  defaultShipmentFilters,
  getActiveFilterChips,
  hasActiveFilters,
  type ShipmentFilters,
} from "@/lib/shipmentFilters";
import { inputClass } from "@/components/ui/formStyles";
import ActiveFilterChips from "@/components/admin/ActiveFilterChips";

interface ShipmentFiltersBarProps {
  filters: ShipmentFilters;
  clients: string[];
  onChange: (filters: ShipmentFilters) => void;
}

export default function ShipmentFiltersBar({
  filters,
  clients,
  onChange,
}: ShipmentFiltersBarProps) {
  const searchId = useId();
  const [expanded, setExpanded] = useState(hasActiveFilters(filters));
  const activeChips = getActiveFilterChips(filters, onChange);

  const update = <K extends keyof ShipmentFilters>(
    key: K,
    value: ShipmentFilters[K]
  ) => {
    onChange({ ...filters, [key]: value });
  };

  return (
    <div className="card-surface rounded-2xl p-4 sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Filters</h2>
          <p className="text-xs text-slate-500">Narrow the shipment table</p>
        </div>
        <div className="flex items-center gap-2">
          {hasActiveFilters(filters) && (
            <button
              type="button"
              onClick={() => onChange(defaultShipmentFilters)}
              className="text-xs font-medium text-slate-500 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
            >
              Reset
            </button>
          )}
          <button
            type="button"
            onClick={() => setExpanded((open) => !open)}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 lg:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
            aria-expanded={expanded}
          >
            {expanded ? "Hide" : "Show"} filters
          </button>
        </div>
      </div>

      <div className={`${expanded ? "block" : "hidden"} space-y-4 lg:block`}>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <label
              htmlFor={searchId}
              className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500"
            >
              Global Search
            </label>
            <div className="relative">
              <svg
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
                />
              </svg>
              <input
                id={searchId}
                name="search"
                type="search"
                placeholder="Driver, plate, shipment #, waybill #…"
                value={filters.search}
                onChange={(e) => update("search", e.target.value)}
                className={`${inputClass} pl-9`}
              />
            </div>
          </div>

          <FilterField label="Client" className="lg:col-span-2">
            <select
              name="client"
              value={filters.client}
              onChange={(e) => update("client", e.target.value)}
              className={inputClass}
            >
              <option value="all">All clients</option>
              {clients.map((client) => (
                <option key={client} value={client}>
                  {client}
                </option>
              ))}
            </select>
          </FilterField>

          <FilterField label="Date Duration" className="lg:col-span-2">
            <select
              name="duration"
              value={filters.dateDuration}
              onChange={(e) =>
                update(
                  "dateDuration",
                  e.target.value as ShipmentFilters["dateDuration"]
                )
              }
              className={inputClass}
            >
              <option value="all">All time</option>
              <option value="today">Today</option>
              <option value="this-week">This week</option>
              <option value="this-month">This month</option>
              <option value="custom">Custom range</option>
            </select>
          </FilterField>

          <FilterField label="Extra Helper" className="lg:col-span-2">
            <select
              name="extraHelper"
              value={filters.extraHelper}
              onChange={(e) =>
                update(
                  "extraHelper",
                  e.target.value as ShipmentFilters["extraHelper"]
                )
              }
              className={inputClass}
            >
              <option value="all">All shipments</option>
              <option value="with-notes">With extra helper notes</option>
            </select>
          </FilterField>

          <FilterField label="Status" className="lg:col-span-2">
            <select
              name="status"
              value={filters.status}
              onChange={(e) =>
                update("status", e.target.value as ShipmentFilters["status"])
              }
              className={inputClass}
            >
            <option value="all">All statuses</option>
            <option value="pending">Pending approval</option>
            <option value="flagged">Flagged only</option>
            <option value="approved">Approved only</option>
            </select>
          </FilterField>
        </div>

        {filters.dateDuration === "custom" && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:max-w-md">
            <FilterField label="Start Date">
              <input
                name="from"
                type="date"
                value={filters.customStartDate}
                onChange={(e) => update("customStartDate", e.target.value)}
                className={inputClass}
              />
            </FilterField>
            <FilterField label="End Date">
              <input
                name="to"
                type="date"
                value={filters.customEndDate}
                onChange={(e) => update("customEndDate", e.target.value)}
                className={inputClass}
              />
            </FilterField>
          </div>
        )}
      </div>

      {activeChips.length > 0 && (
        <div className="mt-4 border-t border-slate-100 pt-4">
          <ActiveFilterChips filters={filters} onChange={onChange} />
        </div>
      )}
    </div>
  );
}

function FilterField({
  label,
  className = "",
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </span>
      {children}
    </div>
  );
}
