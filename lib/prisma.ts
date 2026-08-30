import { PrismaClient } from "@prisma/client";

const CLIENT_REV = 3;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaRev?: number;
};

function createPrismaClient() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set.");
  }
  if (!process.env.DIRECT_URL) {
    throw new Error("DIRECT_URL is not set.");
  }

  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

const cached = globalForPrisma.prisma;
// Drop a cached client that was created before a schema change.
const reusable =
  cached &&
  globalForPrisma.prismaRev === CLIENT_REV &&
  "salaryPayment" in cached &&
  "expense" in cached
    ? cached
    : undefined;

export const prisma = reusable ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  globalForPrisma.prismaRev = CLIENT_REV;
}
