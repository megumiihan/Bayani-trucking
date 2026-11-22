/**
 * Truck maintenance rules: scheduled maintenance types, the monthly condition
 * checklist, and how "due" is worked out. Client-safe; no database access.
 *
 * Types and check items live in the database (MaintenanceType, TruckCheckItem)
 * and are edited by admins on the Trucks page. The defaults below seed an empty
 * database. Removed entries are archived, not deleted, so history keeps labels.
 *
 * Due dates are time-based only: each scheduled type repeats every
 * `intervalMonths` after the last repair of that type was logged.
 */

export interface MaintenanceType {
  key: string;
  label: string;
  /** Months between services. Null = not scheduled (one-off repairs). */
  intervalMonths: number | null;
  /** Mandatory items show as "Maintenance due"; the rest as "Check recommended". */
  mandatory: boolean;
  /** Only applies to refrigerated trucks. */
  reeferOnly: boolean;
  /** Removed by an admin. Kept only so old repairs still show their label. */
  archived: boolean;
}

export interface CheckItem {
  key: string;
  label: string;
  reeferOnly: boolean;
  /** Removed by an admin. Kept only so old checks still show their label. */
  archived: boolean;
}

export interface MaintenanceConfig {
  /** All types, archived included, in display order. */
  types: MaintenanceType[];
  /** All check items, archived included, in display order. */
  checkItems: CheckItem[];
}

/** The unscheduled catch-all type. Always present; can't be removed or scheduled. */
export const REPAIR_TYPE_KEY = "REPAIR";

/** Longest interval an admin can set, in months. */
export const MAX_INTERVAL_MONTHS = 120;

type Default<T> = Omit<T, "archived" | "reeferOnly"> & { reeferOnly?: boolean };

export const DEFAULT_MAINTENANCE_TYPES: Default<MaintenanceType>[] = [
  { key: "OIL_CHANGE", label: "Change oil & filter", intervalMonths: 3, mandatory: true },
  { key: "PMS", label: "Preventive maintenance (PMS)", intervalMonths: 6, mandatory: true },
  { key: "BRAKES", label: "Brake service", intervalMonths: 6, mandatory: true },
  { key: "REGISTRATION", label: "LTO registration renewal", intervalMonths: 12, mandatory: true },
  { key: "REEFER", label: "Reefer unit service", intervalMonths: 6, mandatory: true, reeferOnly: true },
  { key: "TIRES", label: "Tire rotation / replacement", intervalMonths: 6, mandatory: false },
  { key: "AIRCON", label: "Cab aircon cleaning", intervalMonths: 12, mandatory: false },
  { key: REPAIR_TYPE_KEY, label: "Repair (unscheduled)", intervalMonths: null, mandatory: false },
];

export const DEFAULT_CHECK_ITEMS: Default<CheckItem>[] = [
  { key: "tires", label: "Tires & air pressure" },
  { key: "brakes", label: "Brakes" },
  { key: "lights", label: "Lights & signals" },
  { key: "engineOil", label: "Engine oil level" },
  { key: "coolant", label: "Coolant & water" },
  { key: "battery", label: "Battery" },
  { key: "wipers", label: "Wipers & windshield" },
  { key: "mirrorsHorn", label: "Mirrors & horn" },
  { key: "body", label: "Body, van & doors" },
  { key: "reefer", label: "Reefer unit temperature", reeferOnly: true },
  { key: "safety", label: "Fire extinguisher & early warning device" },
  { key: "documents", label: "OR/CR & documents in truck" },
];

export function maintenanceTypeLabel(types: MaintenanceType[], key: string): string {
  return types.find((type) => type.key === key)?.label ?? key;
}

export type CheckResult = "ok" | "issue";
export type CheckItems = Record<string, CheckResult>;

export function isReefer(truckType: string): boolean {
  return /reefer/i.test(truckType);
}

/** Active types that apply to this truck. */
export function maintenanceTypesFor(types: MaintenanceType[], truckType: string): MaintenanceType[] {
  const reefer = isReefer(truckType);
  return types.filter((type) => !type.archived && (!type.reeferOnly || reefer));
}

/** Active check items that apply to this truck. */
export function checkItemsFor(items: CheckItem[], truckType: string): CheckItem[] {
  const reefer = isReefer(truckType);
  return items.filter((item) => !item.archived && (!item.reeferOnly || reefer));
}

/** Dates are "YYYY-MM-DD" strings throughout. */
export function addMonths(date: string, months: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const target = new Date(Date.UTC(y, m - 1 + months, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(d, lastDay));
  return target.toISOString().slice(0, 10);
}

export function todayISO(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

/** Items within this many days of their due date show as "due soon". */
export const DUE_SOON_DAYS = 14;

function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000);
}

export type ScheduleState = "overdue" | "due-soon" | "never" | "ok";

export interface ScheduleStatus {
  type: MaintenanceType;
  lastDone: string | null;
  nextDue: string | null;
  state: ScheduleState;
  /** Negative when overdue. */
  daysLeft: number | null;
}

/**
 * Status of every scheduled maintenance type for one truck.
 * `lastDoneByType` maps maintenance type key → latest repair date.
 */
export function getScheduleStatus(
  types: MaintenanceType[],
  truckType: string,
  lastDoneByType: Record<string, string | undefined>,
  today = todayISO()
): ScheduleStatus[] {
  return maintenanceTypesFor(types, truckType)
    .filter((type) => type.intervalMonths !== null)
    .map((type) => {
      const lastDone = lastDoneByType[type.key] ?? null;
      if (!lastDone) {
        return { type, lastDone, nextDue: null, state: "never" as const, daysLeft: null };
      }
      const nextDue = addMonths(lastDone, type.intervalMonths!);
      const daysLeft = daysBetween(today, nextDue);
      const state: ScheduleState =
        daysLeft < 0 ? "overdue" : daysLeft <= DUE_SOON_DAYS ? "due-soon" : "ok";
      return { type, lastDone, nextDue, state, daysLeft };
    });
}

export type AlertLevel = "required" | "check";

export interface TruckAlert {
  level: AlertLevel;
  label: string;
  detail: string;
}

export interface MonthlyCheckSummary {
  checkedAt: string;
  items: CheckItems;
}

/** "YYYY-MM-DD" → "Nov 20, 2026". */
export function formatShortDate(date: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Everything on a truck that needs attention, most urgent first.
 * - required: overdue mandatory maintenance, overdue document renewals, or
 *             issues from the latest check
 * - check:    mandatory maintenance due soon or never logged, overdue optional
 *             maintenance, document renewals due within RENEWAL_SOON_DAYS, and
 *             this month's condition check not yet done
 */
export function getTruckAlerts(
  config: MaintenanceConfig,
  truckType: string,
  lastDoneByType: Record<string, string | undefined>,
  latestCheck: MonthlyCheckSummary | null,
  /** Document type key → renewal due date. */
  documentDueDates: Record<string, string | undefined> = {},
  today = todayISO()
): TruckAlert[] {
  const alerts: TruckAlert[] = [];

  for (const doc of TRUCK_DOCUMENT_TYPES) {
    const due = documentDueDates[doc.key];
    if (!due) continue;
    const { state, daysLeft } = renewalState(due, today);
    if (state === "overdue") {
      alerts.push({
        level: "required",
        label: `${doc.label} renewal`,
        detail: `Overdue by ${-daysLeft} day${daysLeft === -1 ? "" : "s"} (due ${formatShortDate(due)})`,
      });
    } else if (state === "due-soon") {
      alerts.push({
        level: "check",
        label: `${doc.label} renewal`,
        detail: daysLeft === 0 ? "Due today" : `Due in ${daysLeft} day${daysLeft === 1 ? "" : "s"} (${formatShortDate(due)})`,
      });
    }
  }
  const neverLogged: string[] = [];

  for (const status of getScheduleStatus(config.types, truckType, lastDoneByType, today)) {
    const { type, state, daysLeft, nextDue } = status;
    if (state === "overdue") {
      alerts.push({
        level: type.mandatory ? "required" : "check",
        label: type.label,
        detail: `Overdue by ${-daysLeft!} day${daysLeft === -1 ? "" : "s"} (due ${formatShortDate(nextDue!)})`,
      });
    } else if (state === "due-soon" && type.mandatory) {
      alerts.push({
        level: "check",
        label: type.label,
        detail: daysLeft === 0 ? "Due today" : `Due in ${daysLeft} day${daysLeft === 1 ? "" : "s"}`,
      });
    } else if (state === "never" && type.mandatory) {
      neverLogged.push(type.label);
    }
  }

  if (neverLogged.length > 0) {
    alerts.push({
      level: "check",
      label: "No maintenance on record",
      detail: `Log the last ${neverLogged.join(", ")} to start tracking`,
    });
  }

  if (latestCheck) {
    // Issues on a check an admin has since removed no longer raise an alert.
    const labels = new Map(
      config.checkItems.filter((item) => !item.archived).map((item) => [item.key, item.label])
    );
    const issues = Object.entries(latestCheck.items)
      .filter(([key, result]) => result === "issue" && labels.has(key))
      .map(([key]) => labels.get(key)!);
    if (issues.length > 0) {
      alerts.push({
        level: "required",
        label: "Condition issues",
        detail: `${issues.join(", ")} (check on ${formatShortDate(latestCheck.checkedAt)})`,
      });
    }
  }

  if (!latestCheck || latestCheck.checkedAt.slice(0, 7) !== today.slice(0, 7)) {
    alerts.push({
      level: "check",
      label: "Monthly condition check",
      detail: latestCheck
        ? `Last done ${formatShortDate(latestCheck.checkedAt)}`
        : "Never done",
    });
  }

  return alerts.sort((a, b) => (a.level === b.level ? 0 : a.level === "required" ? -1 : 1));
}

/** Truck documents with a renewal due date, shown on the truck page (admins only). */
export const TRUCK_DOCUMENT_TYPES = [
  { key: "TITLE", label: "Title" },
  { key: "LTFRB", label: "LTFRB franchise" },
  { key: "NMIS", label: "NMIS accreditation" },
  { key: "INSURANCE", label: "Comprehensive insurance" },
] as const;

export type TruckDocumentType = (typeof TRUCK_DOCUMENT_TYPES)[number]["key"];

export function truckDocumentLabel(key: string): string {
  return TRUCK_DOCUMENT_TYPES.find((type) => type.key === key)?.label ?? key;
}

/** Renewals within this many days show as "due soon". */
export const RENEWAL_SOON_DAYS = 30;

export type RenewalState = "overdue" | "due-soon" | "ok";

export function renewalState(dueDate: string, today = todayISO()): { state: RenewalState; daysLeft: number } {
  const daysLeft = daysBetween(today, dueDate);
  return { state: daysLeft < 0 ? "overdue" : daysLeft <= RENEWAL_SOON_DAYS ? "due-soon" : "ok", daysLeft };
}

/** Private Supabase Storage bucket for truck certificates (OR/CR etc.). */
export const TRUCK_DOCUMENT_BUCKET = "truck-documents";
/** Server actions accept up to 4 MB bodies (next.config.ts); leave room for form overhead. */
export const TRUCK_CERTIFICATE_MAX_BYTES = 3.5 * 1024 * 1024;
export const TRUCK_CERTIFICATE_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;
/** Photos of certificates are resized in the browser so the longest side is at most this. */
export const TRUCK_CERTIFICATE_MAX_SIDE = 2000;
