import { prisma } from "@/lib/prisma";
import { mapShipmentLogToShipment } from "@/lib/mappers/shipmentLog";

export async function getShipments() {
  const records = await prisma.shipmentLog.findMany({
    include: {
      client: { select: { name: true } },
    },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });

  return records.map(mapShipmentLogToShipment);
}
