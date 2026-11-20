import { prisma } from "@/lib/prisma";
import { mapEmployeeToUi } from "@/lib/mappers/employee";

export async function getEmployees() {
  const records = await prisma.employee.findMany({
    orderBy: [{ role: "asc" }, { fullName: "asc" }],
  });

  return records.map(mapEmployeeToUi);
}

export async function getEmployeeById(id: string) {
  const record = await prisma.employee.findUnique({
    where: { id },
  });

  return record ? mapEmployeeToUi(record) : null;
}

/** Email of the employee's app login, or null if they have none. */
export async function getEmployeeLoginEmail(employeeId: string) {
  const profile = await prisma.profile.findUnique({
    where: { employeeId },
    select: { email: true },
  });

  return profile?.email ?? null;
}
