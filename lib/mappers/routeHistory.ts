import type { DestinationRateHistory as DbHistory } from "@prisma/client";

export type DestinationRateHistoryEntry = {
  id: string;
  clientId: string;
  routeName: string;
  distance: string;
  weightKg: number | null;
  isCreated: boolean;
  prevDriverBaseRate: number;
  prevHelperBaseRate: number;
  prevExtraHelperBaseRate: number;
  newDriverBaseRate: number;
  newHelperBaseRate: number;
  newExtraHelperBaseRate: number;
  prevSameDriverRate: number | null;
  prevNewDriverRate: number | null;
  prevNewHelperRate: number | null;
  newSameDriverRate: number | null;
  newNewDriverRate: number | null;
  newNewHelperRate: number | null;
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
    weightKg: record.weightKg,
    isCreated: record.isCreated,
    prevDriverBaseRate: record.prevDriverBaseRate,
    prevHelperBaseRate: record.prevHelperBaseRate,
    prevExtraHelperBaseRate: record.prevExtraHelperBaseRate,
    newDriverBaseRate: record.newDriverBaseRate,
    newHelperBaseRate: record.newHelperBaseRate,
    newExtraHelperBaseRate: record.newExtraHelperBaseRate,
    prevSameDriverRate: record.prevSameDriverRate,
    prevNewDriverRate: record.prevNewDriverRate,
    prevNewHelperRate: record.prevNewHelperRate,
    newSameDriverRate: record.newSameDriverRate,
    newNewDriverRate: record.newNewDriverRate,
    newNewHelperRate: record.newNewHelperRate,
    changedAt: record.changedAt.toISOString(),
    changedByEmail: record.changedBy.email,
  };
}
