import { prisma } from "@/lib/prisma";
import { mapClientToUi } from "@/lib/mappers/client";

/**
 * Regular clients only by default. Pass includeTemporary for bookkeeping and the
 * Clients & suppliers directory, where one-off "Others" clients belong.
 */
export async function getClients({ includeTemporary = false } = {}) {
  const records = await prisma.client.findMany({
    where: includeTemporary ? undefined : { isTemporary: false },
    orderBy: { name: "asc" },
  });

  return records.map(mapClientToUi);
}

export async function getClientById(id: string) {
  const record = await prisma.client.findUnique({ where: { id } });
  return record ? mapClientToUi(record) : null;
}
