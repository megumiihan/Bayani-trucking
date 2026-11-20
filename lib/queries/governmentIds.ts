import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { GovernmentIds } from "@/lib/governmentIds";

/** PhilHealth / SSS details for one employee. Admins only; returns null for anyone else. */
export async function getGovernmentIds(employeeId: string): Promise<GovernmentIds | null> {
  const user = await getSessionUser();
  if (user?.role !== "admin") return null;

  const record = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: {
      philhealthNumber: true,
      sssNumber: true,
      philhealthCardPath: true,
      sssCardPath: true,
    },
  });
  if (!record) return null;

  return {
    philhealthNumber: record.philhealthNumber,
    sssNumber: record.sssNumber,
    hasPhilhealthCard: Boolean(record.philhealthCardPath),
    hasSssCard: Boolean(record.sssCardPath),
  };
}
