"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRole } from "@/context/RoleContext";
import {
  formatCurrency,
  shipmentRoleColors,
  tenureStatusColors,
  type Employee,
  type Shipment,
} from "@/lib/mockData";
import {
  updateEmployeeBountyExp,
  updateEmployeeRemarks,
} from "@/lib/actions/employee";
import { BOUNTY_EXP_NEW, BOUNTY_EXP_OLD } from "@/lib/weight";
import { recordSalaryPayment } from "@/lib/actions/payment";
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
  const [shipments] = useState(initialShipments);
  const [payments, setPayments] = useState(initialPayments);
  const [remarks, setRemarks] = useState(employee.remarks);
  const [bountyExp, setBountyExp] = useState(
    employee.bountyExp ?? BOUNTY_EXP_OLD
  );
  const [isSavingBountyExp, setIsSavingBountyExp] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [isSavingRemarks, setIsSavingRemarks] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isPayoutOpen, setIsPayoutOpen] = useState(false);
  const [isSavingPayout, setIsSavingPayout] = useState(false);
  const [payoutError, setPayoutError] = useState<string | null>(null);
  const [showLifetime, setShowLifetime] = useState(false);

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

    return {
      month: {
        shipments: monthEntries.length,
        earned: monthEntries.reduce((sum, entry) => sum + entry.payout, 0),
        paid: monthPayments.reduce((sum, payment) => sum + payment.amount, 0),
      },
      lifetime: {
        shipments: entries.length,
        earned: entries.reduce((sum, entry) => sum + entry.payout, 0),
        paid: payments.reduce((sum, payment) => sum + payment.amount, 0),
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

  if (role !== "admin") {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-center text-amber-800">
        Admin access required. Switch to Admin view using the role toggle.
      </div>
    );
  }

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
          <div>
            <PageHeader
              title={employee.name}
              description={`${employee.role} · payout ledger`}
            />
            <div className="flex flex-wrap gap-2">
              <Badge label={employee.role} className="bg-blue-100 text-blue-800" />
              <Badge
                label={employee.tenureStatus}
                className={tenureStatusColors[employee.tenureStatus]}
              />
              <Badge
                label={employee.bountyExp ?? BOUNTY_EXP_OLD}
                className={
                  (employee.bountyExp ?? BOUNTY_EXP_OLD) === BOUNTY_EXP_NEW
                    ? "bg-violet-100 text-violet-800"
                    : "bg-amber-100 text-amber-800"
                }
              />
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <select
                value={bountyExp}
                onChange={(e) => setBountyExp(e.target.value)}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-900"
                aria-label="Bounty experience"
              >
                <option value={BOUNTY_EXP_OLD}>oldbounty</option>
                <option value={BOUNTY_EXP_NEW}>newbounty</option>
              </select>
              <button
                type="button"
                disabled={isSavingBountyExp}
                onClick={async () => {
                  setIsSavingBountyExp(true);
                  setSaveError(null);
                  const result = await updateEmployeeBountyExp(
                    employee.id,
                    bountyExp
                  );
                  setIsSavingBountyExp(false);
                  if (!result.success) {
                    setSaveError(result.error);
                    return;
                  }
                  setBountyExp(result.employee.bountyExp ?? BOUNTY_EXP_OLD);
                }}
                className="rounded-md bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50"
              >
                {isSavingBountyExp ? "Saving…" : "Save bountyexp"}
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          <SummaryBlock
            title="This month"
            subtitle={monthLabel}
            shipments={summaries.month.shipments}
            earned={summaries.month.earned}
            paid={summaries.month.paid}
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

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100 text-sm">
            <thead className="bg-gray-50">
              <tr>
                {[
                  "Date",
                  "Type",
                  "Shipment / details",
                  "Role",
                  "Earned",
                  "Paid",
                  "Balance",
                  "Note",
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
                  <td colSpan={8} className="px-4 py-10 text-center text-gray-500">
                    No shipments or payouts recorded for this employee yet.
                  </td>
                </tr>
              ) : (
                ledger.map((row) => <LedgerRow key={row.id} row={row} />)
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
}: {
  row: ReturnType<typeof buildPayoutLedger>[number];
}) {
  const isPayment = row.kind === "payment";

  return (
    <tr className={isPayment ? "bg-emerald-50/40 hover:bg-emerald-50" : "hover:bg-gray-50"}>
      <td className="whitespace-nowrap px-4 py-3 text-gray-700">{row.date}</td>
      <td className="whitespace-nowrap px-4 py-3">
        <Badge
          label={isPayment ? "Payout" : "Shipment"}
          className={
            isPayment
              ? "bg-emerald-100 text-emerald-800"
              : "bg-blue-100 text-blue-800"
          }
        />
      </td>
      <td className="px-4 py-3">
        {isPayment ? (
          <p className="font-medium text-gray-900">Salary payout</p>
        ) : (
          <>
            <p className="font-mono text-xs font-medium text-gray-900">
              {row.shipmentNumber}
            </p>
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
      <td className="whitespace-nowrap px-4 py-3 font-medium text-gray-900">
        {row.earned > 0 ? formatCurrency(row.earned) : "—"}
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
    </tr>
  );
}

function SummaryBlock({
  title,
  subtitle,
  shipments,
  earned,
  paid,
}: {
  title: string;
  subtitle: string;
  shipments: number;
  earned: number;
  paid: number;
}) {
  return (
    <div>
      <div className="mb-2">
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        <p className="text-xs text-gray-500">{subtitle}</p>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <SummaryStat label="Shipments" value={String(shipments)} />
        <SummaryStat label="Earned" value={formatCurrency(earned)} />
        <SummaryStat label="Paid" value={formatCurrency(paid)} />
      </div>
    </div>
  );
}

function SummaryStat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-center">
      <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
        {label}
      </p>
      <p className="mt-1 text-xl font-bold text-gray-900">{value}</p>
    </div>
  );
}
