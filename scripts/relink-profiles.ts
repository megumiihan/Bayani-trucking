/**
 * Reconnects employee logins to Employee rows after a seed that deleted staff
 * and nulled Profile.employeeId.
 *
 *   npx tsx scripts/relink-profiles.ts            # dry run
 *   npx tsx scripts/relink-profiles.ts --commit
 *
 * Matching is email local-part → first name, the same rule provision-employees
 * uses when creating logins. Admin profiles without an employee stay unlinked.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function firstNameKey(fullName: string) {
  return (
    fullName.trim().split(/\s+/)[0]?.toLowerCase().replace(/[^a-z]/g, "") || ""
  );
}

async function main() {
  const commit = process.argv.includes("--commit");

  const [profiles, employees] = await Promise.all([
    prisma.profile.findMany({
      where: { role: "EMPLOYEE", employeeId: null },
      select: { id: true, email: true },
    }),
    prisma.employee.findMany({
      where: { isActive: true, profile: null },
      select: { id: true, fullName: true },
    }),
  ]);

  const unused = [...employees];
  const planned: Array<{ email: string; fullName: string; employeeId: string }> =
    [];
  const unmatched: string[] = [];

  for (const profile of profiles) {
    const local = profile.email.split("@")[0]?.toLowerCase() ?? "";
    const index = unused.findIndex((employee) => firstNameKey(employee.fullName) === local);
    if (index === -1) {
      unmatched.push(profile.email);
      continue;
    }
    const [employee] = unused.splice(index, 1);
    planned.push({
      email: profile.email,
      fullName: employee.fullName,
      employeeId: employee.id,
    });
  }

  if (planned.length === 0) {
    console.log("No unlinked employee profiles matched a staff row. Nothing to do.");
    if (unmatched.length) console.log("Unmatched:", unmatched.join(", "));
    return;
  }

  console.log(commit ? "Linking:" : "Would link:");
  console.table(planned.map(({ email, fullName }) => ({ email, fullName })));
  if (unmatched.length) console.log("Unmatched:", unmatched.join(", "));

  if (!commit) {
    console.log("\nRe-run with --commit to apply.");
    return;
  }

  for (const row of planned) {
    await prisma.profile.update({
      where: { email: row.email },
      data: { employeeId: row.employeeId },
    });
  }

  console.log(`\nLinked ${planned.length} profile(s).`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
