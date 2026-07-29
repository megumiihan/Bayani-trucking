"use client";

import { useEffect, useState } from "react";
import type { Shipment } from "@/lib/mockData";

interface EditShipmentModalProps {
  shipment: Shipment | null;
  onClose: () => void;
  onSave: (id: string, updates: Partial<Shipment>) => void;
}

export default function EditShipmentModal({
  shipment,
  onClose,
  onSave,
}: EditShipmentModalProps) {
  const [form, setForm] = useState<Partial<Shipment>>({});

  useEffect(() => {
    if (shipment) {
      setForm({
        remarks: shipment.remarks,
        driver: shipment.driver,
        helper: shipment.helper,
        extraHelper: shipment.extraHelper,
        extraHelperNote: shipment.extraHelperNote,
        approved: shipment.approved,
        flagged: shipment.flagged,
      });
    }
  }, [shipment]);

  if (!shipment) return null;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    onSave(shipment.id, form);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close modal"
        className="absolute inset-0 bg-gray-900/50"
        onClick={onClose}
      />
      <div className="relative w-full max-w-lg rounded-xl border border-gray-200 bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-gray-900">Edit Shipment</h2>
        <p className="mt-1 font-mono text-sm text-gray-500">
          {shipment.shipmentNumber}
        </p>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <Field label="Driver">
            <input
              type="text"
              value={form.driver ?? ""}
              onChange={(e) => setForm({ ...form, driver: e.target.value })}
              className={inputClass}
            />
          </Field>

          <Field label="Helper">
            <input
              type="text"
              value={form.helper ?? ""}
              onChange={(e) => setForm({ ...form, helper: e.target.value })}
              className={inputClass}
            />
          </Field>

          <Field label="Extra Helper">
            <input
              type="text"
              value={form.extraHelper ?? ""}
              onChange={(e) =>
                setForm({
                  ...form,
                  extraHelper: e.target.value || null,
                })
              }
              className={inputClass}
            />
          </Field>

          <Field label="Extra Helper Note">
            <input
              type="text"
              value={form.extraHelperNote ?? ""}
              onChange={(e) =>
                setForm({
                  ...form,
                  extraHelperNote: e.target.value || null,
                })
              }
              className={inputClass}
            />
          </Field>

          <Field label="Remarks">
            <textarea
              rows={3}
              value={form.remarks ?? ""}
              onChange={(e) => setForm({ ...form, remarks: e.target.value })}
              className={inputClass}
            />
          </Field>

          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={form.flagged ?? false}
                onChange={(e) =>
                  setForm({ ...form, flagged: e.target.checked })
                }
                className="rounded border-gray-300 text-amber-600 focus:ring-amber-500"
              />
              Flagged
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={form.approved ?? false}
                onChange={(e) =>
                  setForm({ ...form, approved: e.target.checked })
                }
                className="rounded border-gray-300 text-green-600 focus:ring-green-500"
              />
              Approved
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-gray-700">{label}</span>
      {children}
    </label>
  );
}

const inputClass =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20";
