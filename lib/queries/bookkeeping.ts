import {
  mapBillableToUi,
  mapCollectionReceiptToUi,
  mapDisbursementToUi,
  billableInclude,
  bookkeepingActorInclude,
} from "@/lib/mappers/bookkeeping";
import { prisma } from "@/lib/prisma";

export async function getBillables() {
  const records = await prisma.billable.findMany({
    include: billableInclude,
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });

  return records.map(mapBillableToUi);
}

export async function getDisbursements() {
  const records = await prisma.disbursement.findMany({
    include: bookkeepingActorInclude,
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });

  return records.map(mapDisbursementToUi);
}

export async function getCollectionReceipts() {
  const records = await prisma.collectionReceipt.findMany({
    include: bookkeepingActorInclude,
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });

  return records.map(mapCollectionReceiptToUi);
}
