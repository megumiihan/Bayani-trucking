import type { Truck } from "@/lib/trucks";
import type { CheckItems } from "@/lib/truckMaintenance";

export interface TruckRepairUi {
  id: string;
  truckId: string;
  date: string;
  maintenanceType: string;
  description: string;
  shop: string;
  cost: number;
  /** Linked bookkeeping expense, created when the repair had a cost. */
  expenseId: string | null;
  createdByName: string;
}

export interface TruckCheckUi {
  id: string;
  truckId: string;
  checkedAt: string;
  items: CheckItems;
  notes: string;
  createdByName: string;
}

export interface TruckFuelEntry {
  id: string;
  date: string;
  amount: number;
  invoiceNo: string;
  address: string;
  description: string;
  createdByName: string;
}

export interface TruckOverviewRow {
  truck: Truck;
  /** Latest repair/maintenance of any type. */
  lastMaintenance: string | null;
  /** Maintenance type key → latest date done. */
  lastDoneByType: Record<string, string>;
  latestCheck: { checkedAt: string; items: CheckItems } | null;
  /** Document type key → renewal due date. */
  documentDueDates: Record<string, string>;
  shipmentCount: number;
  fuelTotal: number;
  repairTotal: number;
}

export interface RepairWriteInput {
  date: string;
  maintenanceType: string;
  description: string;
  shop: string;
  cost: number;
}

export interface CheckWriteInput {
  checkedAt: string;
  items: CheckItems;
  notes: string;
}

export interface TruckDetailsInput {
  purchaseYear: number | null;
  purchasePrice: number | null;
  isActive: boolean;
  /** Required when inactive; ignored (cleared) when active. */
  soldYear: number | null;
}

export interface FuelWriteInput {
  date: string;
  amount: number;
  /** Gas station name / location. Stored as the expense address. */
  station: string;
  invoiceNo: string;
  notes: string;
}

export interface NewTruckInput {
  plateNumber: string;
  mvFileNo: string;
  engineNo: string;
  chassisNo: string;
  make: string;
  yearModel: number;
  truckType: string;
  wheelCount: number;
  crIssueDate: string;
  firstRegistrationDate: string;
  purchaseYear: number | null;
  purchasePrice: number | null;
}

export interface MaintenanceTypeInput {
  /** Omit to add a new type. */
  key?: string;
  label: string;
  /** Months between services; null = unscheduled. */
  intervalMonths: number | null;
  mandatory: boolean;
  reeferOnly: boolean;
}

export interface CheckItemInput {
  /** Omit to add a new item. */
  key?: string;
  label: string;
  reeferOnly: boolean;
}

export interface TruckDocumentUi {
  docType: string;
  renewalDueDate: string;
  hasFile: boolean;
  fileName: string | null;
}
