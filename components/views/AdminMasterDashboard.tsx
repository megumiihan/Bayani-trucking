"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useRole } from "@/context/RoleContext";
import {
  formatCurrency,
  sortShipmentsByDateDesc,
  type Employee,
  type Shipment,
} from "@/lib/mockData";
import {
  getDriverPayoutForShipment,
  getHelperPayoutForShipment,
  getShipmentTotalPayout,
} from "@/lib/payout";
import {
  defaultShipmentFilters,
  filterShipments,
  filtersToSearchParams,
  getUniqueClients,
  hasActiveFilters,
  parseFiltersFromSearchParams,
  type ShipmentFilters,
} from "@/lib/shipmentFilters";
import { exportShipmentsToExcel } from "@/lib/exportShipments";
import {
  approveShipments,
  deleteShipment,
  setShipmentApproval,
  toggleShipmentFlag,
  updateShipment,
  type UpdateShipmentInput,
} from "@/lib/actions/shipment";
import type { Client } from "@/lib/clients";
import { getUserDisplayName } from "@/lib/mockUsers";
import type { Truck } from "@/lib/trucks";
import type { DestinationRouteRate } from "@/lib/rates";
import ShipmentFiltersBar from "@/components/admin/ShipmentFiltersBar";
import ShipmentRowActions from "@/components/admin/ShipmentRowActions";
import DeleteShipmentModal from "@/components/admin/DeleteShipmentModal";
import EditShipmentModal from "@/components/admin/EditShipmentModal";
import Badge from "@/components/ui/Badge";
import EmptyState from "@/components/ui/EmptyState";
import PageHeader from "@/components/ui/PageHeader";
import StatCard from "@/components/ui/StatCard";

interface AdminMasterDashboardProps {
  initialShipments: Shipment[];
  employees: Employee[];
  trucks: Truck[];
  lookupClients: Client[];
  routes: DestinationRouteRate[];
}

const shipmentDateFormatter = new Intl.DateTimeFormat("en-PH", {
  year: "numeric",
  month: "short",
  day: "numeric",
});

function formatShipmentDate(isoDate: string) {
  const [year, month, day] = isoDate.split("-").map(Number);
  return shipmentDateFormatter.format(new Date(year, month - 1, day));
}

export default function AdminMasterDashboard({
  initialShipments,
  employees,
  trucks,
  lookupClients,
  routes,
}: AdminMasterDashboardProps) {
  const { role } = useRole();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [shipments, setShipments] = useState(initialShipments);
  const [filters, setFilters] = useState<ShipmentFilters>(() =>
    parseFiltersFromSearchParams(searchParams)
  );
  const [editingShipment, setEditingShipment] = useState<Shipment | null>(null);
  const [deletingShipment, setDeletingShipment] = useState<Shipment | null>(
    null
  );
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [flaggingId, setFlaggingId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    setShipments(initialShipments);
  }, [initialShipments]);

  useEffect(() => {
    setFilters(parseFiltersFromSearchParams(searchParams));
  }, [searchParams]);

  const handleFiltersChange = (next: ShipmentFilters) => {
    setFilters(next);
    const params = filtersToSearchParams(next);
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  const clients = useMemo(() => getUniqueClients(shipments), [shipments]);

  const filteredShipments = useMemo(() => {
    const filtered = filterShipments(shipments, filters);
    return sortShipmentsByDateDesc(filtered);
  }, [shipments, filters]);

  const totalPayouts = useMemo(
    () =>
      filteredShipments.reduce((sum, s) => sum + getShipmentTotalPayout(s), 0),
    [filteredShipments]
  );

  const flaggedCount = useMemo(
    () => filteredShipments.filter((s) => s.flagged).length,
    [filteredShipments]
  );

  const pendingApprovalCount = useMemo(
    () => filteredShipments.filter((s) => !s.approved).length,
    [filteredShipments]
  );

  const handleToggleFlag = async (id: string) => {
    if (flaggingId) return;

    setFlaggingId(id);
    const result = await toggleShipmentFlag(id);
    setFlaggingId(null);

    if (result.success) {
      setShipments((current) =>
        current.map((shipment) =>
          shipment.id === id ? result.shipment : shipment
        )
      );
    }
  };

  const handleToggleApproval = (id: string) => {
    let nextApproved = false;
    let found = false;

    setShipments((current) => {
      const shipment = current.find((entry) => entry.id === id);
      if (!shipment) return current;

      found = true;
      nextApproved = !shipment.approved;

      return current.map((entry) =>
        entry.id === id ? { ...entry, approved: nextApproved } : entry
      );
    });

    if (!found) return;

    void setShipmentApproval(id, nextApproved).then((result) => {
      if (!result.success) {
        setShipments((current) =>
          current.map((entry) =>
            entry.id === id ? { ...entry, approved: !nextApproved } : entry
          )
        );
        return;
      }

      setShipments((current) =>
        current.map((entry) =>
          entry.id === id ? result.shipment : entry
        )
      );
    });
  };

  const handleApproveAll = () => {
    const pendingIds = filteredShipments
      .filter((shipment) => !shipment.approved)
      .map((shipment) => shipment.id);

    if (pendingIds.length === 0) return;

    setShipments((current) =>
      current.map((entry) =>
        pendingIds.includes(entry.id) ? { ...entry, approved: true } : entry
      )
    );

    void approveShipments(pendingIds).then((result) => {
      if (!result.success) {
        setShipments((current) =>
          current.map((entry) =>
            pendingIds.includes(entry.id)
              ? { ...entry, approved: false }
              : entry
          )
        );
      }
    });
  };

  const handleUpdateShipment = async (
    id: string,
    updates: UpdateShipmentInput
  ) => {
    const result = await updateShipment(id, updates);

    if (result.success) {
      setShipments((current) =>
        current.map((shipment) =>
          shipment.id === id ? result.shipment : shipment
        )
      );
      return { success: true as const };
    }

    return { success: false as const, error: result.error };
  };

  const handleDeleteShipment = async (id: string) => {
    if (isDeleting) return;

    setIsDeleting(true);
    setDeleteError(null);
    const result = await deleteShipment(id);
    setIsDeleting(false);

    if (!result.success) {
      setDeleteError(result.error);
      return;
    }

    setShipments((current) => current.filter((shipment) => shipment.id !== id));
    setDeletingShipment(null);
  };

  const handleExport = async () => {
    if (isExporting || filteredShipments.length === 0) return;
    setIsExporting(true);
    try {
      exportShipmentsToExcel(filteredShipments);
    } finally {
      setIsExporting(false);
    }
  };

  if (role !== "admin") {
    return (
      <div className="card-surface rounded-2xl border-amber-200 bg-amber-50 p-8 text-center">
        <p className="font-semibold text-amber-900">Admin access required</p>
        <p className="mt-2 text-sm text-amber-800">
          Switch to Admin view using the role toggle in the navbar.
        </p>
      </div>
    );
  }

  const showingFiltered = hasActiveFilters(filters);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Master Dashboard"
        description="Track fleet shipments, crew payouts, and flagged deliveries in one place."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Shipments"
          value={String(filteredShipments.length)}
          hint={
            showingFiltered
              ? `${shipments.length} total in database`
              : "Matching current view"
          }
          accent="blue"
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.056 2.056 0 0 0-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 0 0-10.026 0 1.106 1.106 0 0 0-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
            </svg>
          }
        />
        <StatCard
          label="Total Payouts"
          value={formatCurrency(totalPayouts)}
          hint="Crew earnings in view"
          accent="green"
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
          }
        />
        <StatCard
          label="Flagged"
          value={String(flaggedCount)}
          hint="Needs review"
          accent="amber"
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v1.5M3 21v-6m0 0 5.25-5.25M3 15h5.25M21 3v1.5M21 21v-6m0 0-5.25-5.25M21 15h-5.25M12 3v1.5M12 21v-6m0 0-5.25-5.25M12 15H6.75" />
            </svg>
          }
        />
        <StatCard
          label="Pending approval"
          value={String(pendingApprovalCount)}
          hint="Awaiting admin sign-off"
          accent="slate"
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
          }
        />
      </div>

      <ShipmentFiltersBar
        filters={filters}
        clients={clients}
        onChange={handleFiltersChange}
      />

      <section className="card-surface overflow-hidden rounded-2xl">
        <div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Shipment Log
            </h2>
            <p className="mt-0.5 text-sm text-slate-500">
              {filteredShipments.length} of {shipments.length} shipment
              {shipments.length === 1 ? "" : "s"} shown
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {pendingApprovalCount > 0 && (
              <button
                type="button"
                onClick={handleApproveAll}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-white px-4 py-2.5 text-sm font-semibold text-emerald-700 shadow-sm transition-colors hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
                Approve all ({pendingApprovalCount})
              </button>
            )}
            <button
              type="button"
              onClick={handleExport}
              disabled={isExporting || filteredShipments.length === 0}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {isExporting ? (
                <>
                  <span className="h-4 w-4 animate-spin motion-reduce:animate-none rounded-full border-2 border-white/30 border-t-white" />
                  Exporting…
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12M12 16.5V3" />
                  </svg>
                  Export to Excel
                </>
              )}
            </button>
          </div>
        </div>

        {shipments.length === 0 ? (
          <EmptyState
            icon={
              <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.056 2.056 0 0 0-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 0 0-10.026 0 1.106 1.106 0 0 0-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
              </svg>
            }
            title="No shipments yet"
            description="Once drivers and helpers start logging deliveries, they will show up here with payouts, flags, and approval status."
            action={
              <Link
                href="/employee/shipments/new"
                className="inline-flex rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-800"
              >
                Record first shipment
              </Link>
            }
          />
        ) : filteredShipments.length === 0 ? (
          <EmptyState
            icon={
              <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
              </svg>
            }
            title="No shipments match your filters"
            description="Try clearing a filter or broadening the date range to see more results."
            action={
              <button
                type="button"
                onClick={() => handleFiltersChange(defaultShipmentFilters)}
                className="inline-flex rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
              >
                Clear all filters
              </button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur-sm">
                <tr className="border-b border-slate-200">
                  {[
                    "Actions",
                    "Date",
                    "Plate",
                    "Client",
                    "Shipment",
                    "Route",
                    "Driver",
                    "Helper",
                    "Extra",
                    "Uploaded",
                    "Remarks",
                  ].map((col) => (
                    <th
                      key={col}
                      className="whitespace-nowrap px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 first:pl-6 last:pr-6"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredShipments.map((shipment) => (
                  <MasterTableRow
                    key={shipment.id}
                    shipment={shipment}
                    isFlagging={flaggingId === shipment.id}
                    onToggleFlag={() => handleToggleFlag(shipment.id)}
                    onToggleApprove={() => handleToggleApproval(shipment.id)}
                    onEdit={() => setEditingShipment(shipment)}
                    onDelete={() => {
                      setDeleteError(null);
                      setDeletingShipment(shipment);
                    }}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <EditShipmentModal
        shipment={editingShipment}
        employees={employees}
        trucks={trucks}
        clients={lookupClients}
        routes={routes}
        onClose={() => setEditingShipment(null)}
        onSave={handleUpdateShipment}
      />

      <DeleteShipmentModal
        shipment={deletingShipment}
        isDeleting={isDeleting}
        error={deleteError}
        onClose={() => {
          if (isDeleting) return;
          setDeletingShipment(null);
          setDeleteError(null);
        }}
        onConfirm={handleDeleteShipment}
      />
    </div>
  );
}

function MasterTableRow({
  shipment,
  isFlagging,
  onToggleFlag,
  onToggleApprove,
  onEdit,
  onDelete,
}: {
  shipment: Shipment;
  isFlagging: boolean;
  onToggleFlag: () => void;
  onToggleApprove: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const driverRate = getDriverPayoutForShipment(
    shipment.farthestRoute,
    shipment.client,
    shipment.distanceBand,
    shipment
  );
  const helperRate = getHelperPayoutForShipment(
    shipment.farthestRoute,
    shipment.client,
    shipment.distanceBand,
    shipment
  );

  return (
    <tr
      className={`group transition-colors hover:bg-slate-50/80 ${
        shipment.flagged
          ? "border-l-4 border-l-amber-400 bg-amber-50/30"
          : "border-l-4 border-l-transparent"
      }`}
    >
      <td className="whitespace-nowrap px-4 py-3.5 first:pl-6">
        <ShipmentRowActions
          shipment={shipment}
          isFlagging={isFlagging}
          onEdit={onEdit}
          onToggleApprove={onToggleApprove}
          onToggleFlag={onToggleFlag}
          onDelete={onDelete}
        />
      </td>
      <td className="whitespace-nowrap px-4 py-3.5 text-slate-700">
        {formatShipmentDate(shipment.date)}
      </td>
      <td className="whitespace-nowrap px-4 py-3.5 font-mono text-xs text-slate-600">
        {shipment.plateNumber}
      </td>
      <td className="whitespace-nowrap px-4 py-3.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="font-medium text-slate-900">{shipment.client}</span>
          {!shipment.approved && (
            <Badge label="Pending" className="bg-slate-100 text-slate-700" />
          )}
          {shipment.flagged && (
            <Badge label="Flagged" className="bg-amber-100 text-amber-800" />
          )}
        </div>
      </td>
      <td className="px-4 py-3.5">
        <p className="font-mono text-xs font-semibold text-slate-900">
          {shipment.shipmentNumber}
        </p>
        <p className="font-mono text-xs text-slate-500">{shipment.waybillNumber}</p>
      </td>
      <td className="max-w-[10rem] px-4 py-3.5 text-slate-700">
        <p className="truncate" title={shipment.farthestRoute}>
          {shipment.farthestRoute}
        </p>
        {shipment.pigheadCount != null && (
          <p className="text-xs text-slate-500">{shipment.pigheadCount} heads</p>
        )}
        {shipment.platformRate != null && (
          <p className="text-xs text-slate-500">
            {formatCurrency(shipment.platformRate)}
          </p>
        )}
        {shipment.weightKg != null && (
          <p className="text-xs text-slate-500">{shipment.weightKg} kg</p>
        )}
      </td>
      <td className="px-4 py-3.5">
        <p className="font-medium text-slate-900">{shipment.driver}</p>
        <p className="text-xs font-mono tabular-nums text-blue-700">
          {formatCurrency(driverRate)}
        </p>
      </td>
      <td className="px-4 py-3.5">
        <p className="font-medium text-slate-900">
          {shipment.helper || "—"}
        </p>
        <p className="text-xs font-mono tabular-nums text-emerald-700">
          {formatCurrency(helperRate)}
        </p>
      </td>
      <td className="px-4 py-3.5">
        {shipment.extraHelper ? (
          <span title={shipment.extraHelperNote ?? undefined} className="inline-flex cursor-help">
            <Badge label={shipment.extraHelper} className="bg-violet-100 text-violet-800" />
          </span>
        ) : (
          <span className="text-slate-300">—</span>
        )}
      </td>
      <td className="whitespace-nowrap px-4 py-3.5 text-slate-700">
        <p className="font-medium text-slate-900">
          {shipment.uploadedByName ?? getUserDisplayName(shipment.uploadedByUserId)}
        </p>
      </td>
      <td className="max-w-[8rem] truncate px-4 py-3.5 text-slate-500" title={shipment.remarks || undefined}>
        {shipment.remarks || "—"}
      </td>
    </tr>
  );
}
