/**
 * Applies prisma/rls.sql, which locks the tables against Supabase's public REST API.
 *
 *   npm run db:rls
 *
 * Run this after every `db:push` that creates or recreates a table. Prisma does not
 * manage row level security, so a recreated table comes back unprotected and is then
 * readable by anyone holding the anon key. Re-running is safe: enabling RLS on a table
 * that already has it is a no-op.
 */
import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";

// DDL cannot run through pgbouncer, so use the unpooled connection.
const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DIRECT_URL ?? process.env.DATABASE_URL } },
});

async function main() {
  const sql = readFileSync("prisma/rls.sql", "utf8")
    .split("\n")
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n");

  const statements = sql
    .split(";")
    .map((statement) => statement.trim().replace(/\s+/g, " "))
    .filter((statement) => statement.length > 0);

  const unexpected = statements.filter(
    (statement) => !statement.toUpperCase().startsWith("ALTER TABLE")
  );
  if (unexpected.length > 0) {
    throw new Error(`Refusing to run non-ALTER statement: ${unexpected[0]}`);
  }

  if (statements.length === 0) {
    throw new Error("No ALTER TABLE statements found in prisma/rls.sql");
  }

  for (const statement of statements) {
    await prisma.$executeRawUnsafe(statement);
    console.log(`applied: ${statement}`);
  }

  console.log(`\nRow level security enabled on ${statements.length} table(s).`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
