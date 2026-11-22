import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { mapTruckToUi } from "@/lib/mappers/truck";
import { mapShipmentLogToShipment } from "@/lib/mappers/shipmentLog";
import {
  DEFAULT_CHECK_ITEMS,
  DEFAULT_MAINTENANCE_TYPES,
  REPAIR_TYPE_KEY,
  type CheckItems,
  type MaintenanceConfig,
} from "@/lib/truckMaintenance";
import type {
  TruckCheckUi,
  TruckDocumentUi,
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

/**
 * Maintenance types and check items, archived ones included. Seeds the defaults
 * the first time a table is empty (archived rows count, so removing every entry
 * doesn't bring the defaults back).
 */
export async function getMaintenanceConfig(): Promise<MaintenanceConfig> {
  const [typeCount, itemCount] = await Promise.all([
    prisma.maintenanceType.count(),
    prisma.truckCheckItem.count(),
  ]);
  if (typeCount === 0) {
    await prisma.maintenanceType.createMany({
      data: DEFAULT_MAINTENANCE_TYPES.map((type, index) => ({
        ...type,
        reeferOnly: type.reeferOnly ?? false,
        sortOrder: index,
      })),
      skipDuplicates: true,
    });
  }
  if (itemCount === 0) {
    await prisma.truckCheckItem.createMany({
      data: DEFAULT_CHECK_ITEMS.map((item, index) => ({
        ...item,
        reeferOnly: item.reeferOnly ?? false,
        sortOrder: index,
      })),
      skipDuplicates: true,
    });
  }

  const order = [{ sortOrder: "asc" as const }, { createdAt: "asc" as const }];
  const [types, checkItems] = await Promise.all([
    prisma.maintenanceType.findMany({ orderBy: order }),
    prisma.truckCheckItem.findMany({ orderBy: order }),
  ]);

  // The unscheduled type is the repair form's default; make sure it always exists.
  if (!types.some((type) => type.key === REPAIR_TYPE_KEY)) {
    const repair = DEFAULT_MAINTENANCE_TYPES.find((type) => type.key === REPAIR_TYPE_KEY)!;
    types.push(
      await prisma.maintenanceType.create({
        data: { ...repair, reeferOnly: false, sortOrder: types.length },
      })
    );
  }

  return {
    types: types.map(({ key, label, intervalMonths, mandatory, reeferOnly, archived }) => ({
      key,
      label,
      intervalMonths,
      mandatory,
      reeferOnly,
      archived: key === REPAIR_TYPE_KEY ? false : archived,
    })),
    checkItems: checkItems.map(({ key, label, reeferOnly, archived }) => ({
      key,
      label,
      reeferOnly,
      archived,
    })),
  };
}

export async function getTrucks() {
  const records = await prisma.truck.findMany({
    orderBy: [{ plateNumber: "asc" }],
  });

  return records.map(mapTruckToUi);
}

/** One row per truck with everything the overview list and maintenance board need. */
export async function getTruckOverview(): Promise<TruckOverviewRow[]> {
  const [trucks, repairs, checks, shipmentCounts, unlinkedShipmentCounts, fuel, documents] = await Promise.all([
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
    prisma.truckDocument.findMany({ select: { truckId: true, docType: true, renewalDueDate: true } }),
  ]);

  return trucks.map((record) => {
    const documentDueDates: Record<string, string> = {};
    for (const doc of documents) {
      if (doc.truckId === record.id) documentDueDates[doc.docType] = iso(doc.renewalDueDate);
    }
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
      documentDueDates,
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

  const [repairs, checks, fuelRecords, shipmentRecords, documentRecords] = await Promise.all([
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
      include: { createdBy: creatorSelect },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    }),
    prisma.shipmentLog.findMany({
      where: { OR: [{ truckId: id }, { truckId: null, plateNumber: record.plateNumber }] },
      include: { client: { select: { name: true } } },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    }),
    prisma.truckDocument.findMany({ where: { truckId: id } }),
  ]);

  const documents: TruckDocumentUi[] = documentRecords.map((doc) => ({
    docType: doc.docType,
    renewalDueDate: iso(doc.renewalDueDate),
    hasFile: Boolean(doc.filePath),
    fileName: doc.fileName,
  }));

  const fuel: TruckFuelEntry[] = fuelRecords.map((expense) => ({
    id: expense.id,
    date: iso(expense.date),
    amount: expense.amount,
    invoiceNo: expense.invoiceNo,
    address: expense.address,
    description: expense.description ?? "",
    createdByName: creatorName(expense.createdBy),
  }));

  return {
    truck: mapTruckToUi(record),
    repairs: repairs.map(mapRepair),
    checks: checks.map(mapCheck),
    fuel,
    documents,
    shipments: shipmentRecords.map((shipment) => mapShipmentLogToShipment(shipment)),
  };
}
