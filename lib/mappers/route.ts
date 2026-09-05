import type { DestinationRoute as DbDestinationRoute } from "@prisma/client";
import type { DestinationRouteRate } from "@/lib/rates";
import { formatRouteDescription } from "@/lib/rates";

export type DbDestinationRouteWithClient = DbDestinationRoute & {
  client: { name: string };
};

export function mapDestinationRouteToUi(
  record: DbDestinationRouteWithClient
): DestinationRouteRate {
  const rate = {
    id: record.id,
    client: record.client.name,
    routeName: record.routeName,
    distance: record.distance,
    driverBaseRate: record.driverBaseRate,
    helperBaseRate: record.helperBaseRate,
    extraHelperBaseRate: record.extraHelperBaseRate,
    weightKg: record.weightKg,
    sameDriverRate: record.sameDriverRate,
    newDriverRate: record.newDriverRate,
    newHelperRate: record.newHelperRate,
  };

  return { ...rate, description: formatRouteDescription(rate) };
}
