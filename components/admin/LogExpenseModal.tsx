"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import type { ExpenseCategory } from "@prisma/client";
import {
  EXPENSE_CATEGORIES,
  EXPENSE_CATEGORY_LABELS,
  expenseAllowsTruck,
  type ExpenseUi,
  type ExpenseWriteInput,
} from "@/lib/expenses";
import type { Employee } from "@/lib/mockData";
import { formatTruckLabel, type Truck } from "@/lib/trucks";
import { useEscapeToClose } from "@/components/ui/useEscapeToClose";

interface LogExpenseModalProps {
  isOpen: boolean;
  isSaving: boolean;
  error: string | null;
  employees: Employee[];
  trucks: Truck[];
  expense?: ExpenseUi | null;
  onClose: () => void;
  onSave: (input: ExpenseWriteInput) => Promise<void>;
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function LogExpenseModal({
  isOpen,
  isSaving,
  error,
  employees,
  trucks,
  expense,
  onClose,
  onSave,
}: LogExpenseModalProps) {
  const isEditing = Boolean(expense);
  const [date, setDate] = useState(todayISO);
  const [category, setCategory] = useState<ExpenseCategory>("FUEL");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [truckId, setTruckId] = useState("");
  const [reimbursed, setReimbursed] = useState(false);
  const [credit, setCredit] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    if (expense) {
      setDate(expense.date);
      setCategory(expense.category);
      setAmount(String(expense.amount));
      setDescription(expense.description);
      setEmployeeId(expense.employeeId ?? "");
      setTruckId(expense.truckId ?? "");
      setReimbursed(expense.reimbursed);
      setCredit(expense.credit);
      return;
    }

    setDate(todayISO());
    setCategory("FUEL");
    setAmount("");
    setDescription("");
    setEmployeeId("");
    setTruckId("");
    setReimbursed(false);
    setCredit(false);
  }, [isOpen, expense]);

  const employeeOptions = useMemo(() => {
    const active = employees.filter((person) => person.tenureStatus !== "inactive");
    if (employeeId && !active.some((person) => person.id === employeeId)) {
      const current = employees.find((person) => person.id === employeeId);
      if (current) return [current, ...active];
    }
    return active;
  }, [employees, employeeId]);

  const truckOptions = useMemo(() => {
    const active = trucks.filter((truck) => truck.isActive);
    if (truckId && !active.some((truck) => truck.id === truckId)) {
      const current = trucks.find((truck) => truck.id === truckId);
      if (current) return [current, ...active];
    }
    return active;
  }, [trucks, truckId]);

  const showTruckField = expenseAllowsTruck(category);

  useEscapeToClose(isOpen, onClose, isSaving);

  if (!isOpen) return null;

  const parsedAmount = Number(amount);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (isSaving || !Number.isFinite(parsedAmount) || parsedAmount <= 0) return;
    await onSave({
      date,
      category,
      amount: parsedAmount,
      description,
      employeeId: employeeId || null,
      truckId: showTruckField ? truckId || null : null,
      reimbursed,
      credit,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close modal"
        className="absolute inset-0 bg-gray-900/50"
        onClick={isSaving ? undefined : onClose}
      />
      <div
        role="dialog"
        aria-labelledby="log-expense-title"
        className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl border border-gray-200 bg-white p-6 shadow-xl"
      >
        <h2 id="log-expense-title" className="text-lg font-semibold text-gray-900">
          {isEditing ? "Edit expense" : "Log expense"}
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          {isEditing
            ? "Update the cost details. Flag stays as it is."
            : "Record a cost against the company. Employee, reimbursed, credit, and truck (fuel and maintenance) are optional."}
        </p>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-gray-700">
              Date
            </span>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={inputClass}
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-gray-700">
              Category
            </span>
            <select
              required
              value={category}
              onChange={(e) => {
                const next = e.target.value as ExpenseCategory;
                setCategory(next);
                if (!expenseAllowsTruck(next)) setTruckId("");
              }}
              className={inputClass}
            >
              {EXPENSE_CATEGORIES.map((value) => (
                <option key={value} value={value}>
                  {EXPENSE_CATEGORY_LABELS[value]}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-gray-700">
              Amount
            </span>
            <input
              type="number"
              inputMode="decimal"
              min="0.01"
              step="0.01"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className={inputClass}
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-gray-700">
              Employee responsible
              <span className="ml-1 font-normal text-gray-400">(optional)</span>
            </span>
            <select
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              className={inputClass}
            >
              <option value="">None</option>
              {employeeOptions.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.name}
                  {person.tenureStatus === "inactive" ? " (inactive)" : ""}
                </option>
              ))}
            </select>
          </label>

          {showTruckField && (
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-gray-700">
                Truck
                <span className="ml-1 font-normal text-gray-400">(optional)</span>
              </span>
              <select
                value={truckId}
                onChange={(e) => setTruckId(e.target.value)}
                className={inputClass}
              >
                <option value="">None</option>
                {truckOptions.map((truck) => (
                  <option key={truck.id} value={truck.id}>
                    {formatTruckLabel(truck)}
                    {!truck.isActive ? " (inactive)" : ""}
                  </option>
                ))}
              </select>
            </label>
          )}

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={reimbursed}
                onChange={(e) => setReimbursed(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-blue-700 focus:ring-blue-500"
              />
              Reimbursed
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={credit}
                onChange={(e) => setCredit(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-blue-700 focus:ring-blue-500"
              />
              Credit
            </label>
          </div>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-gray-700">
              Description
            </span>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional — e.g. LTO registration, truck WKQ502"
              className={inputClass}
            />
          </label>

          {error && (
            <p
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
            >
              {error}
            </p>
          )}

          <div className="flex justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving || !Number.isFinite(parsedAmount) || parsedAmount <= 0}
              className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              {isSaving ? "Saving…" : isEditing ? "Save changes" : "Save expense"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const inputClass =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20";
