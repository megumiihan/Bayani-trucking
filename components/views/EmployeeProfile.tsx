"use client";

import { useMemo, useState } from "react";
import {
  formatCurrency,
  shipmentRoleColors,
  tenureStatusColors,
  type Employee,
  type Shipment,
} from "@/lib/mockData";
import {
  formatMonthLabel,
  getEmployeeShipmentEntries,
  getMonthKey,
  getMonthlyEarningsTotal,
  type EmployeeShipmentEntry,
} from "@/lib/payout";
import { useRole } from "@/context/RoleContext";
import Badge from "@/components/ui/Badge";
import PageHeader from "@/components/ui/PageHeader";

const ALL_MONTHS = "all";
const ALL_CLIENTS = "all";

function getCurrentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function getPreviousMonthKeys(count: number): string[] {
  const keys: string[] = [];
  const now = new Date();

  for (let i = 1; i <= count; i += 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    keys.push(
      `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
    );
  }

  return keys;
}

interface EmployeeProfileProps {
  initialShipments: Shipment[];
  initialEmployees: Employee[];
}

export default function EmployeeProfile({
  initialShipments,
  initialEmployees,
}: EmployeeProfileProps) {
  const [shipments] = useState(initialShipments);
  const [employees] = useState(initialEmployees);
  const { currentEmployee, setCurrentEmployee, isAdmin } = useRole();
  const [monthFilter, setMonthFilter] = useState(ALL_MONTHS);
  const [clientFilter, setClientFilter] = useState(ALL_CLIENTS);

  const employeeRecord = employees.find((e) => e.name === currentEmployee);
  const currentMonthKey = getCurrentMonthKey();

  const allEntries = useMemo(
    () => getEmployeeShipmentEntries(shipments, currentEmployee),
    [shipments, currentEmployee]
  );

  const monthOptions = useMemo(() => {
    const keys = new Set(allEntries.map((entry) => getMonthKey(entry.shipment.date)));
    return Array.from(keys).sort((a, b) => b.localeCompare(a));
  }, [allEntries]);

  const clientOptions = useMemo(() => {
    const clients = new Set(allEntries.map((entry) => entry.shipment.client));
    return Array.from(clients).sort();
  }, [allEntries]);

  const currentMonthEntries = allEntries.filter(
    (entry) => getMonthKey(entry.shipment.date) === currentMonthKey
  );

  const expectedSalary = currentMonthEntries.reduce(
    (sum, entry) => sum + entry.payout,
    0
  );

  const historicalMonths = getPreviousMonthKeys(3).map((monthKey) => ({
    monthKey,
    label: formatMonthLabel(monthKey),
    total: getMonthlyEarningsTotal(allEntries, monthKey),
  }));

  const filteredEntries = allEntries.filter((entry) => {
    const matchesMonth =
      monthFilter === ALL_MONTHS ||
      getMonthKey(entry.shipment.date) === monthFilter;
    const matchesClient =
      clientFilter === ALL_CLIENTS || entry.shipment.client === clientFilter;
    return matchesMonth && matchesClient;
  });

  return (
    <div>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <PageHeader
          title="Profile & Earnings"
          description="Track your monthly salary, shipment history, and role-based payouts."
        />

        <label className={`shrink-0 ${isAdmin ? "" : "hidden"}`}>
          <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-gray-500">
            Viewing as
          </span>
          <select
            value={currentEmployee}
            onChange={(e) => setCurrentEmployee(e.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            {employees
              .filter((e) => e.tenureStatus !== "inactive")
              .map((employee) => (
                <option key={employee.id} value={employee.name}>
                  {employee.name} ({employee.role})
                </option>
              ))}
          </select>
        </label>
      </div>

      {/* Profile strip */}
      <div className="mb-8 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 text-lg font-bold text-blue-700">
            {currentEmployee
              ? currentEmployee
                  .split(" ")
                  .map((part) => part[0])
                  .slice(0, 2)
                  .join("")
              : "?"}
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {currentEmployee || "Account not linked to a crew member"}
            </h2>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              {employeeRecord && (
                <>
                  <Badge label={employeeRecord.role} className="bg-blue-100 text-blue-800" />
                  <Badge
                    label={employeeRecord.tenureStatus}
                    className={tenureStatusColors[employeeRecord.tenureStatus]}
                  />
                </>
              )}
            </div>
            {!currentEmployee && !isAdmin && (
              <p className="mt-2 text-sm text-gray-500">
                This login is not connected to an employee record, so earnings
                and shipment history cannot be shown. Ask an admin to link the
                account.
              </p>
            )}
            {employeeRecord?.remarks && (
              <p className="mt-2 text-sm text-gray-500">{employeeRecord.remarks}</p>
            )}
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="mb-8 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <SummaryCard
          label="Expected Salary (Current Month)"
          value={formatCurrency(expectedSalary)}
          sublabel={formatMonthLabel(currentMonthKey)}
          accent="green"
        />
        <SummaryCard
          label="Shipments Completed"
          value={String(currentMonthEntries.length)}
          sublabel={`${formatMonthLabel(currentMonthKey)} · all roles`}
          accent="blue"
        />
        <HistoricalPayCard months={historicalMonths} />
      </div>

      {/* Shipment history */}
      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-gray-100 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              Personal Shipment History
            </h2>
            <p className="text-sm text-gray-500">
              All deliveries where you served as Driver, Helper, or Extra Helper
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <FilterSelect
              label="Month"
              value={monthFilter}
              onChange={setMonthFilter}
              options={[
                { value: ALL_MONTHS, label: "All months" },
                ...monthOptions.map((key) => ({
                  value: key,
                  label: formatMonthLabel(key),
                })),
              ]}
            />
            <FilterSelect
              label="Client"
              value={clientFilter}
              onChange={setClientFilter}
              options={[
                { value: ALL_CLIENTS, label: "All clients" },
                ...clientOptions.map((client) => ({
                  value: client,
                  label: client,
                })),
              ]}
            />
          </div>
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
                  "Client #",
                  "Farthest Route",
                  "Role Served",
                  "Calculated Payout",
                  "Extra Helper",
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
              {filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-4 py-10 text-center text-gray-500">
                    No shipments match the selected filters.
                  </td>
                </tr>
              ) : (
                filteredEntries.map((entry) => (
                  <ShipmentHistoryRow key={`${entry.shipment.id}-${entry.role}`} entry={entry} />
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function ShipmentHistoryRow({ entry }: { entry: EmployeeShipmentEntry }) {
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
      <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-gray-600">
        {shipment.clientNumber}
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-gray-700">
        <p>{shipment.farthestRoute}</p>
        {shipment.pigheadCount != null && (
          <p className="text-xs text-gray-500">{shipment.pigheadCount} heads</p>
        )}
      </td>
      <td className="whitespace-nowrap px-4 py-3">
        <Badge label={role} className={shipmentRoleColors[role]} />
      </td>
      <td className="whitespace-nowrap px-4 py-3 font-medium text-gray-900">
        {formatCurrency(payout)}
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-gray-700">
        {shipment.extraHelper ?? "—"}
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

function SummaryCard({
  label,
  value,
  sublabel,
  accent = "blue",
}: {
  label: string;
  value: string;
  sublabel?: string;
  accent?: "blue" | "green";
}) {
  const accentMap = {
    blue: "text-blue-700",
    green: "text-green-700",
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
        {label}
      </p>
      <p className={`mt-1 text-2xl font-bold ${accentMap[accent]}`}>{value}</p>
      {sublabel && <p className="mt-1 text-xs text-gray-500">{sublabel}</p>}
    </div>
  );
}

function HistoricalPayCard({
  months,
}: {
  months: { monthKey: string; label: string; total: number }[];
}) {
  const maxTotal = Math.max(...months.map((m) => m.total), 1);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
        Historical Pay Summary
      </p>
      <p className="mt-1 text-sm text-gray-600">Previous monthly totals</p>

      <div className="mt-4 space-y-3">
        {months.map((month, index) => (
          <div key={month.monthKey}>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="text-gray-600">
                {index === 0 ? "Last Month" : month.label}
              </span>
              <span className="font-semibold text-gray-900">
                {formatCurrency(month.total)}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full bg-blue-500 transition-all"
                style={{ width: `${(month.total / maxTotal) * 100}%` }}
              />
            </div>
            {index === 0 && (
              <p className="mt-0.5 text-xs text-gray-400">{month.label}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label>
      <span className="mb-1 block text-xs font-medium text-gray-500">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
