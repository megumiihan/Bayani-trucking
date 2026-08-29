/**
 * Creates a Supabase Auth user and its Profile row in one step.
 *
 *   npx tsx scripts/provision-user.ts <email> <password> <admin|employee> ["Employee Full Name"]
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY in .env — it is only used here, never in the app.
 */
import { createClient } from "@supabase/supabase-js";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const [email, password, role, employeeName] = process.argv.slice(2);

  if (!email || !password || !role) {
    throw new Error(
      'Usage: npx tsx scripts/provision-user.ts <email> <password> <admin|employee> ["Employee Full Name"]'
    );
  }
  if (role !== "admin" && role !== "employee") {
    throw new Error('Role must be "admin" or "employee".');
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env"
    );
  }

  let employeeId: string | null = null;
  if (employeeName) {
    const employee = await prisma.employee.findFirst({
      where: { fullName: employeeName },
      select: { id: true },
    });
    if (!employee) {
      throw new Error(`No employee named "${employeeName}" exists.`);
    }
    employeeId = employee.id;
  }

  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error || !data.user) {
    throw new Error(`Could not create auth user: ${error?.message}`);
  }

  const profile = await prisma.profile.create({
    data: {
      id: data.user.id,
      email: email.toLowerCase(),
      role: role === "admin" ? "ADMIN" : "EMPLOYEE",
      employeeId,
    },
  });

  console.log(
    `Created ${profile.role} ${profile.email}` +
      (employeeName ? ` linked to ${employeeName}` : " (not linked to an employee)")
  );
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
