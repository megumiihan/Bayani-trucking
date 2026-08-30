"use client";

import { useEffect, useMemo, useState } from "react";
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
  getUniqueClients,
  type ShipmentFilters,
} from "@/lib/shipmentFilters";
import { exportShipmentsToExcel } from "@/lib/exportShipments";
import {
  deleteShipment,
  toggleShipmentFlag,
  updateShipment,
  type UpdateShipmentInput,
} from "@/lib/actions/shipment";
import type { Client } from "@/lib/clients";
import { getUserDisplayName } from "@/lib/mockUsers";
import type { Truck } from "@/lib/trucks";
import ShipmentFiltersBar from "@/components/admin/ShipmentFiltersBar";
import DeleteShipmentModal from "@/components/admin/DeleteShipmentModal";
import EditShipmentModal from "@/components/admin/EditShipmentModal";
import Badge from "@/components/ui/Badge";
import PageHeader from "@/components/ui/PageHeader";

interface AdminMasterDashboardProps {
  initialShipments: Shipment[];
  employees: Employee[];
  trucks: Truck[];
  lookupClients: Client[];
}

export default function AdminMasterDashboard({
  initialShipments,
  employees,
  trucks,
  lookupClients,
}: AdminMasterDashboardProps) {
  const { role } = useRole();
  const [shipments, setShipments] = useState(initialShipments);
  const [filters, setFilters] = useState<ShipmentFilters>(defaultShipmentFilters);
  const [editingShipment, setEditingShipment] = useState<Shipment | null>(null);
  const [deletingShipment, setDeletingShipment] = useState<Shipment | null>(
    null
  );
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [flaggingId, setFlaggingId] = useState<string | null>(null);

  useEffect(() => {
    setShipments(initialShipments);
  }, [initialShipments]);

  const clients = useMemo(() => getUniqueClients(shipments), [shipments]);

  const filteredShipments = useMemo(() => {
    const filtered = filterShipments(shipments, filters);
    return sortShipmentsByDateDesc(filtered);
  }, [shipments, filters]);

  const totalPayouts = useMemo(
    () => filteredShipments.reduce((sum, s) => sum + getShipmentTotalPayout(s), 0),
    [filteredShipments]
  );

  const flaggedCount = useMemo(
    () => filteredShipments.filter((s) => s.flagged).length,
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
        title="Master Dashboard"
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Total Shipments" value={String(filteredShipments.length)} />
        <StatCard
          label="Total Payouts"
          value={formatCurrency(totalPayouts)}
          accent="green"
        />
        <StatCard
          label="Flagged Count"
          value={String(flaggedCount)}
          accent="amber"
        />
      </div>

      <div className="mb-6">
        <ShipmentFiltersBar
          filters={filters}
          clients={clients}
          onChange={setFilters}
        />
      </div>

      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-gray-100 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              Fleet Master Shipment Table
            </h2>
            <p className="text-sm text-gray-500">
              {filteredShipments.length} shipment
              {filteredShipments.length === 1 ? "" : "s"} shown
            </p>
          </div>
          <button
            type="button"
            onClick={() => exportShipmentsToExcel(filteredShipments)}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-800"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12M12 16.5V3"
              />
            </svg>
            Export to Excel
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                {[
                  "Flag",
                  "Date",
                  "Plate #",
                  "Client",
                  "Shipment / Waybill",
                  "Farthest Route",
                  "Driver & Rate",
                  "Helper & Rate",
                  "Extra Helper",
                  "Uploaded By",
                  "Remarks",
                  "Actions",
                ].map((col) => (
                  <th
                    key={col}
                    className="whitespace-nowrap border-r border-gray-100 px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 last:border-r-0"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredShipments.length === 0 ? (
                <tr>
                  <td colSpan={12} className="px-4 py-12 text-center text-gray-500">
                    No shipments match your filters.
                  </td>
                </tr>
              ) : (
                filteredShipments.map((shipment) => (
                  <MasterTableRow
                    key={shipment.id}
                    shipment={shipment}
                    isFlagging={flaggingId === shipment.id}
                    onToggleFlag={() => handleToggleFlag(shipment.id)}
                    onEdit={() => setEditingShipment(shipment)}
                    onFlag={() => handleToggleFlag(shipment.id)}
                    onDelete={() => {
                      setDeleteError(null);
                      setDeletingShipment(shipment);
                    }}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <EditShipmentModal
        shipment={editingShipment}
        employees={employees}
        trucks={trucks}
        clients={lookupClients}
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
  onEdit,
  onFlag,
  onDelete,
}: {
  shipment: Shipment;
  isFlagging: boolean;
  onToggleFlag: () => void;
  onEdit: () => void;
  onFlag: () => void;
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
      className={`hover:bg-gray-50 ${shipment.flagged ? "bg-amber-50/40" : ""} ${
        shipment.approved ? "" : ""
      }`}
    >
      <td className="whitespace-nowrap border-r border-gray-100 px-3 py-3">
        <button
          type="button"
          onClick={onToggleFlag}
          disabled={isFlagging}
          aria-label={shipment.flagged ? "Unflag shipment" : "Flag shipment"}
          className={`rounded p-1 transition-colors disabled:opacity-50 ${
            shipment.flagged
              ? "text-amber-500 hover:text-amber-600"
              : "text-gray-300 hover:text-amber-400"
          }`}
        >
          <svg
            className="h-5 w-5"
            fill={shipment.flagged ? "currentColor" : "none"}
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.385a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z"
            />
          </svg>
        </button>
      </td>
      <td className="whitespace-nowrap border-r border-gray-100 px-3 py-3 text-gray-700">
        {shipment.date}
      </td>
      <td className="whitespace-nowrap border-r border-gray-100 px-3 py-3 font-mono text-gray-600">
        {shipment.plateNumber}
      </td>
      <td className="whitespace-nowrap border-r border-gray-100 px-3 py-3">
        <span className="text-gray-900">{shipment.client}</span>
        {shipment.approved && (
          <Badge
            label="Approved"
            className="ml-2 bg-green-100 text-green-800"
          />
        )}
      </td>
      <td className="border-r border-gray-100 px-3 py-3">
        <p className="font-mono text-xs font-medium text-gray-900">
          {shipment.shipmentNumber}
        </p>
        <p className="font-mono text-xs text-gray-500">{shipment.waybillNumber}</p>
      </td>
      <td className="whitespace-nowrap border-r border-gray-100 px-3 py-3 text-gray-700">
        {shipment.farthestRoute}
      </td>
      <td className="border-r border-gray-100 px-3 py-3">
        <p className="font-medium text-gray-900">{shipment.driver}</p>
        <p className="text-xs font-mono text-blue-700">{formatCurrency(driverRate)}</p>
      </td>
      <td className="border-r border-gray-100 px-3 py-3">
        <p className="font-medium text-gray-900">{shipment.helper}</p>
        <p className="text-xs font-mono text-emerald-700">
          {formatCurrency(helperRate)}
        </p>
      </td>
      <td className="border-r border-gray-100 px-3 py-3">
        {shipment.extraHelper ? (
          <span
            title={shipment.extraHelperNote ?? undefined}
            className="inline-flex cursor-help"
          >
            <Badge
              label={shipment.extraHelper}
              className="bg-violet-100 text-violet-800"
            />
          </span>
        ) : (
          <span className="text-gray-400">—</span>
        )}
      </td>
      <td className="whitespace-nowrap border-r border-gray-100 px-3 py-3 text-gray-700">
        <p className="font-medium text-gray-900">
          {shipment.uploadedByName ?? getUserDisplayName(shipment.uploadedByUserId)}
        </p>
      </td>
      <td className="max-w-xs truncate border-r border-gray-100 px-3 py-3 text-gray-500">
        {shipment.remarks || "—"}
      </td>
      <td className="whitespace-nowrap px-3 py-3">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onEdit}
            className="rounded-md bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={onFlag}
            disabled={isFlagging}
            className="rounded-md bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 hover:bg-amber-100 disabled:opacity-50"
          >
            {shipment.flagged ? "Unflag" : "Flag"}
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="rounded-md bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-100"
          >
            Delete
          </button>
        </div>
      </td>
    </tr>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: "green" | "amber";
}) {
  const accentMap = {
    green: "text-green-700",
    amber: "text-amber-600",
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
        {label}
      </p>
      <p
        className={`mt-1 text-2xl font-bold ${
          accent ? accentMap[accent] : "text-gray-900"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
