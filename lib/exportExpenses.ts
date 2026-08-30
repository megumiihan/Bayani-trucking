import { expenseCategoryLabel, type ExpenseUi } from "@/lib/expenses";

function csvCell(value: string | number) {
  const text = String(value);
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function exportExpensesToCsv(expenses: ExpenseUi[]) {
  const header = [
    "Date",
    "Category",
    "Amount",
    "Truck",
    "Employee responsible",
    "Reimbursed",
    "Credit",
    "Description",
    "Flagged",
    "Logged by",
  ];

  const rows = expenses.map((expense) => [
    expense.date,
    expenseCategoryLabel(expense.category),
    expense.amount.toFixed(2),
    expense.truckLabel ?? "",
    expense.employeeName ?? "",
    expense.reimbursed ? "Yes" : "No",
    expense.credit ? "Yes" : "No",
    expense.description,
    expense.flagged ? "Yes" : "No",
    expense.createdByName,
  ]);

  const csv = [header, ...rows]
    .map((row) => row.map(csvCell).join(","))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `bayani-expenses-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
