"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRole } from "@/context/RoleContext";
import { useData } from "@/context/DataContext";
import {
  formatCurrency,
  tenureStatusColors,
  type Employee,
} from "@/lib/mockData";
import { getEmployeeStats } from "@/lib/payout";
import Badge from "@/components/ui/Badge";
import PageHeader from "@/components/ui/PageHeader";

export default function AdminEmployeesOverview() {
  const { role } = useRole();
  const { employees, shipments, updateEmployee } = useData();

  const sortedEmployees = useMemo(
    () =>
      [...employees].sort((a, b) => {
        if (a.role !== b.role) return a.role.localeCompare(b.role);
        return a.name.localeCompare(b.name);
      }),
    [employees]
  );

  if (role !== "admin") {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-center text-amber-800">
        Admin access required. Switch to Admin view using the role toggle.
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Employee Overview"
        description="Operations reference for fleet crew — manually maintained by admin."
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {sortedEmployees.map((employee) => {
          const stats = getEmployeeStats(shipments, employee.name);

          return (
            <EmployeeCard
              key={employee.id}
              employee={employee}
              shipmentCount={stats.shipmentCount}
              totalPayout={stats.totalPayout}
              onSaveRemarks={(remarks) =>
                updateEmployee(employee.id, { remarks })
              }
            />
          );
        })}
      </div>
    </div>
  );
}

function EmployeeCard({
  employee,
  shipmentCount,
  totalPayout,
  onSaveRemarks,
}: {
  employee: Employee;
  shipmentCount: number;
  totalPayout: number;
  onSaveRemarks: (remarks: string) => void;
}) {
  const [remarks, setRemarks] = useState(employee.remarks);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    setRemarks(employee.remarks);
    setIsDirty(false);
  }, [employee.remarks]);

  const handleSave = () => {
    onSaveRemarks(remarks);
    setIsDirty(false);
  };

  return (
    <article className="flex flex-col rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <Link
            href={`/admin/employees/${employee.id}`}
            className="text-lg font-semibold text-blue-700 hover:text-blue-800 hover:underline"
          >
            {employee.name}
          </Link>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge label={employee.role} className="bg-blue-100 text-blue-800" />
            <Badge
              label={employee.tenureStatus}
              className={tenureStatusColors[employee.tenureStatus]}
            />
          </div>
        </div>
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gray-100 text-sm font-bold text-gray-600">
          {employee.name
            .split(" ")
            .map((part) => part[0])
            .slice(0, 2)
            .join("")}
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3">
        <StatPill label="Total Shipments" value={String(shipmentCount)} />
        <StatPill label="Total Payout" value={formatCurrency(totalPayout)} accent />
      </div>

      <div className="mt-auto">
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
            placeholder="Notes for operations reference..."
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </label>
        {isDirty && (
          <button
            type="button"
            onClick={handleSave}
            className="mt-2 rounded-lg bg-blue-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-800"
          >
            Save Remarks
          </button>
        )}
      </div>
    </article>
  );
}

function StatPill({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2.5">
      <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
        {label}
      </p>
      <p
        className={`mt-0.5 text-sm font-bold ${accent ? "text-green-700" : "text-gray-900"}`}
      >
        {value}
      </p>
    </div>
  );
}
