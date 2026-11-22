"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useRole } from "@/context/RoleContext";
import { formatCurrency } from "@/lib/mockData";
import {
  formatShortDate,
  getTruckAlerts,
  type MaintenanceConfig,
  type TruckAlert,
} from "@/lib/truckMaintenance";
import type { TruckOverviewRow } from "@/lib/truckRecords";
import EmptyState from "@/components/ui/EmptyState";
import PageHeader from "@/components/ui/PageHeader";
import NewTruckModal from "@/components/admin/NewTruckModal";
import MaintenanceSettings from "@/components/admin/MaintenanceSettings";

interface AdminTrucksOverviewProps {
  rows: TruckOverviewRow[];
  /** Maintenance types and monthly check items, applied to every truck. */
  config: MaintenanceConfig;
  /** Signed-in user is an admin: sees the fleet list and can add trucks. */
  canManage: boolean;
}

type TruckHealth = "required" | "check" | "ok" | "inactive";

interface BoardRow extends TruckOverviewRow {
  alerts: TruckAlert[];
  health: TruckHealth;
}

const healthStyles: Record<TruckHealth, { label: string; dot: string; text: string }> = {
  required: { label: "Needs maintenance", dot: "bg-red-500", text: "text-red-700" },
  check: { label: "Check due", dot: "bg-amber-400", text: "text-amber-700" },
  ok: { label: "All clear", dot: "bg-green-500", text: "text-green-700" },
  inactive: { label: "Inactive", dot: "bg-gray-300", text: "text-gray-500" },
};

export default function AdminTrucksOverview({ rows, config, canManage }: AdminTrucksOverviewProps) {
  const { role } = useRole();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  // Admins previewing another view see what that role sees.
  const isAdminView = canManage && role === "admin";

  const boardRows = useMemo<BoardRow[]>(
    () =>
      rows.map((row) => {
        if (!row.truck.isActive) return { ...row, alerts: [], health: "inactive" };
        const alerts = getTruckAlerts(
          config,
          row.truck.truckType,
          row.lastDoneByType,
          row.latestCheck,
          row.documentDueDates
        );
        const health: TruckHealth = alerts.some((a) => a.level === "required")
          ? "required"
          : alerts.length > 0
            ? "check"
            : "ok";
        return { ...row, alerts, health };
      }),
    [rows, config]
  );

  const needsAttention = boardRows
    .filter((row) => row.health === "required" || row.health === "check")
    .sort((a, b) => (a.health === b.health ? 0 : a.health === "required" ? -1 : 1));
  const allClear = boardRows.filter((row) => row.health === "ok");
  const counts = {
    required: boardRows.filter((row) => row.health === "required").length,
    check: boardRows.filter((row) => row.health === "check").length,
    ok: allClear.length,
  };

  const visibleRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return boardRows;
    return boardRows.filter(({ truck }) =>
      [truck.plateNumber, truck.make, truck.truckType, String(truck.yearModel)]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [boardRows, query]);

  return (
    <div>
      <PageHeader
        title={isAdminView ? "Truck Overview" : "Trucks"}
        description={
          isAdminView
            ? "Maintenance board and fleet list. Open a truck to log repairs and fuel, record its monthly check and see shipments."
            : "Maintenance board. Open a truck to log fuel, repairs and its monthly check."
        }
        actions={
          isAdminView && (
            <button
              type="button"
              onClick={() => setIsAddOpen(true)}
              className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-800"
            >
              + Add truck
            </button>
          )
        }
      />

      {isAdminView && (
        <NewTruckModal
          isOpen={isAddOpen}
          onClose={() => setIsAddOpen(false)}
          onCreated={(truck) => {
            setIsAddOpen(false);
            router.push(`/admin/trucks/${truck.id}`);
          }}
        />
      )}

      {/* Maintenance board */}
      <section className="mb-8 rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Maintenance board</h2>
            <p className="text-sm text-gray-500">Active trucks that need work or a check</p>
          </div>
          <div className="flex flex-wrap gap-4 text-sm">
            {(["required", "check", "ok"] as const).map((key) => (
              <span key={key} className="inline-flex items-center gap-2 text-gray-600">
                <span aria-hidden className={`h-2.5 w-2.5 rounded-full ${healthStyles[key].dot}`} />
                <span className="font-semibold tabular-nums text-gray-900">{counts[key]}</span>
                {healthStyles[key].label}
              </span>
            ))}
          </div>
        </div>

        {needsAttention.length === 0 ? (
          <p className="px-6 py-8 text-center text-sm text-gray-500">
            Every active truck is up to date. Nothing to do this month.
            {!isAdminView && allClear.length > 0 && " Open a truck below to log fuel or a repair."}
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2 xl:grid-cols-3">
            {needsAttention.map((row) => (
              <BoardCard key={row.truck.id} row={row} />
            ))}
          </div>
        )}

        {/* Non-admins have no fleet list, so this is how they reach the trucks that are all clear. */}
        {allClear.length > 0 && (needsAttention.length > 0 || !isAdminView) && (
          <p className="border-t border-gray-100 px-6 py-3 text-sm text-gray-500">
            <span className="font-medium text-green-700">All clear:</span>{" "}
            {allClear.map((row, index) => (
              <span key={row.truck.id}>
                {index > 0 && ", "}
                <Link href={`/admin/trucks/${row.truck.id}`} className="hover:underline">
                  {row.truck.plateNumber}
                </Link>
              </span>
            ))}
          </p>
        )}
      </section>

      {/* Fleet list (admins only) */}
      {isAdminView && (
      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Fleet</h2>
            <p className="text-sm text-gray-500">{rows.length} trucks</p>
          </div>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search plate, make, type…"
            aria-label="Search trucks"
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 sm:w-64"
          />
        </div>

        {visibleRows.length === 0 ? (
          <EmptyState
            icon={<TruckGlyph />}
            title="No trucks found"
            description={query ? "Try a different search." : "Use Add truck to register the first one."}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {[
                    ["Plate", "left"],
                    ["Truck", "left"],
                    ["Purchased", "left"],
                    ["Price", "right"],
                    ["Last maintenance", "left"],
                    ["Shipments", "right"],
                    ["Fuel spend", "right"],
                    ["Certificate", "left"],
                    ["Status", "left"],
                  ].map(([label, align]) => (
                    <th
                      key={label}
                      scope="col"
                      className={`whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 ${
                        align === "right" ? "text-right" : "text-left"
                      }`}
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {visibleRows.map((row) => {
                  const { truck } = row;
                  const health = healthStyles[row.health];
                  return (
                    <tr key={truck.id} className="hover:bg-gray-50">
                      <td className="whitespace-nowrap px-4 py-2.5">
                        <Link
                          href={`/admin/trucks/${truck.id}`}
                          className="text-sm font-semibold text-blue-700 hover:text-blue-800 hover:underline"
                        >
                          {truck.plateNumber}
                        </Link>
                      </td>
                      <td className="px-4 py-2.5 text-sm text-gray-700">
                        <span className="font-medium text-gray-900">
                          {truck.make} {truck.yearModel}
                        </span>
                        <span className="block max-w-[16rem] truncate text-xs text-gray-500" title={truck.truckType}>
                          {truck.truckType}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-sm tabular-nums text-gray-700">
                        {truck.purchaseYear ?? "—"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-right text-sm tabular-nums text-gray-700">
                        {truck.purchasePrice != null ? formatCurrency(truck.purchasePrice) : "—"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-sm text-gray-700">
                        {row.lastMaintenance ? formatShortDate(row.lastMaintenance) : "—"}
                      </td>
                      <td className="px-4 py-2.5 text-right text-sm tabular-nums text-gray-900">
                        {row.shipmentCount}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-right text-sm tabular-nums text-gray-700">
                        {formatCurrency(row.fuelTotal)}
                      </td>
                      <td className="px-4 py-2.5 text-sm">
                        {truck.hasCertificate ? (
                          <span className="text-green-700">On file</span>
                        ) : (
                          <span className="text-gray-400">Missing</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5">
                        <span className={`inline-flex items-center gap-2 text-xs font-medium ${health.text}`}>
                          <span aria-hidden className={`h-2.5 w-2.5 rounded-full ${health.dot}`} />
                          {row.health === "inactive" && truck.soldYear
                            ? `Sold ${truck.soldYear}`
                            : health.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
      )}

      {isAdminView && <MaintenanceSettings config={config} />}
    </div>
  );
}

function BoardCard({ row }: { row: BoardRow }) {
  const { truck, alerts } = row;
  const isRequired = row.health === "required";
  return (
    <Link
      href={`/admin/trucks/${truck.id}`}
      className={`block rounded-lg border p-4 transition-colors hover:bg-gray-50 ${
        isRequired ? "border-red-200 border-l-4 border-l-red-500" : "border-amber-200 border-l-4 border-l-amber-400"
      }`}
    >
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-base font-bold text-gray-900">{truck.plateNumber}</p>
        <p className="truncate text-xs text-gray-500">
          {truck.make} {truck.yearModel}
        </p>
      </div>
      <ul className="mt-3 space-y-2">
        {alerts.map((alert) => (
          <li key={alert.label} className="flex items-start gap-2 text-sm">
            <span
              className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                alert.level === "required" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-800"
              }`}
            >
              {alert.level === "required" ? "Required" : "Check"}
            </span>
            <span className="min-w-0">
              <span className="font-medium text-gray-900">{alert.label}</span>
              <span className="block text-xs text-gray-500">{alert.detail}</span>
            </span>
          </li>
        ))}
      </ul>
    </Link>
  );
}

function TruckGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden>
      <path d="M3 6h11v10H3zM14 10h4l3 3v3h-7z" strokeLinejoin="round" />
      <circle cx="7" cy="18" r="1.75" />
      <circle cx="17" cy="18" r="1.75" />
    </svg>
  );
}
