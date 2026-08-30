import {
  resolveShipmentRate,
  type DestinationClient,
} from "./rates";
import { calculateDestinationPayout } from "./calculations";
import type { Shipment } from "./mockData";
import type { SalaryPaymentUi } from "./mappers/salaryPayment";

export type ShipmentRole = "Driver" | "Helper" | "Extra Helper";

export interface PayoutPreview {
  driverRate: number;
  helperRate: number;
  extraHelperRate: number;
}

export interface EmployeeShipmentEntry {
  shipment: Shipment;
  role: ShipmentRole;
  payout: number;
}

function resolveRate(client: string, routeName: string, distanceBand?: string | null) {
  return resolveShipmentRate(client, routeName, distanceBand);
}

export function getRouteRate(
  routeName: string,
  client = "Pepsi",
  distanceBand?: string | null
) {
  const rate = resolveRate(client, routeName, distanceBand);
  if (!rate) return undefined;

  return {
    routeName: rate.routeName,
    client: rate.client,
    driverBase: rate.driverBaseRate,
    helperBase: rate.helperBaseRate,
    extraHelperBase: rate.extraHelperBaseRate,
    description: rate.description,
  };
}

export function getEmployeeRoleInShipment(
  shipment: Shipment,
  employeeName: string
): ShipmentRole | null {
  if (shipment.driver === employeeName) return "Driver";
  if (shipment.helper === employeeName) return "Helper";
  if (shipment.extraHelper === employeeName) return "Extra Helper";
  return null;
}

export function getPayoutForRole(
  farthestRoute: string,
  role: ShipmentRole,
  client = "Pepsi",
  distanceBand?: string | null
): number {
  const rate = getRouteRate(farthestRoute, client, distanceBand);
  if (!rate) return 0;

  switch (role) {
    case "Driver":
      return rate.driverBase;
    case "Helper":
      return rate.helperBase;
    case "Extra Helper":
      return rate.extraHelperBase;
  }
}

export function getEmployeePayoutForShipment(
  shipment: Shipment,
  employeeName: string
): EmployeeShipmentEntry | null {
  const role = getEmployeeRoleInShipment(shipment, employeeName);
  if (!role) return null;

  let payout: number;
  if (role === "Driver" && shipment.driverPayout != null) {
    payout = shipment.driverPayout;
  } else if (role === "Helper" && shipment.helperPayout != null) {
    payout = shipment.helperPayout;
  } else if (role === "Extra Helper" && shipment.extraHelperPayout != null) {
    payout = shipment.extraHelperPayout;
  } else {
    payout = getPayoutForRole(
      shipment.farthestRoute,
      role,
      shipment.client,
      shipment.distanceBand
    );
  }

  return { shipment, role, payout };
}

export function getEmployeeShipmentEntries(
  shipments: Shipment[],
  employeeName: string
): EmployeeShipmentEntry[] {
  return shipments
    .map((shipment) => getEmployeePayoutForShipment(shipment, employeeName))
    .filter((entry): entry is EmployeeShipmentEntry => entry !== null)
    .sort(
      (a, b) =>
        new Date(b.shipment.date).getTime() - new Date(a.shipment.date).getTime()
    );
}

export function getEmployeeStats(shipments: Shipment[], employeeName: string) {
  const entries = getEmployeeShipmentEntries(shipments, employeeName);
  return {
    shipmentCount: entries.length,
    totalPayout: entries.reduce((sum, entry) => sum + entry.payout, 0),
  };
}

export type LedgerKind = "shipment" | "payment";

export interface PayoutLedgerRow {
  id: string;
  kind: LedgerKind;
  date: string;
  description: string;
  role: ShipmentRole | null;
  shipmentNumber: string | null;
  waybillNumber: string | null;
  client: string | null;
  route: string | null;
  plateNumber: string | null;
  note: string | null;
  earned: number;
  paid: number;
  balanceAfter: number;
}

export function buildPayoutLedger(
  shipments: Shipment[],
  employeeName: string,
  payments: SalaryPaymentUi[]
): PayoutLedgerRow[] {
  const earnedRows: Omit<PayoutLedgerRow, "balanceAfter">[] =
    getEmployeeShipmentEntries(shipments, employeeName).map((entry) => ({
      id: `shipment-${entry.shipment.id}-${entry.role}`,
      kind: "shipment",
      date: entry.shipment.date,
      description: `${entry.shipment.client} · ${entry.shipment.farthestRoute}`,
      role: entry.role,
      shipmentNumber: entry.shipment.shipmentNumber,
      waybillNumber: entry.shipment.waybillNumber,
      client: entry.shipment.client,
      route: entry.shipment.farthestRoute,
      plateNumber: entry.shipment.plateNumber,
      note: entry.shipment.remarks || null,
      earned: entry.payout,
      paid: 0,
    }));

  const paidRows: Omit<PayoutLedgerRow, "balanceAfter">[] = payments.map(
    (payment) => ({
      id: `payment-${payment.id}`,
      kind: "payment",
      date: payment.paidAt,
      description: "Salary payout",
      role: null,
      shipmentNumber: null,
      waybillNumber: null,
      client: null,
      route: null,
      plateNumber: null,
      note: payment.note,
      earned: 0,
      paid: payment.amount,
    })
  );

  const chronological = [...earnedRows, ...paidRows].sort((a, b) => {
    const byDate = a.date.localeCompare(b.date);
    if (byDate !== 0) return byDate;
    if (a.kind !== b.kind) return a.kind === "shipment" ? -1 : 1;
    return a.id.localeCompare(b.id);
  });

  let balance = 0;
  const withBalance = chronological.map((row) => {
    balance += row.earned - row.paid;
    return { ...row, balanceAfter: balance };
  });

  return withBalance.reverse();
}

export function getMonthKey(date: string): string {
  return date.slice(0, 7);
}

export function formatMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("en-PH", {
    month: "long",
    year: "numeric",
  });
}

export function getMonthlyEarningsTotal(
  entries: EmployeeShipmentEntry[],
  monthKey: string
): number {
  return entries
    .filter((entry) => getMonthKey(entry.shipment.date) === monthKey)
    .reduce((sum, entry) => sum + entry.payout, 0);
}

export function calculatePayoutPreview(
  routeName: string,
  hasExtraHelper: boolean,
  client = "Pepsi",
  distanceBand?: string | null,
  routeId?: string
): PayoutPreview | null {
  const result = calculateDestinationPayout({
    client: client as DestinationClient,
    routeName,
    distance: distanceBand ?? "",
    routeId,
    hasExtraHelper,
  });
  if (!result) return null;

  return {
    driverRate: result.driverPayout,
    helperRate: result.helperPayout,
    extraHelperRate: result.extraHelperPayout,
  };
}

export function getDriverPayoutForShipment(
  farthestRoute: string,
  client = "Pepsi",
  distanceBand?: string | null,
  shipment?: Shipment
): number {
  if (shipment?.driverPayout != null) return shipment.driverPayout;
  return getPayoutForRole(farthestRoute, "Driver", client, distanceBand);
}

export function getHelperPayoutForShipment(
  farthestRoute: string,
  client = "Pepsi",
  distanceBand?: string | null,
  shipment?: Shipment
): number {
  if (shipment?.helperPayout != null) return shipment.helperPayout;
  return getPayoutForRole(farthestRoute, "Helper", client, distanceBand);
}

export function getExtraHelperPayoutForShipment(
  farthestRoute: string,
  client = "Pepsi",
  distanceBand?: string | null,
  shipment?: Shipment
): number {
  if (shipment?.extraHelperPayout != null) return shipment.extraHelperPayout;
  return getPayoutForRole(farthestRoute, "Extra Helper", client, distanceBand);
}

export function getShipmentTotalPayout(shipment: Shipment): number {
  if (
    shipment.driverPayout != null &&
    shipment.helperPayout != null
  ) {
    return (
      shipment.driverPayout +
      shipment.helperPayout +
      (shipment.extraHelperPayout ?? 0)
    );
  }

  const driver = getPayoutForRole(
    shipment.farthestRoute,
    "Driver",
    shipment.client,
    shipment.distanceBand
  );
  const helper = getPayoutForRole(
    shipment.farthestRoute,
    "Helper",
    shipment.client,
    shipment.distanceBand
  );
  const extra = shipment.extraHelper
    ? getPayoutForRole(
        shipment.farthestRoute,
        "Extra Helper",
        shipment.client,
        shipment.distanceBand
      )
    : 0;
  return driver + helper + extra;
}
