import type { Client as DbClient } from "@prisma/client";
import type { Client } from "@/lib/clients";
import { fromPrismaCalculationType } from "@/lib/clients";

export function mapClientToUi(record: DbClient): Client {
  return {
    id: record.id,
    name: record.name,
    calculationType: fromPrismaCalculationType(record.calcType),
    pigheadDriverRate: record.pigheadDriverRate,
    pigheadHelperRate: record.pigheadHelperRate,
    platformShare: record.platformShare,
    platformDriverRate: record.platformDriverRate,
    platformHelperRate: record.platformHelperRate,
  };
}
