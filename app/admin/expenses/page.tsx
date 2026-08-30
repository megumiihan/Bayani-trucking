import { getEmployees } from "@/lib/queries/employees";
import { getExpenses } from "@/lib/queries/expenses";
import { getTrucks } from "@/lib/queries/trucks";
import AdminExpenses from "@/components/views/AdminExpenses";

export const dynamic = "force-dynamic";

export default async function AdminExpensesPage() {
  const [expenses, employees, trucks] = await Promise.all([
    getExpenses(),
    getEmployees(),
    getTrucks(),
  ]);

  return (
    <AdminExpenses
      initialExpenses={expenses}
      employees={employees}
      trucks={trucks}
    />
  );
}
