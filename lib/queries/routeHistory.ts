import { prisma } from "@/lib/prisma";
import { mapRouteHistoryToUi } from "@/lib/mappers/routeHistory";

export async function getDestinationRateHistory(clientId: string) {
  const records = await prisma.destinationRateHistory.findMany({
    where: { clientId },
    orderBy: { changedAt: "desc" },
    take: 100,
    include: {
      changedBy: { select: { email: true } },
    },
  });

  return records.map(mapRouteHistoryToUi);
}
