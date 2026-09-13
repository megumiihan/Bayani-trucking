"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useRole } from "@/context/RoleContext";
import {
  deleteBillable,
  saveBillable,
  saveCollectionReceipt,
  saveDisbursement,
  updateBillable,
} from "@/lib/actions/bookkeeping";
import { deleteExpense, saveExpense, updateExpense } from "@/lib/actions/expense";
import {
  defaultBillableFilters,
  filterBillables,
  hasActiveBillableFilters,
  type BillableFilters,
} from "@/lib/billableFilters";
import {
  defaultExpenseFilters,
  filterExpenses,
  hasActiveExpenseFilters,
  type ExpenseFilters,
} from "@/lib/expenseFilters";
import {
  BOOKKEEPING_LEDGER_LABELS,
  BOOKKEEPING_LEDGERS,
  type BillableUi,
  type BillableWriteInput,
  type BookkeepingLedger,
  type CollectionReceiptUi,
  type CollectionReceiptWriteInput,
  type DisbursementUi,
  type DisbursementWriteInput,
} from "@/lib/bookkeeping";
import type { Client } from "@/lib/clients";
import { exportBillablesToCsv } from "@/lib/exportBillables";
import { exportCollectionReceiptsToCsv } from "@/lib/exportCollectionReceipts";
import { exportExpensesToCsv } from "@/lib/exportExpenses";
import {
  type ExpenseUi,
  type ExpenseWriteInput,
} from "@/lib/expenses";
import { formatCurrency, type Employee } from "@/lib/mockData";
import type { Truck } from "@/lib/trucks";
import BillableFiltersBar from "@/components/admin/BillableFiltersBar";
import ClientBillableSummary from "@/components/admin/ClientBillableSummary";
import ExpenseFiltersBar from "@/components/admin/ExpenseFiltersBar";
import BillableRowActions from "@/components/admin/BillableRowActions";
import DeleteBillableModal from "@/components/admin/DeleteBillableModal";
import DeleteExpenseModal from "@/components/admin/DeleteExpenseModal";
import LogBillableModal from "@/components/admin/LogBillableModal";
import LogCollectionReceiptModal from "@/components/admin/LogCollectionReceiptModal";
import LogDisbursementModal from "@/components/admin/LogDisbursementModal";
import LogExpenseModal from "@/components/admin/LogExpenseModal";
import EmptyState from "@/components/ui/EmptyState";
import PageHeader from "@/components/ui/PageHeader";

interface AdminBookkeepingProps {
  initialLedger: BookkeepingLedger;
  initialBillables: BillableUi[];
  initialExpenses: ExpenseUi[];
  initialDisbursements: DisbursementUi[];
  initialCollectionReceipts: CollectionReceiptUi[];
  employees: Employee[];
  trucks: Truck[];
  clients: Client[];
}

const LOG_BUTTONS: { ledger: BookkeepingLedger; label: string }[] = [
  { ledger: "billables", label: "Billables" },
  { ledger: "expenses", label: "Expenses" },
  { ledger: "disbursement", label: "Disbursement" },
  { ledger: "collection-receipt", label: "Collection receipt" },
];

export default function AdminBookkeeping({
  initialLedger,
  initialBillables,
  initialExpenses,
  initialDisbursements,
  initialCollectionReceipts,
  employees,
  trucks,
  clients,
}: AdminBookkeepingProps) {
  const { role } = useRole();
  const router = useRouter();
  const pathname = usePathname();
  const [ledger, setLedger] = useState<BookkeepingLedger>(initialLedger);
  const [openForm, setOpenForm] = useState<BookkeepingLedger | null>(null);
  const [editingBillable, setEditingBillable] = useState<BillableUi | null>(
    null
  );
  const [editingExpense, setEditingExpense] = useState<ExpenseUi | null>(null);
  const [deletingBillable, setDeletingBillable] = useState<BillableUi | null>(
    null
  );
  const [deletingExpense, setDeletingExpense] = useState<ExpenseUi | null>(
    null
  );
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [billables, setBillables] = useState(initialBillables);
  const [expenses, setExpenses] = useState(initialExpenses);
  const [disbursements, setDisbursements] = useState(initialDisbursements);
  const [collectionReceipts, setCollectionReceipts] = useState(
    initialCollectionReceipts
  );
  const [billableFilters, setBillableFilters] = useState<BillableFilters>(
    defaultBillableFilters
  );
  const [expenseFilters, setExpenseFilters] = useState<ExpenseFilters>(
    defaultExpenseFilters
  );

  const filteredBillables = useMemo(
    () => filterBillables(billables, billableFilters),
    [billables, billableFilters]
  );

  const filteredExpenses = useMemo(
    () => filterExpenses(expenses, expenseFilters),
    [expenses, expenseFilters]
  );

  useEffect(() => {
    setBillables(initialBillables);
  }, [initialBillables]);

  useEffect(() => {
    setExpenses(initialExpenses);
  }, [initialExpenses]);

  useEffect(() => {
    setDisbursements(initialDisbursements);
  }, [initialDisbursements]);

  useEffect(() => {
    setCollectionReceipts(initialCollectionReceipts);
  }, [initialCollectionReceipts]);

  const rowCount = useMemo(() => {
    if (ledger === "billables") return filteredBillables.length;
    if (ledger === "expenses") return filteredExpenses.length;
    if (ledger === "disbursement") return disbursements.length;
    return collectionReceipts.length;
  }, [
    collectionReceipts,
    disbursements,
    filteredExpenses,
    filteredBillables,
    ledger,
  ]);

  const total = useMemo(() => {
    if (ledger === "billables") {
      return filteredBillables.reduce((sum, row) => sum + row.totalTax, 0);
    }
    if (ledger === "expenses") {
      return filteredExpenses.reduce((sum, row) => sum + row.amount, 0);
    }
    if (ledger === "disbursement") {
      return disbursements.reduce((sum, row) => sum + row.amount, 0);
    }
    return collectionReceipts.reduce(
      (sum, row) => sum + row.collectionAmount,
      0
    );
  }, [collectionReceipts, disbursements, filteredExpenses, filteredBillables, ledger]);

  const totalBillables = useMemo(
    () => billables.reduce((sum, row) => sum + row.totalInvoiceAmt, 0),
    [billables]
  );

  const totalCollections = useMemo(
    () =>
      collectionReceipts.reduce((sum, row) => sum + row.collectionAmount, 0),
    [collectionReceipts]
  );

  const remainingBillables = totalBillables - totalCollections;


  if (role !== "admin") {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-center text-amber-800">
        Admin access required. Switch to Admin view using the role toggle.
      </div>
    );
  }

  const selectLedger = (next: BookkeepingLedger) => {
    setLedger(next);
    const params = new URLSearchParams();
    if (next !== "billables") params.set("ledger", next);
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  const openLogForm = (next: BookkeepingLedger) => {
    setSaveError(null);
    setEditingBillable(null);
    setEditingExpense(null);
    selectLedger(next);
    setOpenForm(next);
  };

  const openEditBillable = (billable: BillableUi) => {
    setSaveError(null);
    setLedger("billables");
    setEditingBillable(billable);
    setOpenForm("billables");
  };

  const openEditExpense = (expense: ExpenseUi) => {
    setSaveError(null);
    selectLedger("expenses");
    setEditingExpense(expense);
    setOpenForm("expenses");
  };

  const closeForm = () => {
    if (isSaving) return;
    setOpenForm(null);
    setEditingBillable(null);
    setEditingExpense(null);
    setSaveError(null);
  };

  const handleSaveBillable = async (input: BillableWriteInput) => {
    setIsSaving(true);
    setSaveError(null);
    const result = editingBillable
      ? await updateBillable(editingBillable.id, input)
      : await saveBillable(input);
    setIsSaving(false);

    if (!result.success) {
      setSaveError(result.error);
      return;
    }

    setBillables((current) => {
      if (editingBillable) {
        return current.map((row) =>
          row.id === editingBillable.id ? result.billable : row
        );
      }
      return [result.billable, ...current];
    });
    setOpenForm(null);
    setEditingBillable(null);
  };

  const handleDeleteBillable = async (id: string) => {
    setIsDeleting(true);
    setDeleteError(null);
    const result = await deleteBillable(id);
    setIsDeleting(false);

    if (!result.success) {
      setDeleteError(result.error);
      return;
    }

    setBillables((current) => current.filter((row) => row.id !== id));
    setDeletingBillable(null);
  };

  const handleSaveExpense = async (input: ExpenseWriteInput) => {
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
        return current.map((row) =>
          row.id === editingExpense.id ? result.expense : row
        );
      }
      return [result.expense, ...current];
    });
    setOpenForm(null);
    setEditingExpense(null);
  };

  const handleDeleteExpense = async (id: string) => {
    setIsDeleting(true);
    setDeleteError(null);
    const result = await deleteExpense(id);
    setIsDeleting(false);

    if (!result.success) {
      setDeleteError(result.error);
      return;
    }

    setExpenses((current) => current.filter((row) => row.id !== id));
    setDeletingExpense(null);
  };

  const handleSaveDisbursement = async (input: DisbursementWriteInput) => {
    setIsSaving(true);
    setSaveError(null);
    const result = await saveDisbursement(input);
    setIsSaving(false);

    if (!result.success) {
      setSaveError(result.error);
      return;
    }

    setDisbursements((current) => [result.disbursement, ...current]);
    setOpenForm(null);
  };

  const handleSaveCollectionReceipt = async (
    input: CollectionReceiptWriteInput
  ) => {
    setIsSaving(true);
    setSaveError(null);
    const result = await saveCollectionReceipt(input);
    setIsSaving(false);

    if (!result.success) {
      setSaveError(result.error);
      return;
    }

    setCollectionReceipts((current) => [result.receipt, ...current]);
    setOpenForm(null);
  };

  return (
    <div>
      <PageHeader
        title="Bookkeeping"
        description="Log billables, expenses, disbursements, and collection receipts from one place."
        actions={LOG_BUTTONS.map((button) => (
          <button
            key={button.ledger}
            type="button"
            onClick={() => openLogForm(button.ledger)}
            className="rounded-lg bg-blue-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
          >
            {button.label}
          </button>
        ))}
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="card-surface rounded-2xl p-5">
          {ledger === "billables" ? (
            <DashboardStat
              label="Total tax"
              value={formatCurrency(total)}
            />
          ) : (
            <DashboardStat
              label={`Rows in ${BOOKKEEPING_LEDGER_LABELS[ledger].toLowerCase()}`}
              value={String(rowCount)}
            />
          )}
        </div>
        <div className="card-surface rounded-2xl p-5">
          {ledger === "billables" ? (
            <div className="grid grid-cols-2 gap-4">
              <DashboardStat
                compact
                label="Total billables"
                value={formatCurrency(totalBillables)}
              />
              <DashboardStat
                compact
                label="After collections"
                value={formatCurrency(remainingBillables)}
                hint={`${formatCurrency(totalBillables)} − ${formatCurrency(totalCollections)} collections`}
              />
            </div>
          ) : (
            <DashboardStat
              label={
                ledger === "collection-receipt"
                  ? "Total collection amount"
                  : "Total in view"
              }
              value={formatCurrency(total)}
            />
          )}
        </div>
      </div>

      {ledger === "billables" && (
        <ClientBillableSummary
          billables={billables}
          receipts={collectionReceipts}
          clients={clients}
        />
      )}

      <section className="card-surface overflow-hidden rounded-2xl">
        <div className="flex flex-col gap-4 border-b border-slate-100 px-6 py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                {BOOKKEEPING_LEDGER_LABELS[ledger]}
              </h2>
              <p className="text-sm text-slate-500">
                {ledger === "billables"
                  ? `${filteredBillables.length} of ${billables.length} billables`
                  : ledger === "expenses"
                    ? `${filteredExpenses.length} of ${expenses.length} expenses`
                    : ledger === "collection-receipt"
                      ? `${collectionReceipts.length} collection receipt${
                          collectionReceipts.length === 1 ? "" : "s"
                        }`
                      : "Switch the table to review another ledger."}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {ledger === "billables" && (
                <button
                  type="button"
                  onClick={() => exportBillablesToCsv(filteredBillables)}
                  disabled={filteredBillables.length === 0}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Export CSV
                </button>
              )}
              {ledger === "expenses" && (
                <button
                  type="button"
                  onClick={() => exportExpensesToCsv(filteredExpenses)}
                  disabled={filteredExpenses.length === 0}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Export CSV
                </button>
              )}
              {ledger === "collection-receipt" && (
                <button
                  type="button"
                  onClick={() =>
                    exportCollectionReceiptsToCsv(collectionReceipts)
                  }
                  disabled={collectionReceipts.length === 0}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Export CSV
                </button>
              )}
            </div>
          </div>

          <div
            role="tablist"
            aria-label="Bookkeeping ledger"
            className="flex flex-wrap gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1"
          >
            {BOOKKEEPING_LEDGERS.map((value) => {
              const isActive = ledger === value;
              return (
                <button
                  key={value}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => selectLedger(value)}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 ${
                    isActive
                      ? "bg-white text-blue-700 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {BOOKKEEPING_LEDGER_LABELS[value]}
                </button>
              );
            })}
          </div>

          {ledger === "billables" && (
            <BillableFiltersBar
              filters={billableFilters}
              clients={clients}
              onChange={setBillableFilters}
            />
          )}

          {ledger === "expenses" && (
            <ExpenseFiltersBar
              filters={expenseFilters}
              onChange={setExpenseFilters}
            />
          )}

          {ledger === "disbursement" && (
            <p
              role="status"
              className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800"
            >
              Not yet usable. Features to be discussed.
            </p>
          )}
        </div>

        <LedgerTable
          ledger={ledger}
          billables={filteredBillables}
          hasBillableFilters={hasActiveBillableFilters(billableFilters)}
          expenses={filteredExpenses}
          hasExpenseFilters={hasActiveExpenseFilters(expenseFilters)}
          disbursements={disbursements}
          collectionReceipts={collectionReceipts}
          onLog={() => openLogForm(ledger)}
          onEditBillable={openEditBillable}
          onDeleteBillable={(billable) => {
            setDeleteError(null);
            setDeletingBillable(billable);
          }}
          onEditExpense={openEditExpense}
          onDeleteExpense={(expense) => {
            setDeleteError(null);
            setDeletingExpense(expense);
          }}
        />
      </section>

      <LogBillableModal
        isOpen={openForm === "billables"}
        isSaving={isSaving}
        error={saveError}
        clients={clients}
        billable={editingBillable}
        onClose={closeForm}
        onSave={handleSaveBillable}
      />
      <DeleteBillableModal
        billable={deletingBillable}
        isDeleting={isDeleting}
        error={deleteError}
        onClose={() => {
          if (isDeleting) return;
          setDeletingBillable(null);
          setDeleteError(null);
        }}
        onConfirm={handleDeleteBillable}
      />
      <LogExpenseModal
        isOpen={openForm === "expenses"}
        isSaving={isSaving}
        error={saveError}
        employees={employees}
        trucks={trucks}
        expense={editingExpense}
        onClose={closeForm}
        onSave={handleSaveExpense}
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
        onConfirm={handleDeleteExpense}
      />
      <LogDisbursementModal
        isOpen={openForm === "disbursement"}
        isSaving={isSaving}
        error={saveError}
        onClose={closeForm}
        onSave={handleSaveDisbursement}
      />
      <LogCollectionReceiptModal
        isOpen={openForm === "collection-receipt"}
        isSaving={isSaving}
        error={saveError}
        clients={clients}
        onClose={closeForm}
        onSave={handleSaveCollectionReceipt}
      />
    </div>
  );
}

function DashboardStat({
  label,
  value,
  hint,
  compact = false,
}: {
  label: string;
  value: string;
  hint?: string;
  compact?: boolean;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </p>
      <p
        className={`mt-2 font-bold tabular-nums tracking-tight text-slate-900 ${
          compact ? "text-2xl" : "text-3xl"
        }`}
      >
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}

function LedgerTable({
  ledger,
  billables,
  hasBillableFilters,
  expenses,
  hasExpenseFilters,
  disbursements,
  collectionReceipts,
  onLog,
  onEditBillable,
  onDeleteBillable,
  onEditExpense,
  onDeleteExpense,
}: {
  ledger: BookkeepingLedger;
  billables: BillableUi[];
  hasBillableFilters: boolean;
  expenses: ExpenseUi[];
  hasExpenseFilters: boolean;
  disbursements: DisbursementUi[];
  collectionReceipts: CollectionReceiptUi[];
  onLog: () => void;
  onEditBillable: (billable: BillableUi) => void;
  onDeleteBillable: (billable: BillableUi) => void;
  onEditExpense: (expense: ExpenseUi) => void;
  onDeleteExpense: (expense: ExpenseUi) => void;
}) {
  if (ledger === "billables") {
    return (
      <DataTable
        columns={[
          "Date",
          "Invoice no.",
          "Buyer",
          "Address",
          "VAT Reg. No.",
          "Total invoice amount",
          "Taxable amount",
          "Output tax",
          "Withholding tax",
          "Total tax",
          "Logged by",
          "Actions",
        ]}
        emptyTitle={
          hasBillableFilters ? "No billables match these filters" : "No billables yet"
        }
        emptyDescription={
          hasBillableFilters
            ? "Try another client or date range."
            : "Log an invoice to see it in this table."
        }
        onLog={hasBillableFilters ? undefined : onLog}
        isEmpty={billables.length === 0}
      >
        {billables.map((row) => (
          <tr key={row.id} className="hover:bg-slate-50">
            <td className="whitespace-nowrap px-4 py-3 text-slate-700">
              {row.date}
            </td>
            <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-900">
              {row.invoiceNo}
            </td>
            <td className="whitespace-nowrap px-4 py-3 text-slate-900">
              {row.buyerName || "—"}
            </td>
            <td className="max-w-xs px-4 py-3 text-slate-500">
              {row.buyerAddress || "—"}
            </td>
            <td className="whitespace-nowrap px-4 py-3 text-slate-700">
              {row.vatRegNo}
            </td>
            <td className="whitespace-nowrap px-4 py-3 text-slate-700">
              {formatCurrency(row.totalInvoiceAmt)}
            </td>
            <td className="whitespace-nowrap px-4 py-3 text-slate-700">
              {formatCurrency(row.taxableAmt)}
            </td>
            <td className="whitespace-nowrap px-4 py-3 text-slate-700">
              {formatCurrency(row.outputTax)}
            </td>
            <td className="whitespace-nowrap px-4 py-3 text-slate-700">
              {formatCurrency(row.withholdingTax)}
            </td>
            <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-900">
              {formatCurrency(row.totalTax)}
            </td>
            <td className="whitespace-nowrap px-4 py-3 text-slate-700">
              {row.createdByName}
            </td>
            <td className="whitespace-nowrap px-4 py-3">
              <BillableRowActions
                onEdit={() => onEditBillable(row)}
                onDelete={() => onDeleteBillable(row)}
              />
            </td>
          </tr>
        ))}
      </DataTable>
    );
  }

  if (ledger === "expenses") {
    return (
      <DataTable
        columns={[
          "Date",
          "Name and address",
          "Total invoice amount",
          "Invoice no.",
          "VAT Reg. No.",
          "VAT purchase",
          "Input tax",
          "Description",
          "Logged by",
          "Actions",
        ]}
        emptyTitle={
          hasExpenseFilters
            ? "No expenses match these filters"
            : "No expenses yet"
        }
        emptyDescription={
          hasExpenseFilters
            ? "Try another category, date, or search."
            : "Log a company cost to see it in this table."
        }
        onLog={hasExpenseFilters ? undefined : onLog}
        isEmpty={expenses.length === 0}
      >
        {expenses.map((row) => (
          <tr key={row.id} className="hover:bg-slate-50">
            <td className="whitespace-nowrap px-4 py-3 text-slate-700">
              {row.date}
            </td>
            <td className="max-w-xs px-4 py-3 text-slate-900">
              {row.address || "—"}
            </td>
            <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-900">
              {formatCurrency(row.amount)}
            </td>
            <td className="whitespace-nowrap px-4 py-3 text-slate-700">
              {row.invoiceNo || "—"}
            </td>
            <td className="whitespace-nowrap px-4 py-3 text-slate-700">
              {row.vatRegNo || "—"}
            </td>
            <td className="whitespace-nowrap px-4 py-3 text-slate-700">
              {formatCurrency(row.vatPurchase)}
            </td>
            <td className="whitespace-nowrap px-4 py-3 text-slate-700">
              {formatCurrency(row.inputTax)}
            </td>
            <td className="max-w-xs px-4 py-3 text-slate-500">
              {row.description || "—"}
            </td>
            <td className="whitespace-nowrap px-4 py-3 text-slate-700">
              {row.createdByName}
            </td>
            <td className="whitespace-nowrap px-4 py-3">
              <BillableRowActions
                editLabel="Edit expense"
                deleteLabel="Delete expense"
                onEdit={() => onEditExpense(row)}
                onDelete={() => onDeleteExpense(row)}
              />
            </td>
          </tr>
        ))}
      </DataTable>
    );
  }

  if (ledger === "disbursement") {
    return (
      <DataTable
        columns={[
          "Date",
          "Payee",
          "Amount",
          "Reference no.",
          "Description",
          "Logged by",
        ]}
        emptyTitle="No disbursements yet"
        emptyDescription="Log a payout to see it in this table."
        onLog={onLog}
        isEmpty={disbursements.length === 0}
      >
        {disbursements.map((row) => (
          <tr key={row.id} className="hover:bg-slate-50">
            <td className="whitespace-nowrap px-4 py-3 text-slate-700">
              {row.date}
            </td>
            <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-900">
              {row.payee}
            </td>
            <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-900">
              {formatCurrency(row.amount)}
            </td>
            <td className="whitespace-nowrap px-4 py-3 text-slate-700">
              {row.referenceNo || "—"}
            </td>
            <td className="max-w-xs px-4 py-3 text-slate-500">
              {row.description || "—"}
            </td>
            <td className="whitespace-nowrap px-4 py-3 text-slate-700">
              {row.createdByName}
            </td>
          </tr>
        ))}
      </DataTable>
    );
  }

  return (
    <DataTable
      columns={[
        "Client",
        "OR number",
        "Collection amount",
        "Payment details",
        "Date paid",
        "Who paid",
        "Who received",
        "Logged by",
      ]}
      emptyTitle="No collection receipts yet"
      emptyDescription="Log an official receipt to see it in this table."
      onLog={onLog}
      isEmpty={collectionReceipts.length === 0}
    >
      {collectionReceipts.map((row) => (
        <tr key={row.id} className="hover:bg-slate-50">
          <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-900">
            {row.clientName || "—"}
          </td>
          <td className="whitespace-nowrap px-4 py-3 text-slate-700">
            {row.orNumber}
          </td>
          <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-900">
            {formatCurrency(row.collectionAmount)}
          </td>
          <td className="whitespace-nowrap px-4 py-3 text-slate-700">
            {row.paymentDetails || "—"}
          </td>
          <td className="whitespace-nowrap px-4 py-3 text-slate-700">
            {row.datePaid}
          </td>
          <td className="whitespace-nowrap px-4 py-3 text-slate-700">
            {row.whoPaid}
          </td>
          <td className="whitespace-nowrap px-4 py-3 text-slate-700">
            {row.whoReceived}
          </td>
          <td className="whitespace-nowrap px-4 py-3 text-slate-700">
            {row.createdByName}
          </td>
        </tr>
      ))}
    </DataTable>
  );
}

function DataTable({
  columns,
  emptyTitle,
  emptyDescription,
  onLog,
  isEmpty,
  children,
}: {
  columns: string[];
  emptyTitle: string;
  emptyDescription: string;
  onLog?: () => void;
  isEmpty: boolean;
  children: ReactNode;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50">
          <tr>
            {columns.map((col) => (
              <th
                key={col}
                className="whitespace-nowrap px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500"
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {isEmpty ? (
            <tr>
              <td colSpan={columns.length}>
                <EmptyState
                  icon={
                    <svg
                      className="h-6 w-6"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12"
                      />
                    </svg>
                  }
                  title={emptyTitle}
                  description={emptyDescription}
                  action={
                    onLog ? (
                      <button
                        type="button"
                        onClick={onLog}
                        className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800"
                      >
                        Log entry
                      </button>
                    ) : undefined
                  }
                />
              </td>
            </tr>
          ) : (
            children
          )}
        </tbody>
      </table>
    </div>
  );
}
