import type { ShipmentLog, Client } from "@prisma/client";
import type { Shipment } from "@/lib/mockData";
import { resolveShipmentRemarkFields } from "@/lib/mappers/shipmentRemarks";

type ShipmentLogWithClient = ShipmentLog & {
  client: Pick<Client, "name">;
};

export function mapShipmentLogToShipment(
  record: ShipmentLogWithClient,
  uploadedByName?: string
): Shipment {
  const { remarks, extraHelperNote } = resolveShipmentRemarkFields(record);

  return {
    id: record.id,
    date: record.date.toISOString().slice(0, 10),
    plateNumber: record.plateNumber,
    truckId: record.truckId,
    client: record.client.name,
    shipmentNumber: record.shipmentNumber,
    clientNumber: record.clientNumber ?? "",
    waybillNumber: record.waybillNumber ?? "",
    farthestRoute: record.routeName ?? "",
    distanceBand: record.distance,
    driver: record.driverName,
    helper: record.helperName ?? "",
    extraHelper: record.extraHelperName,
    extraHelperNote,
    remarks,
    payoutStatus: "Pending",
    flagged: record.isFlagged,
    approved: record.isApproved,
    createdAt: record.createdAt.toISOString(),
    uploadedByUserId: record.createdById,
    uploadedByName,
    driverPayout: record.driverPayout,
    helperPayout: record.helperPayout,
    extraHelperPayout: record.extraHelperPayout,
    pigheadCount: record.pigheadCount,
    platformRate: record.platformRate,
    weightKg: record.weightKg,
  };
}
