import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { mapTruckToUi } from "@/lib/mappers/truck";
import { mapShipmentLogToShipment } from "@/lib/mappers/shipmentLog";
import type { CheckItems } from "@/lib/truckMaintenance";
import type {
  TruckCheckUi,
  TruckFuelEntry,
  TruckOverviewRow,
  TruckRepairUi,
} from "@/lib/truckRecords";

const iso = (date: Date) => date.toISOString().slice(0, 10);

const creatorSelect = {
  select: { email: true, employee: { select: { fullName: true } } },
} as const;

type Creator = { email: string; employee: { fullName: string } | null };
const creatorName = (creator: Creator) => creator.employee?.fullName ?? creator.email;

export function toCheckItems(value: Prisma.JsonValue): CheckItems {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const items: CheckItems = {};
  for (const [key, result] of Object.entries(value)) {
    if (result === "ok" || result === "issue") items[key] = result;
  }
  return items;
}

export function mapRepair(
  record: Prisma.TruckRepairGetPayload<{ include: { createdBy: typeof creatorSelect } }>
): TruckRepairUi {
  return {
    id: record.id,
    truckId: record.truckId,
    date: iso(record.date),
    maintenanceType: record.maintenanceType,
    description: record.description,
    shop: record.shop,
    cost: record.cost,
    expenseId: record.expenseId,
    createdByName: creatorName(record.createdBy),
  };
}

export function mapCheck(
  record: Prisma.TruckCheckGetPayload<{ include: { createdBy: typeof creatorSelect } }>
): TruckCheckUi {
  return {
    id: record.id,
    truckId: record.truckId,
    checkedAt: iso(record.checkedAt),
    items: toCheckItems(record.items),
    notes: record.notes,
    createdByName: creatorName(record.createdBy),
  };
}

export const repairInclude = { createdBy: creatorSelect } as const;
export const checkInclude = { createdBy: creatorSelect } as const;

export async function getTrucks() {
  const records = await prisma.truck.findMany({
    orderBy: [{ plateNumber: "asc" }],
  });

  return records.map(mapTruckToUi);
}

/** One row per truck with everything the overview list and maintenance board need. */
export async function getTruckOverview(): Promise<TruckOverviewRow[]> {
  const [trucks, repairs, checks, shipmentCounts, unlinkedShipmentCounts, fuel] = await Promise.all([
    prisma.truck.findMany({ orderBy: [{ plateNumber: "asc" }] }),
    prisma.truckRepair.groupBy({
      by: ["truckId", "maintenanceType"],
      _max: { date: true },
      _sum: { cost: true },
    }),
    prisma.truckCheck.findMany({
      orderBy: [{ checkedAt: "desc" }, { createdAt: "desc" }],
      distinct: ["truckId"],
      select: { truckId: true, checkedAt: true, items: true },
    }),
    prisma.shipmentLog.groupBy({
      by: ["truckId"],
      where: { truckId: { not: null } },
      _count: { _all: true },
    }),
    // Older logs only carry the plate snapshot.
    prisma.shipmentLog.groupBy({
      by: ["plateNumber"],
      where: { truckId: null },
      _count: { _all: true },
    }),
    prisma.expense.groupBy({
      by: ["truckId"],
      where: { truckId: { not: null }, category: "FUEL" },
      _sum: { amount: true },
    }),
  ]);

  return trucks.map((record) => {
    const lastDoneByType: Record<string, string> = {};
    let lastMaintenance: string | null = null;
    let repairTotal = 0;
    for (const group of repairs) {
      if (group.truckId !== record.id || !group._max.date) continue;
      const date = iso(group._max.date);
      lastDoneByType[group.maintenanceType] = date;
      if (!lastMaintenance || date > lastMaintenance) lastMaintenance = date;
      repairTotal += group._sum.cost ?? 0;
    }
    const check = checks.find((c) => c.truckId === record.id);

    return {
      truck: mapTruckToUi(record),
      lastMaintenance,
      lastDoneByType,
      latestCheck: check
        ? { checkedAt: iso(check.checkedAt), items: toCheckItems(check.items) }
        : null,
      shipmentCount:
        (shipmentCounts.find((s) => s.truckId === record.id)?._count._all ?? 0) +
        (unlinkedShipmentCounts.find((s) => s.plateNumber === record.plateNumber)?._count._all ?? 0),
      fuelTotal: fuel.find((f) => f.truckId === record.id)?._sum.amount ?? 0,
      repairTotal,
    };
  });
}

export async function getTruckDetail(id: string) {
  const record = await prisma.truck.findUnique({ where: { id } });
  if (!record) return null;

  const [repairs, checks, fuelRecords, shipmentRecords] = await Promise.all([
    prisma.truckRepair.findMany({
      where: { truckId: id },
      include: repairInclude,
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    }),
    prisma.truckCheck.findMany({
      where: { truckId: id },
      include: checkInclude,
      orderBy: [{ checkedAt: "desc" }, { createdAt: "desc" }],
      take: 12,
    }),
    prisma.expense.findMany({
      where: { truckId: id, category: "FUEL" },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    }),
    prisma.shipmentLog.findMany({
      where: { OR: [{ truckId: id }, { truckId: null, plateNumber: record.plateNumber }] },
      include: { client: { select: { name: true } } },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    }),
  ]);

  const fuel: TruckFuelEntry[] = fuelRecords.map((expense) => ({
    id: expense.id,
    date: iso(expense.date),
    amount: expense.amount,
    invoiceNo: expense.invoiceNo,
    address: expense.address,
    description: expense.description ?? "",
  }));

  return {
    truck: mapTruckToUi(record),
    repairs: repairs.map(mapRepair),
    checks: checks.map(mapCheck),
    fuel,
    shipments: shipmentRecords.map((shipment) => mapShipmentLogToShipment(shipment)),
  };
}
