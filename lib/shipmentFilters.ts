import type { Shipment } from "./mockData";

export type DateDuration =
  | "all"
  | "today"
  | "this-week"
  | "this-month"
  | "custom";

export type StatusFilter = "all" | "flagged" | "approved" | "pending";

export type ExtraHelperFilter = "all" | "with-notes";

export interface ShipmentFilters {
  search: string;
  client: string;
  dateDuration: DateDuration;
  customStartDate: string;
  customEndDate: string;
  extraHelper: ExtraHelperFilter;
  status: StatusFilter;
}

export const defaultShipmentFilters: ShipmentFilters = {
  search: "",
  client: "all",
  dateDuration: "all",
  customStartDate: "",
  customEndDate: "",
  extraHelper: "all",
  status: "all",
};

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function startOfWeek(date: Date) {
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const start = new Date(date);
  start.setDate(date.getDate() + diff);
  return startOfDay(start);
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function parseISODate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function isWithinDateDuration(
  shipmentDate: string,
  duration: DateDuration,
  customStartDate: string,
  customEndDate: string,
  referenceDate = new Date()
): boolean {
  if (duration === "all") return true;

  const date = parseISODate(shipmentDate);
  const today = startOfDay(referenceDate);

  if (duration === "today") {
    return date.getTime() === today.getTime();
  }

  if (duration === "this-week") {
    const weekStart = startOfWeek(referenceDate);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    return date >= weekStart && date <= weekEnd;
  }

  if (duration === "this-month") {
    const monthStart = startOfMonth(referenceDate);
    const monthEnd = new Date(
      referenceDate.getFullYear(),
      referenceDate.getMonth() + 1,
      0
    );
    return date >= monthStart && date <= monthEnd;
  }

  if (duration === "custom") {
    if (customStartDate && date < parseISODate(customStartDate)) return false;
    if (customEndDate && date > parseISODate(customEndDate)) return false;
    return Boolean(customStartDate || customEndDate);
  }

  return true;
}

function matchesSearch(shipment: Shipment, search: string) {
  if (!search.trim()) return true;

  const query = search.trim().toLowerCase();
  const fields = [
    shipment.driver,
    shipment.plateNumber,
    shipment.shipmentNumber,
    shipment.waybillNumber,
  ];

  return fields.some((field) => field.toLowerCase().includes(query));
}

export function filterShipments(
  shipments: Shipment[],
  filters: ShipmentFilters
): Shipment[] {
  return shipments.filter((shipment) => {
    if (filters.client !== "all" && shipment.client !== filters.client) {
      return false;
    }

    if (
      !isWithinDateDuration(
        shipment.date,
        filters.dateDuration,
        filters.customStartDate,
        filters.customEndDate
      )
    ) {
      return false;
    }

    if (
      filters.extraHelper === "with-notes" &&
      !shipment.extraHelperNote?.trim()
    ) {
      return false;
    }

    if (filters.status === "flagged" && !shipment.flagged) return false;
    if (filters.status === "approved" && !shipment.approved) return false;
    if (filters.status === "pending" && shipment.approved) return false;

    if (!matchesSearch(shipment, filters.search)) return false;

    return true;
  });
}

export function getUniqueClients(shipments: Shipment[]): string[] {
  return Array.from(new Set(shipments.map((shipment) => shipment.client))).sort();
}

const DATE_DURATIONS: DateDuration[] = [
  "all",
  "today",
  "this-week",
  "this-month",
  "custom",
];
const STATUS_FILTERS: StatusFilter[] = ["all", "flagged", "approved", "pending"];
const EXTRA_HELPER_FILTERS: ExtraHelperFilter[] = ["all", "with-notes"];

function parseEnum<T extends string>(
  value: string | null,
  allowed: readonly T[],
  fallback: T
): T {
  if (value && (allowed as readonly string[]).includes(value)) {
    return value as T;
  }
  return fallback;
}

export function parseFiltersFromSearchParams(
  params: Pick<URLSearchParams, "get">
): ShipmentFilters {
  return {
    search: params.get("q") ?? "",
    client: params.get("client") ?? "all",
    dateDuration: parseEnum(params.get("duration"), DATE_DURATIONS, "all"),
    customStartDate: params.get("from") ?? "",
    customEndDate: params.get("to") ?? "",
    extraHelper: parseEnum(params.get("extraHelper"), EXTRA_HELPER_FILTERS, "all"),
    status: parseEnum(params.get("status"), STATUS_FILTERS, "all"),
  };
}

export function filtersToSearchParams(
  filters: ShipmentFilters
): URLSearchParams {
  const params = new URLSearchParams();

  if (filters.search.trim()) params.set("q", filters.search.trim());
  if (filters.client !== "all") params.set("client", filters.client);
  if (filters.dateDuration !== "all") params.set("duration", filters.dateDuration);
  if (filters.customStartDate) params.set("from", filters.customStartDate);
  if (filters.customEndDate) params.set("to", filters.customEndDate);
  if (filters.extraHelper !== "all") params.set("extraHelper", filters.extraHelper);
  if (filters.status !== "all") params.set("status", filters.status);

  return params;
}

const DATE_DURATION_LABELS: Record<DateDuration, string> = {
  all: "All Time",
  today: "Today",
  "this-week": "This Week",
  "this-month": "This Month",
  custom: "Custom Range",
};

const STATUS_LABELS: Record<StatusFilter, string> = {
  all: "All",
  flagged: "Flagged",
  approved: "Approved",
  pending: "Pending approval",
};

export function hasActiveFilters(filters: ShipmentFilters): boolean {
  return (
    filters.search.trim() !== "" ||
    filters.client !== "all" ||
    filters.dateDuration !== "all" ||
    filters.extraHelper !== "all" ||
    filters.status !== "all"
  );
}

export interface ActiveFilterChip {
  id: string;
  label: string;
  onRemove: () => void;
}

export function getActiveFilterChips(
  filters: ShipmentFilters,
  onChange: (filters: ShipmentFilters) => void
): ActiveFilterChip[] {
  const chips: ActiveFilterChip[] = [];

  if (filters.search.trim()) {
    chips.push({
      id: "search",
      label: `Search: ${filters.search.trim()}`,
      onRemove: () => onChange({ ...filters, search: "" }),
    });
  }

  if (filters.client !== "all") {
    chips.push({
      id: "client",
      label: `Client: ${filters.client}`,
      onRemove: () => onChange({ ...filters, client: "all" }),
    });
  }

  if (filters.dateDuration !== "all") {
    const durationLabel = DATE_DURATION_LABELS[filters.dateDuration];
    const rangeLabel =
      filters.dateDuration === "custom" &&
      (filters.customStartDate || filters.customEndDate)
        ? `${durationLabel} (${filters.customStartDate || "…"} – ${filters.customEndDate || "…"})`
        : durationLabel;

    chips.push({
      id: "duration",
      label: `Date: ${rangeLabel}`,
      onRemove: () =>
        onChange({
          ...filters,
          dateDuration: "all",
          customStartDate: "",
          customEndDate: "",
        }),
    });
  }

  if (filters.extraHelper !== "all") {
    chips.push({
      id: "extraHelper",
      label: "With extra helper notes",
      onRemove: () => onChange({ ...filters, extraHelper: "all" }),
    });
  }

  if (filters.status !== "all") {
    chips.push({
      id: "status",
      label: STATUS_LABELS[filters.status],
      onRemove: () => onChange({ ...filters, status: "all" }),
    });
  }

  return chips;
}
