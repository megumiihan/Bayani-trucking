import type { Shipment } from "./mockData";

export type DateDuration =
  | "all"
  | "today"
  | "this-week"
  | "this-month"
  | "custom";

export type StatusFilter = "all" | "flagged" | "approved";

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

    if (!matchesSearch(shipment, filters.search)) return false;

    return true;
  });
}

export function getUniqueClients(shipments: Shipment[]): string[] {
  return Array.from(new Set(shipments.map((shipment) => shipment.client))).sort();
}
