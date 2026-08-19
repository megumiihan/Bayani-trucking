import { prisma } from "@/lib/prisma";
import { mapDestinationRouteToUi } from "@/lib/mappers/route";

export async function getDestinationRoutes() {
  const records = await prisma.destinationRoute.findMany({
    orderBy: [
      { client: { name: "asc" } },
      { routeName: "asc" },
      { distance: "asc" },
    ],
    include: { client: { select: { name: true } } },
  });

  return records.map(mapDestinationRouteToUi);
}
