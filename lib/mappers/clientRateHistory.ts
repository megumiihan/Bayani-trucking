import type {
  ClientRateHistory as DbClientRateHistory,
  ClientRateHistoryKind,
} from "@prisma/client";

export type ClientRateHistoryEntry = {
  id: string;
  clientId: string;
  kind: ClientRateHistoryKind;
  prevPigheadDriverRate: number | null;
  prevPigheadHelperRate: number | null;
  newPigheadDriverRate: number | null;
  newPigheadHelperRate: number | null;
  prevPlatformShare: number | null;
  prevPlatformDriverRate: number | null;
  prevPlatformHelperRate: number | null;
  newPlatformShare: number | null;
  newPlatformDriverRate: number | null;
  newPlatformHelperRate: number | null;
  changedAt: string;
  changedByEmail: string;
};

type DbClientRateHistoryWithUser = DbClientRateHistory & {
  changedBy: { email: string };
};

export function mapClientRateHistoryToUi(
  record: DbClientRateHistoryWithUser
): ClientRateHistoryEntry {
  return {
    id: record.id,
    clientId: record.clientId,
    kind: record.kind,
    prevPigheadDriverRate: record.prevPigheadDriverRate,
    prevPigheadHelperRate: record.prevPigheadHelperRate,
    newPigheadDriverRate: record.newPigheadDriverRate,
    newPigheadHelperRate: record.newPigheadHelperRate,
    prevPlatformShare: record.prevPlatformShare,
    prevPlatformDriverRate: record.prevPlatformDriverRate,
    prevPlatformHelperRate: record.prevPlatformHelperRate,
    newPlatformShare: record.newPlatformShare,
    newPlatformDriverRate: record.newPlatformDriverRate,
    newPlatformHelperRate: record.newPlatformHelperRate,
    changedAt: record.changedAt.toISOString(),
    changedByEmail: record.changedBy.email,
  };
}
