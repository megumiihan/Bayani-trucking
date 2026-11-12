"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useRole } from "@/context/RoleContext";
import {
  formatCurrency,
  shipmentRoleColors,
  type Employee,
  type Shipment,
} from "@/lib/mockData";
import {
  updateEmployeeDetails,
  updateEmployeeRemarks,
  type EmployeeDetailsInput,
} from "@/lib/actions/employee";
import { BOUNTY_EXP_NEW, BOUNTY_EXP_OLD, bountyExpLabel } from "@/lib/weight";
import { recordSalaryPayment } from "@/lib/actions/payment";
import {
  approveShipments,
  setShipmentApproval,
} from "@/lib/actions/shipment";
import type { SalaryPaymentUi } from "@/lib/mappers/salaryPayment";
import {
  buildPayoutLedger,
  formatMonthLabel,
  getEmployeeShipmentEntries,
  getMonthKey,
} from "@/lib/payout";
import RecordPayoutModal from "@/components/admin/RecordPayoutModal";
import Badge from "@/components/ui/Badge";
import PageHeader from "@/components/ui/PageHeader";

function toDetailsForm(employee: Employee): EmployeeDetailsInput {
  return {
    name: employee.name,
    role: employee.role === "Helper" ? "Helper" : "Driver",
    bountyExp: employee.bountyExp === BOUNTY_EXP_NEW ? BOUNTY_EXP_NEW : BOUNTY_EXP_OLD,
    isActive: employee.isActive !== false,
  };
}

interface AdminEmployeeDetailProps {
  employee: Employee;
  initialShipments: Shipment[];
  initialPayments: SalaryPaymentUi[];
}

export default function AdminEmployeeDetail({
  employee,
  initialShipments,
  initialPayments,
}: AdminEmployeeDetailProps) {
  const { role } = useRole();
  const [shipments, setShipments] = useState(initialShipments);
  const [payments, setPayments] = useState(initialPayments);
  const [remarks, setRemarks] = useState(employee.remarks);
  const router = useRouter();
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [detailsForm, setDetailsForm] = useState<EmployeeDetailsInput>(() =>
    toDetailsForm(employee)
  );
  const [isSavingDetails, setIsSavingDetails] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [isSavingRemarks, setIsSavingRemarks] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isPayoutOpen, setIsPayoutOpen] = useState(false);
  const [isSavingPayout, setIsSavingPayout] = useState(false);
  const [payoutError, setPayoutError] = useState<string | null>(null);
  const [showLifetime, setShowLifetime] = useState(false);

  // Approval interaction states
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [isApprovingAll, setIsApprovingAll] = useState(false);
  const [approvalError, setApprovalError] = useState<string | null>(null);

  const ledger = useMemo(
    () => buildPayoutLedger(shipments, employee.name, payments),
    [employee.name, payments, shipments]
  );

  const now = new Date();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const monthLabel = formatMonthLabel(monthKey);

  const summaries = useMemo(() => {
    const entries = getEmployeeShipmentEntries(shipments, employee.name);
    const monthEntries = entries.filter(
      (entry) => getMonthKey(entry.shipment.date) === monthKey
    );
    const monthPayments = payments.filter(
      (payment) => getMonthKey(payment.paidAt) === monthKey
    );

    const monthApprovedEntries = monthEntries.filter(
      (entry) => entry.shipment.approved
    );
    const monthPendingEntries = monthEntries.filter(
      (entry) => !entry.shipment.approved
    );

    const lifetimeApprovedEntries = entries.filter(
      (entry) => entry.shipment.approved
    );
    const lifetimePendingEntries = entries.filter(
      (entry) => !entry.shipment.approved
    );

    return {
      month: {
        shipments: monthEntries.length,
        approvedShipments: monthApprovedEntries.length,
        pendingShipments: monthPendingEntries.length,
        earned: monthApprovedEntries.reduce((sum, entry) => sum + entry.payout, 0),
        pendingEarned: monthPendingEntries.reduce(
          (sum, entry) => sum + entry.payout,
          0
        ),
        paid: monthPayments.reduce((sum, payment) => sum + payment.amount, 0),
      },
      lifetime: {
        shipments: entries.length,
        approvedShipments: lifetimeApprovedEntries.length,
        pendingShipments: lifetimePendingEntries.length,
        earned: lifetimeApprovedEntries.reduce(
          (sum, entry) => sum + entry.payout,
          0
        ),
        pendingEarned: lifetimePendingEntries.reduce(
          (sum, entry) => sum + entry.payout,
          0
        ),
        paid: payments.reduce((sum, payment) => sum + payment.amount, 0),
        pendingShipmentIds: Array.from(
          new Set(lifetimePendingEntries.map((e) => e.shipment.id))
        ),
      },
    };
  }, [employee.name, monthKey, payments, shipments]);

  const balanceDue = summaries.lifetime.earned - summaries.lifetime.paid;

  useEffect(() => {
    setRemarks(employee.remarks);
    setIsDirty(false);
  }, [employee]);

  useEffect(() => {
    setPayments(initialPayments);
  }, [initialPayments]);

  useEffect(() => {
    setShipments(initialShipments);
  }, [initialShipments]);

  if (role !== "admin") {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-center text-amber-800">
        Admin access required. Switch to Admin view using the role toggle.
      </div>
    );
  }

  const handleToggleApproval = async (
    shipmentId: string,
    currentApproved: boolean
  ) => {
    if (approvingId) return;
    setApprovingId(shipmentId);
    setApprovalError(null);

    const nextApproved = !currentApproved;
    // Optimistic update
    setShipments((current) =>
      current.map((s) =>
        s.id === shipmentId ? { ...s, approved: nextApproved } : s
      )
    );

    const result = await setShipmentApproval(shipmentId, nextApproved);
    setApprovingId(null);

    if (!result.success) {
      // Rollback on error
      setShipments((current) =>
        current.map((s) =>
          s.id === shipmentId ? { ...s, approved: currentApproved } : s
        )
      );
      setApprovalError(result.error);
    } else {
      setShipments((current) =>
        current.map((s) => (s.id === shipmentId ? result.shipment : s))
      );
    }
  };

  const handleApproveAllForEmployee = async () => {
    if (isApprovingAll) return;
    const pendingIds = summaries.lifetime.pendingShipmentIds;
    if (pendingIds.length === 0) return;

    setIsApprovingAll(true);
    setApprovalError(null);

    // Optimistic update
    setShipments((current) =>
      current.map((s) =>
        pendingIds.includes(s.id) ? { ...s, approved: true } : s
      )
    );

    const result = await approveShipments(pendingIds);
    setIsApprovingAll(false);

    if (!result.success) {
      // Rollback on error
      setShipments((current) =>
        current.map((s) =>
          pendingIds.includes(s.id) ? { ...s, approved: false } : s
        )
      );
      setApprovalError(result.error);
    }
  };

  const startEditingDetails = () => {
    setDetailsForm(toDetailsForm(employee));
    setDetailsError(null);
    setIsEditingDetails(true);
  };

  const handleSaveDetails = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSavingDetails(true);
    setDetailsError(null);

    const result = await updateEmployeeDetails(employee.id, detailsForm);
    setIsSavingDetails(false);

    if (!result.success) {
      setDetailsError(result.error);
      return;
    }

    setIsEditingDetails(false);
    // Re-fetch so the header and the shipment ledger pick up a new name.
    router.refresh();
  };

  const handleSaveRemarks = async () => {
    setIsSavingRemarks(true);
    setSaveError(null);

    const result = await updateEmployeeRemarks(employee.id, remarks);
    setIsSavingRemarks(false);

    if (result.success) {
      setRemarks(result.employee.remarks);
      setIsDirty(false);
      return;
    }

    setSaveError(result.error);
  };

  const handleRecordPayout = async (
    amount: number,
    paidAt: string,
    note: string
  ) => {
    setIsSavingPayout(true);
    setPayoutError(null);

    const result = await recordSalaryPayment(
      employee.id,
      amount,
      paidAt,
      note
    );
    setIsSavingPayout(false);

    if (!result.success) {
      setPayoutError(result.error);
      return;
    }

    setPayments((current) => [result.payment, ...current]);
    setIsPayoutOpen(false);
  };

  return (
    <div>
      <Link
        href="/admin/employees"
        className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-blue-700 hover:text-blue-800"
      >
        ← Back to Employee Overview
      </Link>

      <div className="mb-8 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <PageHeader
              title={employee.name}
              description={`${employee.role} · payout ledger`}
            />
            <div className="flex flex-wrap gap-2">
              <Badge label={employee.role} className="bg-blue-100 text-blue-800" />
              <Badge
                label={employee.isActive === false ? "Inactive" : "Active"}
                className={
                  employee.isActive === false
                    ? "bg-gray-100 text-gray-600"
                    : "bg-green-100 text-green-800"
                }
              />
              <Badge
                label={bountyExpLabel(employee.bountyExp)}
                className={
                  employee.bountyExp === BOUNTY_EXP_NEW
                    ? "bg-violet-100 text-violet-800"
                    : "bg-amber-100 text-amber-800"
                }
              />
            </div>
          </div>
          {!isEditingDetails && (
            <button
              type="button"
              onClick={startEditingDetails}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Edit details
            </button>
          )}
        </div>

        {isEditingDetails && (
          <form
            onSubmit={handleSaveDetails}
            className="mt-4 grid grid-cols-1 gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4 sm:grid-cols-2 lg:grid-cols-4"
          >
            <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
              Name
              <input
                type="text"
                value={detailsForm.name}
                onChange={(e) =>
                  setDetailsForm((form) => ({ ...form, name: e.target.value }))
                }
                required
                className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
              Role
              <select
                value={detailsForm.role}
                onChange={(e) =>
                  setDetailsForm((form) => ({
                    ...form,
                    role: e.target.value as EmployeeDetailsInput["role"],
                  }))
                }
                className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900"
              >
                <option value="Driver">Driver</option>
                <option value="Helper">Helper</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
              Bounty experience
              <select
                value={detailsForm.bountyExp}
                onChange={(e) =>
                  setDetailsForm((form) => ({ ...form, bountyExp: e.target.value }))
                }
                className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900"
              >
                <option value={BOUNTY_EXP_OLD}>{bountyExpLabel(BOUNTY_EXP_OLD)}</option>
                <option value={BOUNTY_EXP_NEW}>{bountyExpLabel(BOUNTY_EXP_NEW)}</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
              Status
              <select
                value={detailsForm.isActive ? "active" : "inactive"}
                onChange={(e) =>
                  setDetailsForm((form) => ({
                    ...form,
                    isActive: e.target.value === "active",
                  }))
                }
                className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </label>
            {detailsError && (
              <p className="text-sm text-red-600 sm:col-span-2 lg:col-span-4">
                {detailsError}
              </p>
            )}
            <div className="flex gap-2 sm:col-span-2 lg:col-span-4">
              <button
                type="submit"
                disabled={isSavingDetails}
                className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {isSavingDetails ? "Saving…" : "Save"}
              </button>
              <button
                type="button"
                disabled={isSavingDetails}
                onClick={() => setIsEditingDetails(false)}
                className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        <div className="mt-6 space-y-4">
          <SummaryBlock
            title="This month"
            subtitle={monthLabel}
            shipments={summaries.month.shipments}
            earned={summaries.month.earned}
            paid={summaries.month.paid}
            pendingEarned={summaries.month.pendingEarned}
            pendingShipments={summaries.month.pendingShipments}
          />

          <div>
            <button
              type="button"
              onClick={() => setShowLifetime((open) => !open)}
              className="text-sm font-medium text-blue-700 hover:text-blue-800"
            >
              {showLifetime ? "Hide lifetime totals" : "Show lifetime totals"}
            </button>
            {showLifetime && (
              <div className="mt-3">
                <SummaryBlock
                  title="Lifetime"
                  subtitle="All recorded trips and payouts"
                  shipments={summaries.lifetime.shipments}
                  earned={summaries.lifetime.earned}
                  paid={summaries.lifetime.paid}
                  pendingEarned={summaries.lifetime.pendingEarned}
                  pendingShipments={summaries.lifetime.pendingShipments}
                />
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 max-w-2xl">
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-gray-500">
              Admin Remarks
            </span>
            <textarea
              rows={3}
              value={remarks}
              onChange={(e) => {
                setRemarks(e.target.value);
                setIsDirty(true);
                setSaveError(null);
              }}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </label>
          {saveError && (
            <p className="mt-2 text-sm text-red-600">{saveError}</p>
          )}
          {isDirty && (
            <button
              type="button"
              onClick={handleSaveRemarks}
              disabled={isSavingRemarks}
              className="mt-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
            >
              {isSavingRemarks ? "Saving…" : "Save Remarks"}
            </button>
          )}
        </div>
      </div>

      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-gray-100 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Payout ledger</h2>
            <p className="text-sm text-gray-500">
              Shipments earned by {employee.name}, plus cash already paid out
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {summaries.lifetime.pendingShipments > 0 && (
              <button
                type="button"
                disabled={isApprovingAll}
                onClick={handleApproveAllForEmployee}
                className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3.5 py-2 text-sm font-semibold text-emerald-800 shadow-xs hover:bg-emerald-100 disabled:opacity-50"
              >
                {isApprovingAll ? (
                  <>
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-emerald-700 border-t-transparent" />
                    <span>Approving…</span>
                  </>
                ) : (
                  <>
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      stroke="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="m4.5 12.75 6 6 9-13.5"
                      />
                    </svg>
                    <span>
                      Approve All Pending ({summaries.lifetime.pendingShipments})
                    </span>
                  </>
                )}
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setPayoutError(null);
                setIsPayoutOpen(true);
              }}
              className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800"
            >
              Payout
            </button>
          </div>
        </div>

        {approvalError && (
          <div className="border-b border-red-200 bg-red-50 px-6 py-2.5 text-xs font-medium text-red-700">
            {approvalError}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100 text-sm">
            <thead className="bg-gray-50">
              <tr>
                {[
                  "Date",
                  "Status",
                  "Shipment / details",
                  "Role",
                  "Earned",
                  "Paid",
                  "Balance",
                  "Note",
                  "Action",
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
            <tbody className="divide-y divide-gray-50">
              {ledger.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-gray-500">
                    No shipments or payouts recorded for this employee yet.
                  </td>
                </tr>
              ) : (
                ledger.map((row) => (
                  <LedgerRow
                    key={row.id}
                    row={row}
                    onToggleApproval={handleToggleApproval}
                    isApproving={approvingId === row.shipmentId}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <RecordPayoutModal
        employeeName={employee.name}
        balanceDue={balanceDue}
        isOpen={isPayoutOpen}
        isSaving={isSavingPayout}
        error={payoutError}
        onClose={() => {
          if (isSavingPayout) return;
          setIsPayoutOpen(false);
          setPayoutError(null);
        }}
        onSave={handleRecordPayout}
      />
    </div>
  );
}

function LedgerRow({
  row,
  onToggleApproval,
  isApproving,
}: {
  row: ReturnType<typeof buildPayoutLedger>[number];
  onToggleApproval: (shipmentId: string, currentApproved: boolean) => void;
  isApproving: boolean;
}) {
  const isPayment = row.kind === "payment";
  const isUnapprovedShipment =
    row.kind === "shipment" && row.approved === false;

  let rowClassName = "hover:bg-gray-50 transition-colors";
  if (isPayment) {
    rowClassName = "bg-emerald-50/40 hover:bg-emerald-50 transition-colors";
  } else if (isUnapprovedShipment) {
    rowClassName =
      "bg-amber-50/70 hover:bg-amber-100/70 border-l-4 border-l-amber-400 transition-colors";
  }

  return (
    <tr className={rowClassName}>
      <td className="whitespace-nowrap px-4 py-3 text-gray-700">{row.date}</td>
      <td className="whitespace-nowrap px-4 py-3">
        {isPayment ? (
          <Badge
            label="Payout"
            className="bg-emerald-100 text-emerald-800"
          />
        ) : isUnapprovedShipment ? (
          <Badge
            label="Unapproved"
            className="border border-amber-300 bg-amber-100 text-amber-900"
          />
        ) : (
          <Badge
            label="Approved"
            className="border border-emerald-200/70 bg-emerald-50 text-emerald-800"
          />
        )}
      </td>
      <td className="px-4 py-3">
        {isPayment ? (
          <p className="font-medium text-gray-900">Salary payout</p>
        ) : (
          <>
            <div className="flex items-center gap-1.5">
              <Link
                href={`/?search=${encodeURIComponent(row.shipmentNumber || "")}`}
                title="View & inspect this shipment on the shipments page"
                className="inline-flex items-center gap-1 font-mono text-xs font-semibold text-blue-700 hover:text-blue-900 hover:underline"
              >
                <span>{row.shipmentNumber}</span>
                <svg
                  className="h-3 w-3 opacity-60 hover:opacity-100"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
                  />
                </svg>
              </Link>
            </div>
            <p className="text-xs text-gray-500">
              {row.plateNumber} · {row.client} · {row.route}
            </p>
          </>
        )}
      </td>
      <td className="whitespace-nowrap px-4 py-3">
        {row.role ? (
          <Badge label={row.role} className={shipmentRoleColors[row.role]} />
        ) : (
          <span className="text-gray-400">—</span>
        )}
      </td>
      <td className="whitespace-nowrap px-4 py-3">
        {row.earned > 0 ? (
          isUnapprovedShipment ? (
            <div>
              <span className="font-semibold text-amber-900">
                {formatCurrency(row.earned)}
              </span>
              <span className="block text-[11px] font-medium text-amber-700">
                (Pending approval)
              </span>
            </div>
          ) : (
            <span className="font-medium text-gray-900">
              {formatCurrency(row.earned)}
            </span>
          )
        ) : (
          "—"
        )}
      </td>
      <td className="whitespace-nowrap px-4 py-3 font-medium text-emerald-800">
        {row.paid > 0 ? formatCurrency(row.paid) : "—"}
      </td>
      <td className="whitespace-nowrap px-4 py-3 font-semibold text-gray-900">
        {formatCurrency(row.balanceAfter)}
      </td>
      <td className="max-w-xs truncate px-4 py-3 text-gray-500">
        {row.note || "—"}
      </td>
      <td className="whitespace-nowrap px-4 py-3">
        {row.kind === "shipment" && row.shipmentId ? (
          row.approved ? (
            <button
              type="button"
              disabled={isApproving}
              onClick={() => onToggleApproval(row.shipmentId!, true)}
              title="Click to revoke approval"
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-amber-800 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-400 disabled:opacity-50"
            >
              <span className="font-semibold text-emerald-600">✓</span>
              <span>Approved</span>
            </button>
          ) : (
            <button
              type="button"
              disabled={isApproving}
              onClick={() => onToggleApproval(row.shipmentId!, false)}
              className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:opacity-50"
            >
              {isApproving ? (
                <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <svg
                  className="h-3 w-3"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2.5}
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="m4.5 12.75 6 6 9-13.5"
                  />
                </svg>
              )}
              <span>Approve</span>
            </button>
          )
        ) : (
          <span className="text-gray-400">—</span>
        )}
      </td>
    </tr>
  );
}

function SummaryBlock({
  title,
  subtitle,
  shipments,
  earned,
  paid,
  pendingEarned,
  pendingShipments,
}: {
  title: string;
  subtitle: string;
  shipments: number;
  earned: number;
  paid: number;
  pendingEarned?: number;
  pendingShipments?: number;
}) {
  return (
    <div>
      <div className="mb-2">
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        <p className="text-xs text-gray-500">{subtitle}</p>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <SummaryStat label="Shipments" value={String(shipments)} />
        <SummaryStat
          label="Earned (Approved)"
          value={formatCurrency(earned)}
          subtext={
            pendingEarned && pendingEarned > 0
              ? `+ ${formatCurrency(pendingEarned)} pending (${pendingShipments} unapproved)`
              : undefined
          }
          subtextTone="amber"
        />
        <SummaryStat label="Paid" value={formatCurrency(paid)} />
      </div>
    </div>
  );
}

function SummaryStat({
  label,
  value,
  subtext,
  subtextTone,
}: {
  label: string;
  value: string;
  subtext?: string;
  subtextTone?: "amber" | "gray";
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-center">
      <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
        {label}
      </p>
      <p className="mt-1 text-xl font-bold text-gray-900">{value}</p>
      {subtext && (
        <p
          className={`mt-1 text-xs font-medium ${
            subtextTone === "amber" ? "text-amber-700" : "text-gray-500"
          }`}
        >
          {subtext}
        </p>
      )}
    </div>
  );
}

