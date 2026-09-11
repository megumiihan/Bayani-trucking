"use client";

import {
  defaultShipmentFilters,
  getActiveFilterChips,
  type ShipmentFilters,
} from "@/lib/shipmentFilters";

interface ActiveFilterChipsProps {
  filters: ShipmentFilters;
  onChange: (filters: ShipmentFilters) => void;
}

export default function ActiveFilterChips({
  filters,
  onChange,
}: ActiveFilterChipsProps) {
  const chips = getActiveFilterChips(filters, onChange);

  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
        Active filters
      </span>
      {chips.map((chip) => (
        <button
          key={chip.id}
          type="button"
          onClick={chip.onRemove}
          className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-800 transition-colors hover:bg-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
        >
          {chip.label}
          <span aria-hidden="true" className="text-blue-500">
            ×
          </span>
          <span className="sr-only">Remove filter</span>
        </button>
      ))}
      <button
        type="button"
        onClick={() => onChange(defaultShipmentFilters)}
        className="text-xs font-medium text-slate-500 underline-offset-2 hover:text-slate-800 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
      >
        Clear all
      </button>
    </div>
  );
}
