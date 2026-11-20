/**
 * One-off backfill: saves already-issued passwords (encrypted) onto existing
 * logins so admins can look them up in the dashboard. Does NOT change anyone's
 * password in Supabase — it only records what they were given.
 *
 *   npx tsx scripts/store-known-passwords.ts creds.local.json            # dry run
 *   npx tsx scripts/store-known-passwords.ts creds.local.json --commit   # save
 *
 * The file maps login to password, { "juan@bayanitrucking.local": "Tamaraw-1234" }.
 * Anyone not in the file can be given a new password with "Reset password" on
 * their employee page.
 */
import { PrismaClient } from "@prisma/client";
import { readFileSync } from "node:fs";
import { encryptPassword } from "../lib/credentialCrypto";

const prisma = new PrismaClient();

async function main() {
  const file = process.argv[2];
  if (!file || file.startsWith("--")) {
    throw new Error("Usage: npx tsx scripts/store-known-passwords.ts <creds.json> [--commit]");
  }
  const commit = process.argv.includes("--commit");

  const parsed: unknown = JSON.parse(readFileSync(file, "utf8"));
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error(`${file} must contain a JSON object of login → password`);
  }

  const known = new Map(
    Object.entries(parsed as Record<string, unknown>).map(([email, password]) => {
      if (typeof password !== "string") throw new Error(`Password for ${email} is not a string`);
      return [email.toLowerCase(), password];
    })
  );

  const profiles = await prisma.profile.findMany({
    select: { id: true, email: true, encryptedPassword: true },
  });

  const rows: Array<Record<string, string>> = [];
  for (const profile of profiles) {
    const password = known.get(profile.email.toLowerCase());
    if (!password) continue;

    if (commit) {
      await prisma.profile.update({
        where: { id: profile.id },
        data: { encryptedPassword: encryptPassword(password) },
      });
    }
    rows.push({
      Login: profile.email,
      Status: profile.encryptedPassword ? "overwrote stored" : "stored",
    });
  }

  console.table(rows);
  const unmatched = known.size - rows.length;
  console.log(
    `${commit ? "Saved" : "Would save"} ${rows.length} password(s).` +
      (unmatched > 0 ? ` ${unmatched} login(s) in the file have no account.` : "") +
      (commit ? "" : " Re-run with --commit to apply.")
  );
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
