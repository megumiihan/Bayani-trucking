import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
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

function getPrismaClient() {
  const existing = globalForPrisma.prisma;
  if (existing) return existing;

  const client = createPrismaClient();
  // Cache in every environment so each serverless isolate reuses one client.
  globalForPrisma.prisma = client;
  return client;
}

/**
 * Lazy so a missing DIRECT_URL becomes a query-time error we can catch,
 * instead of crashing the module and returning Next's generic runtime page.
 */
export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop, _receiver) {
    const client = getPrismaClient();
    const value = Reflect.get(client, prop, client);
    return typeof value === "function" ? value.bind(client) : value;
  },
});
