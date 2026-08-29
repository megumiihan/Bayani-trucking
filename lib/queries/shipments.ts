import { prisma } from "@/lib/prisma";
import { mapShipmentLogToShipment } from "@/lib/mappers/shipmentLog";

export async function getShipments() {
  const records = await prisma.shipmentLog.findMany({
    include: {
      client: { select: { name: true } },
    },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });

  const profiles = await prisma.profile.findMany({
    where: { id: { in: [...new Set(records.map((r) => r.createdById))] } },
    select: { id: true, email: true, employee: { select: { fullName: true } } },
  });

  const nameById = new Map(
    profiles.map((profile) => [
      profile.id,
      profile.employee?.fullName ?? profile.email,
    ])
  );

  return records.map((record) =>
    mapShipmentLogToShipment(record, nameById.get(record.createdById))
  );
}
