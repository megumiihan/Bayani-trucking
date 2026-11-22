import type { Supplier as DbSupplier } from "@prisma/client";
import type { Supplier } from "@/lib/suppliers";

export function mapSupplierToUi(record: DbSupplier): Supplier {
  return {
    id: record.id,
    name: record.name,
    address: record.address,
    tin: record.tin,
  };
}
