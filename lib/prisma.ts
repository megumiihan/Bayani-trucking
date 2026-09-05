import { PrismaClient } from "@prisma/client";

const CLIENT_REV = 13;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaRev?: number;
};

function runtimeDatabaseUrl() {
  const raw = process.env.DATABASE_URL;
  if (!raw) {
    throw new Error("DATABASE_URL is not set.");
  }

  // Vercel keeps connection_limit=1 so each serverless instance uses one
  // pooled slot. Local `next dev` is a long-lived process that runs several
  // queries in parallel (home page, save-then-refresh), so that single slot
  // times out against Singapore.
  if (process.env.NODE_ENV === "production") {
    return raw;
  }

  try {
    const url = new URL(raw);
    url.searchParams.set("connection_limit", "5");
    url.searchParams.set("pool_timeout", "20");
    return url.toString();
  } catch {
    return raw;
  }
}

function createPrismaClient() {
  if (!process.env.DIRECT_URL) {
    throw new Error("DIRECT_URL is not set.");
  }

  return new PrismaClient({
    datasources: { db: { url: runtimeDatabaseUrl() } },
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

if (cached && !reusable) {
  void cached.$disconnect();
}

export const prisma = reusable ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  globalForPrisma.prismaRev = CLIENT_REV;
}
