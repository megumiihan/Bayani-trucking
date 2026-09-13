import { prisma } from "@/lib/prisma";
import { mapSalaryPaymentToUi } from "@/lib/mappers/salaryPayment";

export async function getSalaryPayments() {
  const records = await prisma.salaryPayment.findMany({
    orderBy: [{ paidAt: "desc" }, { createdAt: "desc" }],
  });

  return records.map(mapSalaryPaymentToUi);
}

export async function getSalaryPaymentsForEmployee(employeeId: string) {
  const records = await prisma.salaryPayment.findMany({
    where: { employeeId },
    orderBy: [{ paidAt: "desc" }, { createdAt: "desc" }],
  });

  return records.map(mapSalaryPaymentToUi);
}
