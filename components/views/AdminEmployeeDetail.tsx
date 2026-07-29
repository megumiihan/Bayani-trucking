"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRole } from "@/context/RoleContext";
import { useData } from "@/context/DataContext";
import {
  formatCurrency,
  payoutStatusColors,
  shipmentRoleColors,
  tenureStatusColors,
} from "@/lib/mockData";
import {
  getEmployeeShipmentEntries,
  getEmployeeStats,
  type EmployeeShipmentEntry,
} from "@/lib/payout";
import Badge from "@/components/ui/Badge";
import PageHeader from "@/components/ui/PageHeader";

interface AdminEmployeeDetailProps {
  employeeId: string;
}

export default function AdminEmployeeDetail({ employeeId }: AdminEmployeeDetailProps) {
  const { role } = useRole();
  const { employees, shipments, updateEmployee } = useData();
  const employee = employees.find((e) => e.id === employeeId);

  const [remarks, setRemarks] = useState(employee?.remarks ?? "");
  const [isDirty, setIsDirty] = useState(false);

  const entries = useMemo(
    () => (employee ? getEmployeeShipmentEntries(shipments, employee.name) : []),
    [employee, shipments]
  );

  const stats = useMemo(
    () => (employee ? getEmployeeStats(shipments, employee.name) : null),
    [employee, shipments]
  );

  useEffect(() => {
    if (employee) {
      setRemarks(employee.remarks);
      setIsDirty(false);
    }
  }, [employee]);

  if (role !== "admin") {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-center text-amber-800">
        Admin access required. Switch to Admin view using the role toggle.
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
        <p className="text-gray-600">Employee not found.</p>
        <Link
          href="/admin/employees"
          className="mt-4 inline-block text-sm font-medium text-blue-700 hover:underline"
        >
          ← Back to Employee Overview
        </Link>
      </div>
    );
  }

  const handleSaveRemarks = () => {
    updateEmployee(employee.id, { remarks });
    setIsDirty(false);
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
              description={`${employee.role} · shipment history and payout overview`}
            />
            <div className="flex flex-wrap gap-2">
              <Badge label={employee.role} className="bg-blue-100 text-blue-800" />
              <Badge
                label={employee.tenureStatus}
                className={tenureStatusColors[employee.tenureStatus]}
              />
            </div>
          </div>
          {stats && (
            <div className="flex gap-4">
              <SummaryStat label="Total Shipments" value={String(stats.shipmentCount)} />
              <SummaryStat
                label="Total Payout"
                value={formatCurrency(stats.totalPayout)}
                accent
              />
            </div>
          )}
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
              }}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </label>
          {isDirty && (
            <button
              type="button"
              onClick={handleSaveRemarks}
              className="mt-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800"
            >
              Save Remarks
            </button>
          )}
        </div>
      </div>

      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-6 py-4">
          <h2 className="text-base font-semibold text-gray-900">Shipment Overview</h2>
          <p className="text-sm text-gray-500">
            All deliveries where {employee.name} served as Driver, Helper, or Extra Helper
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100 text-sm">
            <thead className="bg-gray-50">
              <tr>
                {[
                  "Date",
                  "Plate #",
                  "Shipment / Waybill",
                  "Client",
                  "Route",
                  "Role Served",
                  "Payout",
                  "Payout Status",
                  "Extra Helper Note",
                  "Remarks",
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
              {entries.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-10 text-center text-gray-500">
                    No shipments recorded for this employee yet.
                  </td>
                </tr>
              ) : (
                entries.map((entry) => (
                  <ShipmentRow key={`${entry.shipment.id}-${entry.role}`} entry={entry} />
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function ShipmentRow({ entry }: { entry: EmployeeShipmentEntry }) {
  const { shipment, role, payout } = entry;

  return (
    <tr className="hover:bg-gray-50">
      <td className="whitespace-nowrap px-4 py-3 text-gray-700">{shipment.date}</td>
      <td className="whitespace-nowrap px-4 py-3 font-mono text-gray-600">
        {shipment.plateNumber}
      </td>
      <td className="px-4 py-3">
        <p className="font-mono text-xs font-medium text-gray-900">
          {shipment.shipmentNumber}
        </p>
        <p className="font-mono text-xs text-gray-500">{shipment.waybillNumber}</p>
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-gray-700">{shipment.client}</td>
      <td className="whitespace-nowrap px-4 py-3 text-gray-700">
        {shipment.farthestRoute}
      </td>
      <td className="whitespace-nowrap px-4 py-3">
        <Badge label={role} className={shipmentRoleColors[role]} />
      </td>
      <td className="whitespace-nowrap px-4 py-3 font-medium text-gray-900">
        {formatCurrency(payout)}
      </td>
      <td className="whitespace-nowrap px-4 py-3">
        <Badge
          label={shipment.payoutStatus}
          className={payoutStatusColors[shipment.payoutStatus]}
        />
      </td>
      <td className="max-w-xs px-4 py-3 text-gray-500">
        {shipment.extraHelperNote ?? "—"}
      </td>
      <td className="max-w-xs truncate px-4 py-3 text-gray-500">
        {shipment.remarks || "—"}
      </td>
    </tr>
  );
}

function SummaryStat({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-center">
      <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
        {label}
      </p>
      <p
        className={`mt-1 text-xl font-bold ${accent ? "text-green-700" : "text-gray-900"}`}
      >
        {value}
      </p>
    </div>
  );
}
