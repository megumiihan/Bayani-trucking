"use client";

import { useEffect, useMemo, useState } from "react";
import { useRole } from "@/context/RoleContext";
import {
  deleteExpense,
  saveExpense,
  toggleExpenseFlag,
  updateExpense,
} from "@/lib/actions/expense";
import {
  defaultExpenseFilters,
  filterExpenses,
  type ExpenseFilters,
} from "@/lib/expenseFilters";
import {
  expenseCategoryLabel,
  type ExpenseUi,
  type ExpenseWriteInput,
} from "@/lib/expenses";
import { exportExpensesToCsv } from "@/lib/exportExpenses";
import { formatCurrency, type Employee } from "@/lib/mockData";
import type { Truck } from "@/lib/trucks";
import DeleteExpenseModal from "@/components/admin/DeleteExpenseModal";
import ExpenseFiltersBar from "@/components/admin/ExpenseFiltersBar";
import LogExpenseModal from "@/components/admin/LogExpenseModal";
import Badge from "@/components/ui/Badge";
import PageHeader from "@/components/ui/PageHeader";

interface AdminExpensesProps {
  initialExpenses: ExpenseUi[];
  employees: Employee[];
  trucks: Truck[];
}

export default function AdminExpenses({
  initialExpenses,
  employees,
  trucks,
}: AdminExpensesProps) {
  const { role } = useRole();
  const [expenses, setExpenses] = useState(initialExpenses);
  const [filters, setFilters] = useState<ExpenseFilters>(defaultExpenseFilters);
  const [isLogOpen, setIsLogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseUi | null>(null);
  const [deletingExpense, setDeletingExpense] = useState<ExpenseUi | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [flaggingId, setFlaggingId] = useState<string | null>(null);

  useEffect(() => {
    setExpenses(initialExpenses);
  }, [initialExpenses]);

  const filtered = useMemo(
    () => filterExpenses(expenses, filters),
    [expenses, filters]
  );

  const total = useMemo(
    () => filtered.reduce((sum, expense) => sum + expense.amount, 0),
    [filtered]
  );

  if (role !== "admin") {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-center text-amber-800">
        Admin access required. Switch to Admin view using the role toggle.
      </div>
    );
  }

  const handleSave = async (input: ExpenseWriteInput) => {
    setIsSaving(true);
    setSaveError(null);
    const result = editingExpense
      ? await updateExpense(editingExpense.id, input)
      : await saveExpense(input);
    setIsSaving(false);

    if (!result.success) {
      setSaveError(result.error);
      return;
    }

    setExpenses((current) => {
      if (editingExpense) {
        return current.map((expense) =>
          expense.id === editingExpense.id ? result.expense : expense
        );
      }
      return [result.expense, ...current];
    });
    setIsLogOpen(false);
    setEditingExpense(null);
  };

  const handleToggleFlag = async (id: string) => {
    if (flaggingId) return;
    setFlaggingId(id);
    const result = await toggleExpenseFlag(id);
    setFlaggingId(null);

    if (result.success) {
      setExpenses((current) =>
        current.map((expense) => (expense.id === id ? result.expense : expense))
      );
    }
  };

  const handleDelete = async (id: string) => {
    setIsDeleting(true);
    setDeleteError(null);
    const result = await deleteExpense(id);
    setIsDeleting(false);

    if (!result.success) {
      setDeleteError(result.error);
      return;
    }

    setExpenses((current) => current.filter((expense) => expense.id !== id));
    setDeletingExpense(null);
  };

  return (
    <div>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <PageHeader
          title="Expenses"
          description="Log company costs and export the filtered list."
        />
        <button
          type="button"
          onClick={() => {
            setSaveError(null);
            setEditingExpense(null);
            setIsLogOpen(true);
          }}
          className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800"
        >
          Log expenses
        </button>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard label="Rows in view" value={String(filtered.length)} />
        <StatCard label="Total in view" value={formatCurrency(total)} />
      </div>

      <div className="mb-6">
        <ExpenseFiltersBar filters={filters} onChange={setFilters} />
      </div>

      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-gray-100 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Expense log</h2>
            <p className="text-sm text-gray-500">
              {filtered.length} of {expenses.length} expenses
            </p>
          </div>
          <button
            type="button"
            onClick={() => exportExpensesToCsv(filtered)}
            disabled={filtered.length === 0}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Export CSV
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                {[
                  "Flag",
                  "Date",
                  "Category",
                  "Amount",
                  "Truck",
                  "Employee",
                  "Status",
                  "Description",
                  "Logged by",
                  "Actions",
                ].map((col) => (
                  <th
                    key={col}
                    className="whitespace-nowrap px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-gray-500">
                    No expenses match these filters.
                  </td>
                </tr>
              ) : (
                filtered.map((expense) => (
                  <tr
                    key={expense.id}
                    className={expense.flagged ? "bg-amber-50/40" : "hover:bg-gray-50"}
                  >
                    <td className="whitespace-nowrap px-4 py-3">
                      <button
                        type="button"
                        onClick={() => handleToggleFlag(expense.id)}
                        disabled={flaggingId === expense.id}
                        aria-label={
                          expense.flagged ? "Unflag expense" : "Flag expense"
                        }
                        className={`rounded p-1 transition-colors disabled:opacity-50 ${
                          expense.flagged
                            ? "text-amber-500 hover:text-amber-600"
                            : "text-gray-300 hover:text-amber-400"
                        }`}
                      >
                        <svg
                          className="h-5 w-5"
                          fill={expense.flagged ? "currentColor" : "none"}
                          viewBox="0 0 24 24"
                          strokeWidth={1.5}
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.385a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z"
                          />
                        </svg>
                      </button>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-700">
                      {expense.date}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-900">
                      {expenseCategoryLabel(expense.category)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-gray-900">
                      {formatCurrency(expense.amount)}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {expense.truckLabel || "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-700">
                      {expense.employeeName || "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {expense.reimbursed && (
                          <Badge
                            label="Reimbursed"
                            className="bg-emerald-50 text-emerald-800"
                          />
                        )}
                        {expense.credit && (
                          <Badge
                            label="Credit"
                            className="bg-indigo-50 text-indigo-800"
                          />
                        )}
                        {!expense.reimbursed && !expense.credit && (
                          <span className="text-gray-400">—</span>
                        )}
                      </div>
                    </td>
                    <td className="max-w-xs px-4 py-3 text-gray-500">
                      {expense.description || "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-700">
                      {expense.createdByName}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setSaveError(null);
                            setEditingExpense(expense);
                            setIsLogOpen(true);
                          }}
                          className="rounded-md bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setDeleteError(null);
                            setDeletingExpense(expense);
                          }}
                          className="rounded-md bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-100"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <LogExpenseModal
        isOpen={isLogOpen}
        isSaving={isSaving}
        error={saveError}
        employees={employees}
        trucks={trucks}
        expense={editingExpense}
        onClose={() => {
          if (isSaving) return;
          setIsLogOpen(false);
          setEditingExpense(null);
          setSaveError(null);
        }}
        onSave={handleSave}
      />

      <DeleteExpenseModal
        expense={deletingExpense}
        isDeleting={isDeleting}
        error={deleteError}
        onClose={() => {
          if (isDeleting) return;
          setDeletingExpense(null);
          setDeleteError(null);
        }}
        onConfirm={handleDelete}
      />
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}
