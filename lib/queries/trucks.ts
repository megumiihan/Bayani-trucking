import { prisma } from "@/lib/prisma";
import { mapTruckToUi } from "@/lib/mappers/truck";

export async function getTrucks() {
  const records = await prisma.truck.findMany({
    orderBy: [{ plateNumber: "asc" }],
  });

  return records.map(mapTruckToUi);
}
