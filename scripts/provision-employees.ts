/**
 * Creates a login for every active employee that doesn't have one yet.
 *
 *   npx tsx scripts/provision-employees.ts            # show what would be created
 *   npx tsx scripts/provision-employees.ts --commit   # actually create the accounts
 *
 * Passwords are stored encrypted (CREDENTIALS_ENCRYPTION_KEY) so admins can look
 * them up in the dashboard. Re-running is safe: employees who already have a
 * profile are skipped. For a single new hire, use Admin → Employees → Add employee.
 *
 * When rebuilding against a fresh Supabase project, pass a file of already-issued
 * credentials so drivers keep the passwords they were given:
 *
 *   npx tsx scripts/provision-employees.ts --commit --passwords creds.local.json
 *
 * The file maps login to password, { "juan@example.com": "Tamaraw-1234" }. Emails
 * are derived from names and so come out the same on a new project; anyone missing
 * from the file just gets a fresh password.
 */
import { PrismaClient } from "@prisma/client";
import { readFileSync } from "node:fs";
import { makeEmail, makePassword, provisionLogin } from "../lib/employeeAccounts";

const prisma = new PrismaClient();

function loadKnownPasswords(): Map<string, string> {
  const flag = process.argv.indexOf("--passwords");
  if (flag === -1) return new Map();

  const file = process.argv[flag + 1];
  if (!file) throw new Error("--passwords needs a file path");

  const parsed: unknown = JSON.parse(readFileSync(file, "utf8"));
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error(`${file} must contain a JSON object of login → password`);
  }

  return new Map(
    Object.entries(parsed as Record<string, unknown>).map(([email, password]) => {
      if (typeof password !== "string") {
        throw new Error(`Password for ${email} is not a string`);
      }
      return [email.toLowerCase(), password];
    })
  );
}

async function main() {
  const commit = process.argv.includes("--commit");
  const knownPasswords = loadKnownPasswords();

  if (knownPasswords.size > 0) {
    console.log(`Reusing ${knownPasswords.size} existing password(s) where the login matches.\n`);
  }

  const employees = await prisma.employee.findMany({
    where: { isActive: true, profile: null },
    select: { id: true, fullName: true, role: true },
    orderBy: { fullName: "asc" },
  });

  if (employees.length === 0) {
    console.log("Every active employee already has a login. Nothing to do.");
    return;
  }

  const existing = await prisma.profile.findMany({ select: { email: true } });
  const taken = new Set(existing.map((profile) => profile.email));

  const planned = employees.map((employee) => {
    const email = makeEmail(employee.fullName, taken);
    const known = knownPasswords.get(email.toLowerCase());
    return {
      ...employee,
      email,
      password: known ?? makePassword(),
      reused: known !== undefined,
    };
  });

  if (!commit) {
    console.log(
      `Would create ${planned.length} account(s). Re-run with --commit to apply.\n`
    );
  }

  const rows: Array<Record<string, string>> = [];

  for (const person of planned) {
    if (commit) {
      try {
        await provisionLogin(prisma, person, {
          email: person.email,
          password: person.password,
        });
      } catch (error) {
        console.error(
          `  ${person.fullName}: FAILED — ${error instanceof Error ? error.message : error}`
        );
        continue;
      }
    }

    rows.push({
      Employee: person.fullName,
      Role: person.role,
      Login: person.email,
      Password: person.password,
      Source: person.reused ? "existing" : "new",
    });
  }

  console.table(rows);

  if (commit) {
    const fresh = rows.filter((row) => row.Source === "new").length;
    console.log(
      `\nCreated ${rows.length} account(s), ${fresh} with a new password. ` +
        "Passwords are also stored encrypted; admins can view them on each employee's page."
    );
  }
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
