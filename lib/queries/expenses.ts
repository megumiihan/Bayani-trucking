import { prisma } from "@/lib/prisma";
import { expenseInclude, mapExpenseToUi } from "@/lib/mappers/expense";

export async function getExpenses() {
  const records = await prisma.expense.findMany({
    include: expenseInclude,
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });

  return records.map(mapExpenseToUi);
}
