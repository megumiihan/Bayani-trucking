import { prisma } from "@/lib/prisma";
import { mapSupplierToUi } from "@/lib/mappers/supplier";

export async function getSuppliers() {
  const records = await prisma.supplier.findMany({
    orderBy: [{ name: "asc" }, { address: "asc" }],
  });
  return records.map(mapSupplierToUi);
}
