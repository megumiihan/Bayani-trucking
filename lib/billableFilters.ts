import type { BillableUi } from "@/lib/bookkeeping";
import {
  isWithinDateDuration,
  type DateDuration,
} from "@/lib/shipmentFilters";

export interface BillableFilters {
  clientId: string;
  dateDuration: DateDuration;
  customStartDate: string;
  customEndDate: string;
}

export const defaultBillableFilters: BillableFilters = {
  clientId: "all",
  dateDuration: "all",
  customStartDate: "",
  customEndDate: "",
};

export function filterBillables(
  billables: BillableUi[],
  filters: BillableFilters
): BillableUi[] {
  return billables.filter((billable) => {
    if (filters.clientId !== "all" && billable.clientId !== filters.clientId) {
      return false;
    }

    return isWithinDateDuration(
      billable.date,
      filters.dateDuration,
      filters.customStartDate,
      filters.customEndDate
    );
  });
}

export function hasActiveBillableFilters(filters: BillableFilters) {
  return filters.clientId !== "all" || filters.dateDuration !== "all";
}
