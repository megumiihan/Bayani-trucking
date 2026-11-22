"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRole } from "@/context/RoleContext";
import {
  formatCurrency,
  type Employee,
  type Shipment,
} from "@/lib/mockData";
import { getEmployeeStats } from "@/lib/payout";
import Badge from "@/components/ui/Badge";
import EmployeeAvatar from "@/components/ui/EmployeeAvatar";
import EmptyState from "@/components/ui/EmptyState";
import PageHeader from "@/components/ui/PageHeader";
import { useRouter } from "next/navigation";
import AddEmployeeModal from "@/components/admin/AddEmployeeModal";
import AllLoginsModal from "@/components/admin/AllLoginsModal";

interface AdminEmployeesOverviewProps {
  initialEmployees: Employee[];
  initialShipments: Shipment[];
}

type ViewMode = "grid" | "list";
type SortKey = "name" | "role" | "employment" | "status" | "shipments" | "payout";
type SortDir = "asc" | "desc";

interface EmployeeRow {
  employee: Employee;
  shipmentCount: number;
  totalPayout: number;
}

const VIEW_STORAGE_KEY = "employees-overview-view";

const roleStyles: Record<Employee["role"], { header: string; badge: string }> = {
  Driver: { header: "bg-blue-700", badge: "bg-blue-100 text-blue-800" },
  Helper: { header: "bg-sky-500", badge: "bg-sky-100 text-sky-800" },
  Secretary: { header: "bg-violet-600", badge: "bg-violet-100 text-violet-800" },
};
const inactiveHeader = "bg-gray-300";

const isActive = (employee: Employee) => employee.isActive !== false;
const isRegular = (employee: Employee) => employee.isRegular === true;
const regularBadge = "bg-emerald-100 text-emerald-800";

export default function AdminEmployeesOverview({
  initialEmployees,
  initialShipments,
}: AdminEmployeesOverviewProps) {
  const { role, isStaffView } = useRole();
  // Secretaries see the roster but not payout totals or account tools.
  const showMoney = role === "admin";
  const router = useRouter();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isLoginsOpen, setIsLoginsOpen] = useState(false);
  const [view, setView] = useState<ViewMode>("grid");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({
    key: "role",
    dir: "asc",
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem(VIEW_STORAGE_KEY);
      if (saved === "grid" || saved === "list") setView(saved);
    } catch {
      // Storage unavailable; keep the default view.
    }
  }, []);

  const changeView = (next: ViewMode) => {
    setView(next);
    try {
      localStorage.setItem(VIEW_STORAGE_KEY, next);
    } catch {
      // Ignore.
    }
  };

  const rows = useMemo<EmployeeRow[]>(
    () =>
      initialEmployees.map((employee) => {
        const stats = getEmployeeStats(initialShipments, employee.name);
        return {
          employee,
          shipmentCount: stats.shipmentCount,
          totalPayout: stats.totalPayout,
        };
      }),
    [initialEmployees, initialShipments]
  );

  const visibleRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? rows.filter(({ employee }) =>
          `${employee.name} ${employee.role} ${isRegular(employee) ? "regular" : "non-regular"}`
            .toLowerCase()
            .includes(q)
        )
      : rows;

    const byName = (a: EmployeeRow, b: EmployeeRow) =>
      a.employee.name.localeCompare(b.employee.name);

    const compare = (a: EmployeeRow, b: EmployeeRow): number => {
      switch (sort.key) {
        case "name":
          return byName(a, b);
        case "role":
          return a.employee.role.localeCompare(b.employee.role) || byName(a, b);
        case "employment":
          return (
            Number(isRegular(b.employee)) - Number(isRegular(a.employee)) ||
            byName(a, b)
          );
        case "status":
          return (
            Number(isActive(b.employee)) - Number(isActive(a.employee)) ||
            byName(a, b)
          );
        case "shipments":
          return a.shipmentCount - b.shipmentCount || byName(a, b);
        case "payout":
          return a.totalPayout - b.totalPayout || byName(a, b);
      }
    };

    const sign = sort.dir === "asc" ? 1 : -1;
    // Inactive employees always sink to the bottom, whatever the chosen sort.
    return [...filtered].sort(
      (a, b) =>
        Number(!isActive(a.employee)) - Number(!isActive(b.employee)) ||
        sign * compare(a, b)
    );
  }, [rows, query, sort]);

  if (!isStaffView) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-center text-amber-800">
        Admin access required. Switch to Admin view using the role toggle.
      </div>
    );
  }

  const toggleSort = (key: SortKey) =>
    setSort((current) =>
      current.key === key
        ? { key, dir: current.dir === "asc" ? "desc" : "asc" }
        : { key, dir: key === "shipments" || key === "payout" ? "desc" : "asc" }
    );

  return (
    <div>
      <PageHeader
        title="Employee Overview"
        description="Fleet crew at a glance. Open an employee to edit details, remarks, photo and payouts."
        actions={
          <>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search employees…"
              aria-label="Search employees"
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 sm:w-56"
            />
            <ViewToggle view={view} onChange={changeView} />
            {showMoney && (
            <>
            <button
              type="button"
              onClick={() => setIsLoginsOpen(true)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              View all logins
            </button>
            <button
              type="button"
              onClick={() => setIsAddOpen(true)}
              className="rounded-lg bg-blue-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-800"
            >
              Add employee
            </button>
            </>
            )}
          </>
        }
      />

      <AddEmployeeModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onCreated={() => router.refresh()}
      />
      <AllLoginsModal isOpen={isLoginsOpen} onClose={() => setIsLoginsOpen(false)} />

      {visibleRows.length === 0 ? (
        <EmptyState
          icon={
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden>
              <circle cx="12" cy="8" r="4" />
              <path d="M4 20c0-4 4-6 8-6s8 2 8 6" strokeLinecap="round" />
            </svg>
          }
          title={query ? "No matching employees" : "No employees yet"}
          description={
            query ? `Nothing matches “${query}”.` : "Employees you add will appear here."
          }
        />
      ) : view === "grid" ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {visibleRows.map((row) => (
            <EmployeeCard key={row.employee.id} {...row} showMoney={showMoney} />
          ))}
        </div>
      ) : (
        <EmployeeTable rows={visibleRows} sort={sort} onSort={toggleSort} showMoney={showMoney} />
      )}
    </div>
  );
}

function ViewToggle({
  view,
  onChange,
}: {
  view: ViewMode;
  onChange: (view: ViewMode) => void;
}) {
  const base =
    "flex h-9 w-10 items-center justify-center text-gray-600 transition-colors";
  const active = "bg-gray-100 text-gray-900 shadow-inner";

  return (
    <div
      role="group"
      aria-label="View mode"
      className="flex overflow-hidden rounded-lg border border-gray-300 bg-white shadow-sm"
    >
      <button
        type="button"
        aria-label="Grid view"
        aria-pressed={view === "grid"}
        onClick={() => onChange("grid")}
        className={`${base} ${view === "grid" ? active : "hover:bg-gray-50"}`}
      >
        <svg viewBox="0 0 16 16" className="h-4 w-4" fill="currentColor" aria-hidden>
          <rect x="1" y="1" width="6" height="6" rx="1" />
          <rect x="9" y="1" width="6" height="6" rx="1" />
          <rect x="1" y="9" width="6" height="6" rx="1" />
          <rect x="9" y="9" width="6" height="6" rx="1" />
        </svg>
      </button>
      <button
        type="button"
        aria-label="List view"
        aria-pressed={view === "list"}
        onClick={() => onChange("list")}
        className={`${base} border-l border-gray-300 ${view === "list" ? active : "hover:bg-gray-50"}`}
      >
        <svg viewBox="0 0 16 16" className="h-4 w-4" fill="currentColor" aria-hidden>
          <rect x="1" y="2" width="2" height="2" rx="0.5" />
          <rect x="5" y="2" width="10" height="2" rx="0.5" />
          <rect x="1" y="7" width="2" height="2" rx="0.5" />
          <rect x="5" y="7" width="10" height="2" rx="0.5" />
          <rect x="1" y="12" width="2" height="2" rx="0.5" />
          <rect x="5" y="12" width="10" height="2" rx="0.5" />
        </svg>
      </button>
    </div>
  );
}

function EmployeeCard({
  employee,
  shipmentCount,
  totalPayout,
  showMoney,
}: EmployeeRow & { showMoney: boolean }) {
  const active = isActive(employee);
  const styles = roleStyles[employee.role];

  return (
    <Link
      href={`/admin/employees/${employee.id}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
    >
      <div className={`relative h-20 ${active ? styles.header : inactiveHeader}`}>
        <span className="absolute left-2 top-1.5 text-[11px] font-bold uppercase text-white/90">
          {employee.role[0]}
        </span>
      </div>
      {/* relative z-10 so the photo paints over the positioned header strip. */}
      <div className="relative z-10 -mt-12 flex flex-1 flex-col items-center px-3 pb-4 text-center">
        <EmployeeAvatar
          name={employee.name}
          photoUrl={employee.photoUrl}
          size={80}
          className={`ring-4 ring-white ${active ? "" : "grayscale"}`}
        />
        <p className="mt-3 line-clamp-2 text-sm font-semibold text-blue-700 group-hover:underline">
          {employee.name}
        </p>
        <div className="mt-1.5 flex flex-wrap justify-center gap-1">
          <Badge
            label={employee.role}
            className={active ? styles.badge : "bg-gray-400 text-white"}
          />
          {isRegular(employee) && (
            <Badge label="Regular" className={active ? regularBadge : "bg-gray-100 text-gray-600"} />
          )}
          {!active && <Badge label="Inactive" className="bg-gray-100 text-gray-600" />}
        </div>
        <p className="mt-2 text-[11px] text-gray-500 tabular-nums">
          {shipmentCount} {shipmentCount === 1 ? "shipment" : "shipments"}
          {showMoney && (
            <>
              {" · "}
              <span className="font-medium text-green-700">{formatCurrency(totalPayout)}</span>
            </>
          )}
        </p>
      </div>
    </Link>
  );
}

function EmployeeTable({
  rows,
  sort,
  onSort,
  showMoney,
}: {
  rows: EmployeeRow[];
  sort: { key: SortKey; dir: SortDir };
  onSort: (key: SortKey) => void;
  showMoney: boolean;
}) {
  const header = (key: SortKey, label: string, align: "left" | "right" = "left") => (
    <th
      scope="col"
      aria-sort={
        sort.key === key ? (sort.dir === "asc" ? "ascending" : "descending") : "none"
      }
      className={`px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 ${
        align === "right" ? "text-right" : "text-left"
      }`}
    >
      <button
        type="button"
        onClick={() => onSort(key)}
        className="inline-flex items-center gap-1 hover:text-gray-900"
      >
        {label}
        <span aria-hidden className={sort.key === key ? "text-gray-900" : "text-gray-300"}>
          {sort.key === key && sort.dir === "desc" ? "↓" : "↑"}
        </span>
      </button>
    </th>
  );

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {header("status", "Status")}
            <th scope="col" className="w-14 px-2 py-3">
              <span className="sr-only">Photo</span>
            </th>
            {header("name", "Name")}
            {header("role", "Role")}
            {header("employment", "Employment")}
            {header("shipments", "Shipments", "right")}
            {showMoney && header("payout", "Total payout", "right")}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map(({ employee, shipmentCount, totalPayout }) => {
            const active = isActive(employee);
            return (
              <tr key={employee.id} className="hover:bg-gray-50">
                <td className="px-4 py-2.5">
                  <span className="inline-flex items-center gap-2 text-xs text-gray-600">
                    <span
                      aria-hidden
                      className={`h-2.5 w-2.5 rounded-full ${active ? "bg-green-500" : "bg-gray-300"}`}
                    />
                    {active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-2 py-2.5">
                  <EmployeeAvatar
                    name={employee.name}
                    photoUrl={employee.photoUrl}
                    size={36}
                    className={active ? "" : "grayscale"}
                  />
                </td>
                <td className="whitespace-nowrap px-4 py-2.5">
                  <Link
                    href={`/admin/employees/${employee.id}`}
                    className="text-sm font-medium text-blue-700 hover:text-blue-800 hover:underline"
                  >
                    {employee.name}
                  </Link>
                </td>
                <td className="px-4 py-2.5">
                  <Badge
                    label={employee.role}
                    className={active ? roleStyles[employee.role].badge : "bg-gray-400 text-white"}
                  />
                </td>
                <td className="px-4 py-2.5">
                  {isRegular(employee) ? (
                    <Badge
                      label="Regular"
                      className={active ? regularBadge : "bg-gray-100 text-gray-600"}
                    />
                  ) : (
                    <span className="text-xs text-gray-400">Non-regular</span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-right text-sm tabular-nums text-gray-900">
                  {shipmentCount}
                </td>
                {showMoney && (
                  <td className="px-4 py-2.5 text-right text-sm font-semibold tabular-nums text-green-700">
                    {formatCurrency(totalPayout)}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
