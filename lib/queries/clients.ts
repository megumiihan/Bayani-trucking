import { prisma } from "@/lib/prisma";
import { mapClientToUi } from "@/lib/mappers/client";

export async function getClients() {
  const records = await prisma.client.findMany({
    orderBy: { name: "asc" },
  });

  return records.map(mapClientToUi);
}
