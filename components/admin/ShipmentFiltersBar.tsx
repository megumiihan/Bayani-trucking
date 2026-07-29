"use client";

import type { ShipmentFilters } from "@/lib/shipmentFilters";

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
  const update = <K extends keyof ShipmentFilters>(
    key: K,
    value: ShipmentFilters[K]
  ) => {
    onChange({ ...filters, [key]: value });
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-gray-500">
            Global Search
          </label>
          <input
            type="search"
            placeholder="Driver, plate, shipment #, waybill #..."
            value={filters.search}
            onChange={(e) => update("search", e.target.value)}
            className={inputClass}
          />
        </div>

        <FilterField label="Client" className="lg:col-span-2">
          <select
            value={filters.client}
            onChange={(e) => update("client", e.target.value)}
            className={inputClass}
          >
            <option value="all">All</option>
            {clients.map((client) => (
              <option key={client} value={client}>
                {client}
              </option>
            ))}
          </select>
        </FilterField>

        <FilterField label="Date Duration" className="lg:col-span-2">
          <select
            value={filters.dateDuration}
            onChange={(e) =>
              update("dateDuration", e.target.value as ShipmentFilters["dateDuration"])
            }
            className={inputClass}
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="this-week">This Week</option>
            <option value="this-month">This Month</option>
            <option value="custom">Custom Range</option>
          </select>
        </FilterField>

        <FilterField label="Extra Helper" className="lg:col-span-2">
          <select
            value={filters.extraHelper}
            onChange={(e) =>
              update("extraHelper", e.target.value as ShipmentFilters["extraHelper"])
            }
            className={inputClass}
          >
            <option value="all">All</option>
            <option value="with-notes">Only with Extra Helper Notes</option>
          </select>
        </FilterField>

        <FilterField label="Status" className="lg:col-span-2">
          <select
            value={filters.status}
            onChange={(e) =>
              update("status", e.target.value as ShipmentFilters["status"])
            }
            className={inputClass}
          >
            <option value="all">All</option>
            <option value="flagged">Flagged Only</option>
            <option value="approved">Approved Only</option>
          </select>
        </FilterField>
      </div>

      {filters.dateDuration === "custom" && (
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:max-w-md">
          <FilterField label="Start Date">
            <input
              type="date"
              value={filters.customStartDate}
              onChange={(e) => update("customStartDate", e.target.value)}
              className={inputClass}
            />
          </FilterField>
          <FilterField label="End Date">
            <input
              type="date"
              value={filters.customEndDate}
              onChange={(e) => update("customEndDate", e.target.value)}
              className={inputClass}
            />
          </FilterField>
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
    <label className={className}>
      <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-gray-500">
        {label}
      </span>
      {children}
    </label>
  );
}

const inputClass =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20";
