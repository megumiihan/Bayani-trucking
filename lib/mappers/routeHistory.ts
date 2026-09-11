import type { DestinationRateHistory as DbHistory } from "@prisma/client";

export type DestinationRateHistoryEntry = {
  id: string;
  clientId: string;
  routeName: string;
  distance: string;
  prevDriverBaseRate: number;
  prevHelperBaseRate: number;
  prevExtraHelperBaseRate: number;
  newDriverBaseRate: number;
  newHelperBaseRate: number;
  newExtraHelperBaseRate: number;
  changedAt: string;
  changedByEmail: string;
};

type DbHistoryWithUser = DbHistory & {
  changedBy: { email: string };
};

export function mapRouteHistoryToUi(
  record: DbHistoryWithUser
): DestinationRateHistoryEntry {
  return {
    id: record.id,
    clientId: record.clientId,
    routeName: record.routeName,
    distance: record.distance,
    prevDriverBaseRate: record.prevDriverBaseRate,
    prevHelperBaseRate: record.prevHelperBaseRate,
    prevExtraHelperBaseRate: record.prevExtraHelperBaseRate,
    newDriverBaseRate: record.newDriverBaseRate,
    newHelperBaseRate: record.newHelperBaseRate,
    newExtraHelperBaseRate: record.newExtraHelperBaseRate,
    changedAt: record.changedAt.toISOString(),
    changedByEmail: record.changedBy.email,
  };
}
