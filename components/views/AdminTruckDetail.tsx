"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, type ReactNode } from "react";
import { useRole } from "@/context/RoleContext";
import {
  deleteTruckCheck,
  deleteTruckRepair,
  getTruckCertificateUrl,
  removeTruckCertificate,
  saveTruckCheck,
  saveTruckRepair,
  updateTruckDetails,
  updateTruckRepair,
  uploadTruckCertificate,
} from "@/lib/actions/truck";
import { formatCurrency, type Shipment } from "@/lib/mockData";
import { resizeImageToFit } from "@/lib/resizeImage";
import {
  CHECK_ITEMS,
  TRUCK_CERTIFICATE_MAX_BYTES,
  TRUCK_CERTIFICATE_MAX_SIDE,
  formatShortDate,
  getScheduleStatus,
  getTruckAlerts,
  maintenanceTypeLabel,
  type ScheduleState,
} from "@/lib/truckMaintenance";
import type {
  CheckWriteInput,
  RepairWriteInput,
  TruckCheckUi,
  TruckFuelEntry,
  TruckRepairUi,
} from "@/lib/truckRecords";
import type { Truck } from "@/lib/trucks";
import TruckCheckModal from "@/components/admin/TruckCheckModal";
import TruckRepairModal from "@/components/admin/TruckRepairModal";

interface AdminTruckDetailProps {
  truck: Truck;
  repairs: TruckRepairUi[];
  checks: TruckCheckUi[];
  fuel: TruckFuelEntry[];
  shipments: Shipment[];
}

type Tab = "repairs" | "fuel" | "shipments";

const scheduleStyles: Record<ScheduleState, { label: string; className: string }> = {
  overdue: { label: "Overdue", className: "bg-red-100 text-red-700" },
  "due-soon": { label: "Due soon", className: "bg-amber-100 text-amber-800" },
  never: { label: "No record", className: "bg-gray-100 text-gray-600" },
  ok: { label: "OK", className: "bg-green-100 text-green-700" },
};

const fmt = (date: string | null | undefined) => (date ? formatShortDate(date) : "—");

export default function AdminTruckDetail({
  truck,
  repairs,
  checks,
  fuel,
  shipments,
}: AdminTruckDetailProps) {
  const { role } = useRole();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("repairs");

  // Repair modal
  const [repairModal, setRepairModal] = useState<{ open: boolean; repair: TruckRepairUi | null }>({
    open: false,
    repair: null,
  });
  const [isSavingRepair, setIsSavingRepair] = useState(false);
  const [repairError, setRepairError] = useState<string | null>(null);

  // Check modal
  const [isCheckOpen, setIsCheckOpen] = useState(false);
  const [isSavingCheck, setIsSavingCheck] = useState(false);
  const [checkError, setCheckError] = useState<string | null>(null);

  const [listError, setListError] = useState<string | null>(null);

  if (role !== "admin") {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-center text-amber-800">
        Admin access required. Switch to Admin view using the role toggle.
      </div>
    );
  }

  const lastDoneByType: Record<string, string> = {};
  for (const repair of repairs) {
    if (!lastDoneByType[repair.maintenanceType] || repair.date > lastDoneByType[repair.maintenanceType]) {
      lastDoneByType[repair.maintenanceType] = repair.date;
    }
  }
  const latestCheck = checks[0] ?? null;
  const schedule = getScheduleStatus(truck.truckType, lastDoneByType);
  const alerts = truck.isActive ? getTruckAlerts(truck.truckType, lastDoneByType, latestCheck) : [];
  const requiredCount = alerts.filter((a) => a.level === "required").length;

  const repairTotal = repairs.reduce((sum, r) => sum + r.cost, 0);
  const fuelTotal = fuel.reduce((sum, f) => sum + f.amount, 0);

  const openRepair = (repair: TruckRepairUi | null) => {
    setRepairError(null);
    setRepairModal({ open: true, repair });
  };

  const handleSaveRepair = async (input: RepairWriteInput) => {
    setIsSavingRepair(true);
    setRepairError(null);
    const result = repairModal.repair
      ? await updateTruckRepair(repairModal.repair.id, input)
      : await saveTruckRepair(truck.id, input);
    setIsSavingRepair(false);
    if (!result.success) {
      setRepairError(result.error);
      return;
    }
    setRepairModal({ open: false, repair: null });
    setTab("repairs");
    router.refresh();
  };

  const handleDeleteRepair = async (repair: TruckRepairUi) => {
    const message = repair.expenseId
      ? "Delete this repair? Its expense in Bookkeeping will be deleted too."
      : "Delete this repair?";
    if (!window.confirm(message)) return;
    setListError(null);
    const result = await deleteTruckRepair(repair.id);
    if (!result.success) return setListError(result.error);
    router.refresh();
  };

  const handleSaveCheck = async (input: CheckWriteInput) => {
    setIsSavingCheck(true);
    setCheckError(null);
    const result = await saveTruckCheck(truck.id, input);
    setIsSavingCheck(false);
    if (!result.success) {
      setCheckError(result.error);
      return;
    }
    setIsCheckOpen(false);
    router.refresh();
  };

  const handleDeleteCheck = async (check: TruckCheckUi) => {
    if (!window.confirm(`Delete the check from ${fmt(check.checkedAt)}?`)) return;
    setListError(null);
    const result = await deleteTruckCheck(check.id);
    if (!result.success) return setListError(result.error);
    router.refresh();
  };

  return (
    <div>
      <Link
        href="/admin/trucks"
        className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-blue-700 hover:text-blue-800"
      >
        ← Back to Truck Overview
      </Link>

      <TruckRepairModal
        isOpen={repairModal.open}
        isSaving={isSavingRepair}
        error={repairError}
        plateNumber={truck.plateNumber}
        truckType={truck.truckType}
        repair={repairModal.repair}
        onClose={() => setRepairModal({ open: false, repair: null })}
        onSave={handleSaveRepair}
      />
      <TruckCheckModal
        isOpen={isCheckOpen}
        isSaving={isSavingCheck}
        error={checkError}
        plateNumber={truck.plateNumber}
        truckType={truck.truckType}
        onClose={() => setIsCheckOpen(false)}
        onSave={handleSaveCheck}
      />

      <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        <TruckProfileCard key={truck.id} truck={truck} lastMaintenance={repairs[0]?.date ?? null} />

        <div className="flex min-w-0 flex-col gap-6">
          {/* Maintenance schedule */}
          <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-100 px-6 py-4">
              <div>
                <h2 className="text-base font-semibold text-gray-900">Maintenance</h2>
                <p className="text-sm text-gray-500">
                  {!truck.isActive
                    ? "Inactive truck. Not shown on the maintenance board."
                    : requiredCount > 0
                      ? `${requiredCount} item${requiredCount === 1 ? "" : "s"} need${requiredCount === 1 ? "s" : ""} attention`
                      : alerts.length > 0
                        ? "Nothing urgent. Some items to check."
                        : "Up to date"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => openRepair(null)}
                className="rounded-lg bg-blue-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-800"
              >
                Log repair / maintenance
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    <th className="px-6 py-2.5">Type</th>
                    <th className="px-3 py-2.5">Every</th>
                    <th className="px-3 py-2.5">Last done</th>
                    <th className="px-3 py-2.5">Next due</th>
                    <th className="px-6 py-2.5 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {schedule.map((status) => (
                    <tr key={status.type.key}>
                      <td className="px-6 py-2.5 text-gray-900">
                        {status.type.label}
                        {!status.type.mandatory && (
                          <span className="ml-1.5 text-xs text-gray-400">optional</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-gray-600">
                        {status.type.intervalMonths} mo
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-gray-600">{fmt(status.lastDone)}</td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-gray-600">{fmt(status.nextDue)}</td>
                      <td className="px-6 py-2.5 text-right">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${scheduleStyles[status.state].className}`}
                        >
                          {scheduleStyles[status.state].label}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Monthly check */}
          <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-100 px-6 py-4">
              <div>
                <h2 className="text-base font-semibold text-gray-900">Monthly condition check</h2>
                <p className="text-sm text-gray-500">
                  {latestCheck ? `Last checked ${fmt(latestCheck.checkedAt)} by ${latestCheck.createdByName}` : "No checks recorded yet"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setCheckError(null);
                  setIsCheckOpen(true);
                }}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Record check
              </button>
            </div>
            {latestCheck ? (
              <div className="px-6 py-4">
                <ul className="grid grid-cols-1 gap-x-6 gap-y-1.5 sm:grid-cols-2">
                  {CHECK_ITEMS.filter((item) => latestCheck.items[item.key]).map((item) => {
                    const ok = latestCheck.items[item.key] === "ok";
                    return (
                      <li key={item.key} className="flex items-center gap-2 text-sm">
                        <span
                          aria-label={ok ? "OK" : "Issue"}
                          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white ${ok ? "bg-green-500" : "bg-red-500"}`}
                        >
                          {ok ? "✓" : "!"}
                        </span>
                        <span className={ok ? "text-gray-700" : "font-medium text-red-700"}>{item.label}</span>
                      </li>
                    );
                  })}
                </ul>
                {latestCheck.notes && (
                  <p className="mt-3 rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-700">{latestCheck.notes}</p>
                )}
                {checks.length > 1 && (
                  <details className="mt-3 text-sm">
                    <summary className="cursor-pointer font-medium text-blue-700 hover:text-blue-800">
                      Earlier checks ({checks.length - 1})
                    </summary>
                    <ul className="mt-2 divide-y divide-gray-100">
                      {checks.slice(1).map((check) => {
                        const issues = Object.values(check.items).filter((r) => r === "issue").length;
                        return (
                          <li key={check.id} className="flex items-center justify-between gap-3 py-1.5">
                            <span className="text-gray-700">
                              {fmt(check.checkedAt)}
                              <span className={`ml-2 text-xs ${issues ? "text-red-700" : "text-green-700"}`}>
                                {issues ? `${issues} issue${issues === 1 ? "" : "s"}` : "All OK"}
                              </span>
                            </span>
                            <button
                              type="button"
                              onClick={() => handleDeleteCheck(check)}
                              className="text-xs text-gray-400 hover:text-red-600"
                            >
                              Delete
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </details>
                )}
                <button
                  type="button"
                  onClick={() => handleDeleteCheck(latestCheck)}
                  className="mt-3 text-xs text-gray-400 hover:text-red-600"
                >
                  Delete latest check
                </button>
              </div>
            ) : (
              <p className="px-6 py-4 text-sm text-gray-500">
                Record a check each month. Items marked Issue show on the maintenance board.
              </p>
            )}
          </section>
        </div>
      </div>

      {/* History tabs */}
      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-6 py-3">
          <div role="tablist" className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-0.5 text-sm font-medium">
            {(
              [
                ["repairs", `Repairs (${repairs.length})`],
                ["fuel", `Fuel (${fuel.length})`],
                ["shipments", `Shipments (${shipments.length})`],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={tab === key}
                onClick={() => setTab(key)}
                className={`rounded-md px-3 py-1 ${
                  tab === key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="text-sm text-gray-500">
            {tab === "repairs" && (
              <>Total spent <span className="font-semibold text-gray-900">{formatCurrency(repairTotal)}</span></>
            )}
            {tab === "fuel" && (
              <>Total fuel <span className="font-semibold text-gray-900">{formatCurrency(fuelTotal)}</span></>
            )}
            {tab === "shipments" && "Trips logged with this truck"}
          </p>
        </div>

        {listError && <p role="alert" className="px-6 pt-3 text-sm text-red-600">{listError}</p>}

        {tab === "repairs" && (
          <HistoryTable
            empty="No repairs or maintenance logged yet."
            headers={["Date", "Type", "Details", "Shop", "Cost", ""]}
            rows={repairs.map((repair) => [
              fmt(repair.date),
              maintenanceTypeLabel(repair.maintenanceType),
              <span key="d" className="text-gray-600">{repair.description || "—"}</span>,
              repair.shop || "—",
              repair.cost > 0 ? formatCurrency(repair.cost) : "—",
              <span key="a" className="flex justify-end gap-3 text-xs">
                <button type="button" onClick={() => openRepair(repair)} className="font-medium text-blue-700 hover:underline">
                  Edit
                </button>
                <button type="button" onClick={() => handleDeleteRepair(repair)} className="text-gray-400 hover:text-red-600">
                  Delete
                </button>
              </span>,
            ])}
            numeric={[4]}
          />
        )}

        {tab === "fuel" && (
          <HistoryTable
            empty="No fuel expenses tagged to this truck. Log them in Bookkeeping → Expenses with category Fuel."
            headers={["Date", "Station", "Invoice", "Notes", "Amount"]}
            rows={fuel.map((entry) => [
              fmt(entry.date),
              entry.address || "—",
              entry.invoiceNo || "—",
              <span key="n" className="text-gray-600">{entry.description || "—"}</span>,
              formatCurrency(entry.amount),
            ])}
            numeric={[4]}
          />
        )}

        {tab === "shipments" && (
          <HistoryTable
            empty="No shipments logged with this truck yet."
            headers={["Date", "Shipment #", "Client", "Route", "Driver", "Helper"]}
            rows={shipments.map((shipment) => [
              fmt(shipment.date),
              shipment.shipmentNumber || "—",
              shipment.client,
              shipment.farthestRoute || "—",
              shipment.driver,
              shipment.helper || "—",
            ])}
          />
        )}
      </section>
    </div>
  );
}

function HistoryTable({
  headers,
  rows,
  empty,
  numeric = [],
}: {
  headers: string[];
  rows: ReactNode[][];
  empty: string;
  numeric?: number[];
}) {
  if (rows.length === 0) {
    return <p className="px-6 py-10 text-center text-sm text-gray-500">{empty}</p>;
  }
  return (
    <div className="max-h-[32rem] overflow-auto">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="sticky top-0 bg-gray-50">
          <tr>
            {headers.map((header, i) => (
              <th
                key={i}
                scope="col"
                className={`whitespace-nowrap px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-gray-500 first:pl-6 last:pr-6 ${
                  numeric.includes(i) ? "text-right" : "text-left"
                }`}
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((cells, r) => (
            <tr key={r} className="hover:bg-gray-50">
              {cells.map((cell, i) => (
                <td
                  key={i}
                  className={`px-4 py-2.5 text-gray-900 first:whitespace-nowrap first:pl-6 last:pr-6 ${
                    numeric.includes(i) ? "whitespace-nowrap text-right tabular-nums" : ""
                  }`}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TruckProfileCard({ truck, lastMaintenance }: { truck: Truck; lastMaintenance: string | null }) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({ purchaseYear: "", purchasePrice: "", isActive: true });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startEditing = () => {
    setForm({
      purchaseYear: truck.purchaseYear != null ? String(truck.purchaseYear) : "",
      purchasePrice: truck.purchasePrice != null ? String(truck.purchasePrice) : "",
      isActive: truck.isActive,
    });
    setError(null);
    setIsEditing(true);
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSaving(true);
    setError(null);
    const result = await updateTruckDetails(truck.id, {
      purchaseYear: form.purchaseYear.trim() ? Number(form.purchaseYear) : null,
      purchasePrice: form.purchasePrice.trim() ? Number(form.purchasePrice) : null,
      isActive: form.isActive,
    });
    setIsSaving(false);
    if (!result.success) return setError(result.error);
    setIsEditing(false);
    router.refresh();
  };

  const fieldClass =
    "rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900";

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">Truck</p>
      <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">{truck.plateNumber}</h1>
      <p className="text-sm text-slate-500">
        {truck.make} {truck.yearModel} · {truck.truckType}
      </p>

      {!isEditing && (
        <button
          type="button"
          onClick={startEditing}
          className="mt-4 w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Edit details
        </button>
      )}

      <div className="mt-5 border-t border-gray-100 pt-4">
        {isEditing ? (
          <form onSubmit={handleSave} className="flex flex-col gap-3">
            <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
              Year purchased
              <input
                type="number"
                min={1950}
                max={new Date().getFullYear()}
                value={form.purchaseYear}
                onChange={(e) => setForm((f) => ({ ...f, purchaseYear: e.target.value }))}
                className={fieldClass}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
              Purchase price (₱)
              <input
                type="number"
                min={0}
                step="0.01"
                inputMode="decimal"
                value={form.purchasePrice}
                onChange={(e) => setForm((f) => ({ ...f, purchasePrice: e.target.value }))}
                className={fieldClass}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
              Status
              <select
                value={form.isActive ? "active" : "inactive"}
                onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.value === "active" }))}
                className={fieldClass}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive (sold / retired)</option>
              </select>
            </label>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={isSaving}
                className="flex-1 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {isSaving ? "Saving…" : "Save"}
              </button>
              <button
                type="button"
                disabled={isSaving}
                onClick={() => setIsEditing(false)}
                className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <dl className="space-y-2 text-sm">
            <Info label="Status">
              <span className={truck.isActive ? "text-green-700" : "text-gray-500"}>
                {truck.isActive ? "Active" : "Inactive"}
              </span>
            </Info>
            <Info label="Year purchased">{truck.purchaseYear ?? <Missing />}</Info>
            <Info label="Purchase price">
              {truck.purchasePrice != null ? formatCurrency(truck.purchasePrice) : <Missing />}
            </Info>
            <Info label="Last maintenance">{lastMaintenance ? formatShortDate(lastMaintenance) : <Missing text="None logged" />}</Info>
            <Info label="Year model">{truck.yearModel}</Info>
            <Info label="MV file no.">{truck.mvFileNo}</Info>
            <Info label="Engine no.">{truck.engineNo}</Info>
            <Info label="Chassis no.">{truck.chassisNo}</Info>
            <Info label="CR issued">{formatShortDate(truck.crIssueDate)}</Info>
          </dl>
        )}
      </div>

      <CertificateField truck={truck} />
    </section>
  );
}

function Info({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="shrink-0 text-gray-500">{label}</dt>
      <dd className="min-w-0 truncate text-right font-medium text-gray-900">{children}</dd>
    </div>
  );
}

function Missing({ text = "Not set" }: { text?: string }) {
  return <span className="font-normal text-gray-400">{text}</span>;
}

function CertificateField({ truck }: { truck: Truck }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<"upload" | "remove" | "open" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    setBusy("upload");
    try {
      let upload: Blob = file;
      if (file.type.startsWith("image/")) {
        upload = await resizeImageToFit(file, TRUCK_CERTIFICATE_MAX_SIDE);
      } else if (file.type !== "application/pdf") {
        setError("Choose a PDF or a photo.");
        return;
      }
      if (upload.size > TRUCK_CERTIFICATE_MAX_BYTES) {
        setError("File is too large (3.5 MB max). Try a smaller scan or a photo.");
        return;
      }
      const formData = new FormData();
      const name = upload === file ? file.name : file.name.replace(/\.[^.]+$/, "") + ".jpg";
      formData.append("file", new File([upload], name, { type: upload.type }));
      formData.append("name", file.name);
      const result = await uploadTruckCertificate(truck.id, formData);
      if (!result.success) return setError(result.error);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not upload that file.");
    } finally {
      setBusy(null);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleOpen = async () => {
    setError(null);
    // Open the tab synchronously so popup blockers allow it, then point it at the signed URL.
    const tab = window.open("", "_blank");
    setBusy("open");
    const result = await getTruckCertificateUrl(truck.id);
    setBusy(null);
    if (!result.success) {
      tab?.close();
      return setError(result.error);
    }
    if (tab) tab.location.href = result.url;
    else window.location.href = result.url;
  };

  const handleRemove = async () => {
    if (!window.confirm("Remove the certificate file?")) return;
    setError(null);
    setBusy("remove");
    const result = await removeTruckCertificate(truck.id);
    setBusy(null);
    if (!result.success) return setError(result.error);
    router.refresh();
  };

  return (
    <div className="mt-5 border-t border-gray-100 pt-4">
      <h2 className="text-xs font-medium uppercase tracking-wider text-gray-500">Certificate</h2>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,image/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      {truck.hasCertificate ? (
        <div className="mt-2 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleOpen}
            disabled={busy !== null}
            className="min-w-0 truncate text-left text-sm font-medium text-blue-700 hover:underline disabled:opacity-50"
            title={truck.certificateName ?? undefined}
          >
            {busy === "open" ? "Opening…" : truck.certificateName || "View certificate"}
          </button>
          <div className="flex shrink-0 gap-2 text-xs">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={busy !== null}
              className="font-medium text-gray-600 hover:text-gray-900 disabled:opacity-50"
            >
              {busy === "upload" ? "Uploading…" : "Replace"}
            </button>
            <button
              type="button"
              onClick={handleRemove}
              disabled={busy !== null}
              className="text-red-600 hover:text-red-700 disabled:opacity-50"
            >
              {busy === "remove" ? "Removing…" : "Remove"}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy !== null}
          className="mt-2 w-full rounded-lg border border-dashed border-gray-300 px-3 py-3 text-sm text-gray-600 hover:border-blue-400 hover:bg-blue-50/40 disabled:opacity-50"
        >
          {busy === "upload" ? "Uploading…" : "Upload certificate (PDF or photo)"}
        </button>
      )}
      {error && <p role="alert" className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
