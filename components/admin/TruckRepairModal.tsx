"use client";

import { useEffect, useState, type FormEvent } from "react";
import { REPAIR_TYPE_KEY, maintenanceTypesFor, todayISO, type MaintenanceType } from "@/lib/truckMaintenance";
import type { RepairWriteInput, TruckRepairUi } from "@/lib/truckRecords";
import { inputClass } from "@/components/ui/formStyles";
import { useEscapeToClose } from "@/components/ui/useEscapeToClose";

interface TruckRepairModalProps {
  isOpen: boolean;
  isSaving: boolean;
  error: string | null;
  plateNumber: string;
  truckType: string;
  /** All maintenance types, archived included. */
  types: MaintenanceType[];
  repair?: TruckRepairUi | null;
  onClose: () => void;
  onSave: (input: RepairWriteInput) => Promise<void>;
}

export default function TruckRepairModal({
  isOpen,
  isSaving,
  error,
  plateNumber,
  truckType,
  types: allTypes,
  repair,
  onClose,
  onSave,
}: TruckRepairModalProps) {
  const [date, setDate] = useState(todayISO);
  const [maintenanceType, setMaintenanceType] = useState(REPAIR_TYPE_KEY);
  const [description, setDescription] = useState("");
  const [shop, setShop] = useState("");
  const [cost, setCost] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    setDate(repair?.date ?? todayISO());
    setMaintenanceType(repair?.maintenanceType ?? REPAIR_TYPE_KEY);
    setDescription(repair?.description ?? "");
    setShop(repair?.shop ?? "");
    setCost(repair && repair.cost > 0 ? String(repair.cost) : "");
  }, [isOpen, repair]);

  useEscapeToClose(isOpen, onClose, isSaving);
  if (!isOpen) return null;

  // Keep a removed type selectable when editing a repair that was logged under it.
  const types = maintenanceTypesFor(allTypes, truckType);
  const current = repair && allTypes.find((type) => type.key === repair.maintenanceType);
  if (current && !types.includes(current)) types.push(current);
  const parsedCost = cost.trim() === "" ? 0 : Number(cost);
  const costValid = Number.isFinite(parsedCost) && parsedCost >= 0;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (isSaving || !costValid) return;
    await onSave({ date, maintenanceType, description, shop, cost: parsedCost });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close modal"
        className="absolute inset-0 bg-gray-900/50"
        onClick={isSaving ? undefined : onClose}
      />
      <div
        role="dialog"
        aria-labelledby="truck-repair-title"
        className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl border border-gray-200 bg-white p-6 shadow-xl"
      >
        <h2 id="truck-repair-title" className="text-lg font-semibold text-gray-900">
          {repair ? "Edit repair" : "Log repair or maintenance"} · {plateNumber}
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          A cost above zero is also recorded as a Maintenance &amp; Repairs expense in Bookkeeping.
        </p>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-gray-700">Date</span>
              <input
                type="date"
                required
                value={date}
                max={todayISO()}
                onChange={(e) => setDate(e.target.value)}
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-gray-700">Cost (₱)</span>
              <input
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                placeholder="0"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                className={inputClass}
              />
            </label>
          </div>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-gray-700">Type</span>
            <select
              required
              value={maintenanceType}
              onChange={(e) => setMaintenanceType(e.target.value)}
              className={inputClass}
            >
              {types.map((type) => (
                <option key={type.key} value={type.key}>
                  {type.label}
                  {type.intervalMonths ? ` (every ${type.intervalMonths} mo)` : ""}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-gray-700">What was done</span>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Replaced rear brake pads"
              className={inputClass}
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-gray-700">Shop / mechanic</span>
            <input
              type="text"
              value={shop}
              onChange={(e) => setShop(e.target.value)}
              placeholder="Optional"
              className={inputClass}
            />
          </label>

          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving || !costValid}
              className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
            >
              {isSaving ? "Saving…" : repair ? "Save changes" : "Log repair"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
