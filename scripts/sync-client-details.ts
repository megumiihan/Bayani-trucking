/**
 * Writes registered names, addresses and TINs from lib/clientDirectory.ts and
 * lib/suppliers.ts into the live database without reseeding.
 *
 * Clients: matched by short name; creates missing ones (on destination pricing).
 * Leaves rates and shipments alone.
 * Suppliers: matched by name + address (one row per branch); only adds missing
 * ones, so edits made on Bookkeeping → Clients & suppliers are never overwritten.
 *
 *   npx tsx --env-file=.env scripts/sync-client-details.ts            # dry run
 *   npx tsx --env-file=.env scripts/sync-client-details.ts --commit
 */
import { PrismaClient } from "@prisma/client";
import { CLIENT_DIRECTORY } from "../lib/clientDirectory";
import { SUPPLIER_DIRECTORY } from "../lib/suppliers";

const prisma = new PrismaClient();
const commit = process.argv.includes("--commit");
const prefix = commit ? "" : "[dry run] ";

async function main() {
  console.log("Clients");
  for (const { name, ...details } of CLIENT_DIRECTORY) {
    const existing = await prisma.client.findUnique({ where: { name } });
    const action = existing ? "update" : "create";
    console.log(`  ${prefix}${action} ${name}: ${details.legalName} | ${details.address || "—"} | ${details.tin || "—"}`);
    if (!commit) continue;
    await prisma.client.upsert({
      where: { name },
      update: details,
      create: { name, ...details },
    });
  }

  console.log("Suppliers");
  for (const supplier of SUPPLIER_DIRECTORY) {
    const existing = await prisma.supplier.findFirst({
      where: {
        name: { equals: supplier.name, mode: "insensitive" },
        address: { equals: supplier.address, mode: "insensitive" },
      },
      select: { id: true },
    });
    const label = `${supplier.name} | ${supplier.address || "—"} | ${supplier.tin || "—"}`;
    if (existing) {
      console.log(`  skip (already listed) ${label}`);
      continue;
    }
    console.log(`  ${prefix}create ${label}`);
    if (commit) await prisma.supplier.create({ data: supplier });
  }

  if (!commit) console.log("\nRe-run with --commit to write these changes.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
