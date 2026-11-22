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
  setShipmentSecretaryApproval,
} from "@/lib/actions/shipment";
import type { SalaryPaymentUi } from "@/lib/mappers/salaryPayment";
import {
  buildPayoutLedger,
  formatMonthLabel,
  getEmployeeShipmentEntries,
  getMonthKey,
} from "@/lib/payout";
import RecordPayoutModal from "@/components/admin/RecordPayoutModal";
import EmployeeLoginCard from "@/components/admin/EmployeeLoginCard";
import EmployeePhotoUpload from "@/components/admin/EmployeePhotoUpload";
import EmployeeAvatar from "@/components/ui/EmployeeAvatar";
import GovernmentIdsPanel from "@/components/admin/GovernmentIdsPanel";
import type { GovernmentIds } from "@/lib/governmentIds";
import Badge from "@/components/ui/Badge";

function toDetailsForm(employee: Employee): EmployeeDetailsInput {
  return {
    name: employee.name,
    role: employee.role === "Helper" ? "Helper" : "Driver",
    bountyExp: employee.bountyExp === BOUNTY_EXP_NEW ? BOUNTY_EXP_NEW : BOUNTY_EXP_OLD,
    isActive: employee.isActive !== false,
    isRegular: employee.isRegular === true,
  };
}

interface AdminEmployeeDetailProps {
  employee: Employee;
  initialShipments: Shipment[];
  initialPayments: SalaryPaymentUi[];
  loginEmail: string | null;
  /** Null unless the viewer is an admin. */
  governmentIds: GovernmentIds | null;
}

export default function AdminEmployeeDetail({
  employee,
  initialShipments,
  initialPayments,
  loginEmail,
  governmentIds,
}: AdminEmployeeDetailProps) {
  const { role, isStaffView } = useRole();
  // Secretaries log and edit payouts but don't see money totals or account settings.
  const isAdminView = role === "admin";
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

  if (!isStaffView) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-center text-amber-800">
        Admin access required. Switch to Admin view using the role toggle.
      </div>
    );
  }

  const handleTogglePreApproval = async (shipmentId: string, current: boolean) => {
    if (approvingId) return;
    setApprovingId(shipmentId);
    setApprovalError(null);
    const setFlag = (value: boolean) =>
      setShipments((list) =>
        list.map((s) => (s.id === shipmentId ? { ...s, secretaryApproved: value } : s))
      );
    setFlag(!current);
    const result = await setShipmentSecretaryApproval([shipmentId], !current);
    setApprovingId(null);
    if (!result.success) {
      setFlag(current);
      setApprovalError(result.error);
    }
  };

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

      <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
        {/* Profile card */}
        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col items-center text-center">
            {isAdminView ? (
              <EmployeePhotoUpload
                key={employee.photoUrl ?? "none"}
                employeeId={employee.id}
                name={employee.name}
                photoUrl={employee.photoUrl}
              />
            ) : (
              <EmployeeAvatar
                name={employee.name}
                photoUrl={employee.photoUrl}
                size={96}
                className="ring-4 ring-white shadow-md"
              />
            )}
            <h1 className="mt-3 text-balance text-2xl font-bold tracking-tight text-slate-900">
              {employee.name}
            </h1>
            <p className="text-sm text-slate-500">{employee.position}</p>
          </div>

          {isAdminView && !isEditingDetails && (
            <button
              type="button"
              onClick={startEditingDetails}
              className="mt-4 w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Edit details
            </button>
          )}

          <div className="mt-5 border-t border-gray-100 pt-4">
            <h2 className="mb-3 text-sm font-semibold text-gray-900">Profile</h2>

            {isEditingDetails ? (
              <form onSubmit={handleSaveDetails} className="flex flex-col gap-3">
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
                    <option value="Secretary">Secretary</option>
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
                <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
                  Employment
                  <select
                    value={detailsForm.isRegular ? "regular" : "non-regular"}
                    onChange={(e) =>
                      setDetailsForm((form) => ({
                        ...form,
                        isRegular: e.target.value === "regular",
                      }))
                    }
                    className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900"
                  >
                    <option value="non-regular">Non-regular</option>
                    <option value="regular">Regular</option>
                  </select>
                </label>
                {detailsError && <p className="text-sm text-red-600">{detailsError}</p>}
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={isSavingDetails}
                    className="flex-1 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isSavingDetails ? "Saving…" : "Save"}
                  </button>
                  <button
                    type="button"
                    disabled={isSavingDetails}
                    onClick={() => setIsEditingDetails(false)}
                    className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <dl className="space-y-2.5">
                <InfoRow icon={<RoleIcon />} label="Role" value={employee.role} />
                <InfoRow
                  icon={<StatusIcon />}
                  label="Status"
                  value={
                    <span
                      className={
                        employee.isActive === false ? "text-gray-500" : "text-green-700"
                      }
                    >
                      {employee.isActive === false ? "Inactive" : "Active"}
                    </span>
                  }
                />
                <InfoRow
                  icon={<IdCardIcon />}
                  label="Employment"
                  value={employee.isRegular ? "Regular" : "Non-regular"}
                />
                {employee.role !== "Secretary" && (
                  <InfoRow
                    icon={<StarIcon />}
                    label="Bounty"
                    value={bountyExpLabel(employee.bountyExp)}
                  />
                )}
              </dl>
            )}
          </div>
        </section>

        {/* Earnings card */}
        <section className="flex flex-col rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-100 px-6 py-4">
            <div>
              <h2 className="text-base font-semibold text-gray-900">
                {isAdminView ? "Earnings" : "Activity"}
              </h2>
              <p className="text-sm text-gray-500">
                {showLifetime ? "All recorded trips and payouts" : monthLabel}
              </p>
            </div>
            <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-0.5 text-xs font-medium">
              {[
                { key: false, label: "This month" },
                { key: true, label: "Lifetime" },
              ].map((opt) => (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => setShowLifetime(opt.key)}
                  className={`rounded-md px-3 py-1 ${
                    showLifetime === opt.key
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="px-6 py-4">
            <SummaryBlock
              {...(showLifetime ? summaries.lifetime : summaries.month)}
              showMoney={isAdminView}
            />
          </div>

          {isAdminView && (
            <div className="border-t border-gray-100 px-6 py-4">
              <EmployeeLoginCard
                key={employee.id}
                employeeId={employee.id}
                employeeName={employee.name}
                isActive={employee.isActive !== false}
                initialLoginEmail={loginEmail}
                embedded
              />
            </div>
          )}

          {!isAdminView ? (
            <div className="flex-1 border-t border-gray-100 px-6 py-4">
              <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-gray-500">
                Admin Remarks
              </span>
              <p className="whitespace-pre-wrap text-sm text-gray-700">
                {employee.remarks || <span className="text-gray-400">No remarks.</span>}
              </p>
            </div>
          ) : (
          <div className="flex flex-1 flex-col border-t border-gray-100 px-6 py-4">
            <label className="flex flex-1 flex-col">
              <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-gray-500">
                Admin Remarks
              </span>
              <textarea
                rows={2}
                placeholder="Notes about this employee…"
                value={remarks}
                onChange={(e) => {
                  setRemarks(e.target.value);
                  setIsDirty(true);
                  setSaveError(null);
                }}
                className="min-h-[4.5rem] w-full flex-1 resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </label>
            {saveError && <p className="mt-2 text-sm text-red-600">{saveError}</p>}
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
          )}
        </section>
      </div>

      {employee.isRegular && governmentIds && (
        <GovernmentIdsPanel
          key={employee.id}
          employeeId={employee.id}
          initialIds={governmentIds}
        />
      )}

      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-gray-100 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Payout ledger</h2>
            <p className="text-sm text-gray-500">
              Shipments earned by {employee.name}, plus cash already paid out
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {isAdminView && summaries.lifetime.pendingShipments > 0 && (
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
                  ...(isAdminView ? ["Balance"] : []),
                  "Logged by",
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
                  <td colSpan={isAdminView ? 10 : 9} className="px-4 py-10 text-center text-gray-500">
                    No shipments or payouts recorded for this employee yet.
                  </td>
                </tr>
              ) : (
                ledger.map((row) => (
                  <LedgerRow
                    key={row.id}
                    row={row}
                    onToggleApproval={handleToggleApproval}
                    onTogglePreApproval={handleTogglePreApproval}
                    isAdminView={isAdminView}
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
        balanceDue={isAdminView ? balanceDue : null}
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
  onTogglePreApproval,
  isAdminView,
  isApproving,
}: {
  row: ReturnType<typeof buildPayoutLedger>[number];
  onToggleApproval: (shipmentId: string, currentApproved: boolean) => void;
  onTogglePreApproval: (shipmentId: string, current: boolean) => void;
  isAdminView: boolean;
  isApproving: boolean;
}) {
  const isPreApproved = row.kind === "shipment" && !row.approved && row.secretaryApproved === true;
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
        ) : isPreApproved ? (
          <Badge
            label="Pre-approved"
            className="border border-yellow-300 bg-yellow-100 text-yellow-800"
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
      {isAdminView && (
        <td className="whitespace-nowrap px-4 py-3 font-semibold text-gray-900">
          {formatCurrency(row.balanceAfter)}
        </td>
      )}
      <td className="whitespace-nowrap px-4 py-3 text-gray-700">
        {row.loggedBy ?? <span className="text-gray-400">—</span>}
      </td>
      <td className="max-w-xs truncate px-4 py-3 text-gray-500">
        {row.note || "—"}
      </td>
      <td className="whitespace-nowrap px-4 py-3">
        {row.kind === "shipment" && row.shipmentId && !isAdminView ? (
          row.approved ? (
            <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-emerald-700">
              <span className="font-semibold">✓</span> Approved
            </span>
          ) : (
            <button
              type="button"
              disabled={isApproving}
              onClick={() => onTogglePreApproval(row.shipmentId!, isPreApproved)}
              title={
                isPreApproved
                  ? "Click to remove your pre-approval"
                  : "Pre-approve. The admin still has to approve before it counts toward payouts."
              }
              className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400 disabled:opacity-50 ${
                isPreApproved
                  ? "bg-yellow-400 text-yellow-950 hover:bg-yellow-300"
                  : "border border-yellow-400 text-yellow-800 hover:bg-yellow-50"
              }`}
            >
              {isApproving ? (
                <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-yellow-800 border-t-transparent" />
              ) : (
                <span aria-hidden>✓</span>
              )}
              <span>{isPreApproved ? "Pre-approved" : "Pre-approve"}</span>
            </button>
          )
        ) : row.kind === "shipment" && row.shipmentId ? (
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
  shipments,
  earned,
  paid,
  pendingEarned,
  pendingShipments,
  approvedShipments,
  showMoney = true,
}: {
  shipments: number;
  earned: number;
  paid: number;
  pendingEarned?: number;
  pendingShipments?: number;
  approvedShipments?: number;
  /** False for secretaries: counts only, no peso totals. */
  showMoney?: boolean;
}) {
  if (!showMoney) {
    return (
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <SummaryStat label="Shipments" value={String(shipments)} accent="bg-blue-500" />
        <SummaryStat
          label="Approved"
          value={String(approvedShipments ?? 0)}
          accent="bg-green-500"
        />
        <SummaryStat
          label="Awaiting approval"
          value={String(pendingShipments ?? 0)}
          accent="bg-yellow-400"
        />
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <SummaryStat label="Shipments" value={String(shipments)} accent="bg-blue-500" />
        <SummaryStat
          label="Earned (approved)"
          value={formatCurrency(earned)}
          accent="bg-green-500"
        />
        <SummaryStat label="Paid" value={formatCurrency(paid)} accent="bg-slate-400" />
      </div>
      {pendingEarned !== undefined && pendingEarned > 0 && (
        <p className="mt-4 text-xs font-medium text-amber-700">
          + {formatCurrency(pendingEarned)} pending approval ({pendingShipments}{" "}
          unapproved)
        </p>
      )}
    </div>
  );
}

function SummaryStat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div>
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums text-gray-900">{value}</p>
      <div className={`mt-1.5 h-0.5 w-full max-w-[10rem] rounded-full ${accent}`} />
    </div>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2.5 text-sm">
      <span className="mt-0.5 shrink-0 text-gray-400">{icon}</span>
      <dt className="shrink-0 text-gray-500">{label}</dt>
      <dd className="min-w-0 font-semibold text-gray-900">{value}</dd>
    </div>
  );
}

function IconSvg({ children }: { children: React.ReactNode }) {
  return (
    <svg
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.75}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

function RoleIcon() {
  return (
    <IconSvg>
      <path d="M3 6h11v10H3zM14 10h4l3 3v3h-7z" />
      <circle cx="7" cy="18" r="1.75" />
      <circle cx="17" cy="18" r="1.75" />
    </IconSvg>
  );
}

function StatusIcon() {
  return (
    <IconSvg>
      <path d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </IconSvg>
  );
}

function IdCardIcon() {
  return (
    <IconSvg>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <circle cx="9" cy="11" r="2" />
      <path d="M6 16c.5-1.3 1.6-2 3-2s2.5.7 3 2M14 10h4M14 13h3" />
    </IconSvg>
  );
}

function StarIcon() {
  return (
    <IconSvg>
      <path d="M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6l-5.4 2.9 1.2-6-4.5-4.2 6.1-.7L12 3z" />
    </IconSvg>
  );
}

