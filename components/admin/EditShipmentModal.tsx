"use client";

import { useEffect, useMemo, useState } from "react";
import type { Employee, Shipment } from "@/lib/mockData";
import {
  isDestinationClient,
  type Client,
} from "@/lib/clients";
import { formatTruckLabel, type Truck } from "@/lib/trucks";
import {
  getUniqueRouteNamesForClient,
  type DestinationClient,
} from "@/lib/rates";
import type { UpdateShipmentInput } from "@/lib/actions/shipment";
import SearchableSelect from "@/components/ui/SearchableSelect";

interface EditShipmentModalProps {
  shipment: Shipment | null;
  employees: Employee[];
  trucks: Truck[];
  clients: Client[];
  onClose: () => void;
  onSave: (
    id: string,
    updates: UpdateShipmentInput
  ) => Promise<{ success: boolean; error?: string }>;
}

type EditForm = {
  date: string;
  truckId: string;
  plateNumber: string;
  client: string;
  clientNumber: string;
  shipmentNumber: string;
  waybillNumber: string;
  farthestRoute: string;
  driver: string;
  helper: string;
  hasExtraHelper: boolean;
  extraHelper: string;
  extraHelperNote: string;
  remarks: string;
  flagged: boolean;
  approved: boolean;
};

function toForm(shipment: Shipment): EditForm {
  return {
    date: shipment.date,
    truckId: shipment.truckId ?? "",
    plateNumber: shipment.plateNumber,
    client: shipment.client,
    clientNumber: shipment.clientNumber,
    shipmentNumber: shipment.shipmentNumber,
    waybillNumber: shipment.waybillNumber,
    farthestRoute: shipment.farthestRoute,
    driver: shipment.driver,
    helper: shipment.helper,
    hasExtraHelper: Boolean(shipment.extraHelper),
    extraHelper: shipment.extraHelper ?? "",
    extraHelperNote: shipment.extraHelperNote ?? "",
    remarks: shipment.remarks,
    flagged: shipment.flagged,
    approved: shipment.approved,
  };
}

export default function EditShipmentModal({
  shipment,
  employees,
  trucks,
  clients,
  onClose,
  onSave,
}: EditShipmentModalProps) {
  const [form, setForm] = useState<EditForm | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (shipment) {
      setForm(toForm(shipment));
      setError(null);
      setIsSaving(false);
    } else {
      setForm(null);
    }
  }, [shipment]);

  const drivers = useMemo(
    () =>
      employees.filter(
        (employee) =>
          employee.role === "Driver" && employee.tenureStatus !== "inactive"
      ),
    [employees]
  );

  const helpers = useMemo(
    () =>
      employees.filter(
        (employee) =>
          employee.role === "Helper" && employee.tenureStatus !== "inactive"
      ),
    [employees]
  );

  const activeTrucks = useMemo(
    () => trucks.filter((truck) => truck.isActive),
    [trucks]
  );

  if (!shipment || !form) return null;

  const usesDestinationRates = isDestinationClient(form.client);
  const routeOptions = usesDestinationRates
    ? getUniqueRouteNamesForClient(form.client as DestinationClient)
    : [];

  const updateField = <K extends keyof EditForm>(key: K, value: EditForm[K]) => {
    setForm((current) => (current ? { ...current, [key]: value } : current));
  };

  const handleTruckChange = (truckId: string) => {
    const truck = trucks.find((entry) => entry.id === truckId);
    if (!truck) return;
    setForm((current) =>
      current
        ? { ...current, truckId: truck.id, plateNumber: truck.plateNumber }
        : current
    );
  };

  const handleClientChange = (clientName: string) => {
    const client = clients.find((entry) => entry.name === clientName);
    if (!client) return;
    setForm((current) =>
      current
        ? {
            ...current,
            client: client.name,
            clientNumber: client.id,
            farthestRoute: "",
          }
        : current
    );
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isSaving) return;

    setIsSaving(true);
    setError(null);

    const result = await onSave(shipment.id, {
      date: form.date,
      truckId: form.truckId || null,
      plateNumber: form.plateNumber,
      client: form.client,
      clientNumber: form.clientNumber,
      shipmentNumber: form.shipmentNumber,
      waybillNumber: form.waybillNumber,
      farthestRoute: form.farthestRoute,
      driver: form.driver,
      helper: form.helper,
      extraHelper: form.hasExtraHelper ? form.extraHelper : null,
      extraHelperNote: form.hasExtraHelper ? form.extraHelperNote : null,
      remarks: form.remarks,
      flagged: form.flagged,
      approved: form.approved,
    });

    setIsSaving(false);

    if (!result.success) {
      setError(result.error ?? "Could not save the shipment.");
      return;
    }

    onClose();
  };

  const truckOptions = includeCurrent(
    activeTrucks,
    trucks.find((truck) => truck.id === form.truckId)
  );
  const driverOptions = includeCurrent(
    drivers,
    employees.find((employee) => employee.name === form.driver)
  );
  const helperOptions = includeCurrent(
    helpers,
    employees.find((employee) => employee.name === form.helper)
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close modal"
        className="absolute inset-0 bg-gray-900/50"
        onClick={isSaving ? undefined : onClose}
      />
      <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl">
        <div className="border-b border-gray-100 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Edit Shipment</h2>
          <p className="mt-1 font-mono text-sm text-gray-500">
            {shipment.shipmentNumber}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="space-y-5 overflow-y-auto px-6 py-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Date" required>
                <input
                  type="date"
                  required
                  value={form.date}
                  onChange={(e) => updateField("date", e.target.value)}
                  className={inputClass}
                />
              </Field>

              <Field label="Truck" required>
                <select
                  required
                  value={form.truckId}
                  onChange={(e) => handleTruckChange(e.target.value)}
                  className={inputClass}
                >
                  <option value="">Select truck</option>
                  {truckOptions.map((truck) => (
                    <option key={truck.id} value={truck.id}>
                      {formatTruckLabel(truck)}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Client" required>
                <select
                  required
                  value={form.client}
                  onChange={(e) => handleClientChange(e.target.value)}
                  className={inputClass}
                >
                  {clients.map((client) => (
                    <option key={client.id} value={client.name}>
                      {client.name}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Shipment Number" required>
                <input
                  type="text"
                  required
                  value={form.shipmentNumber}
                  onChange={(e) => updateField("shipmentNumber", e.target.value)}
                  className={inputClass}
                />
              </Field>

              <Field label="Waybill Number">
                <input
                  type="text"
                  value={form.waybillNumber}
                  onChange={(e) => updateField("waybillNumber", e.target.value)}
                  className={inputClass}
                />
              </Field>

              <Field label="Farthest Route" required className="sm:col-span-2">
                {usesDestinationRates ? (
                  <SearchableSelect
                    options={routeOptions}
                    value={form.farthestRoute}
                    onChange={(routeName) =>
                      updateField("farthestRoute", routeName)
                    }
                    placeholder="Type to search farthest route…"
                    required
                  />
                ) : (
                  <input
                    type="text"
                    required
                    value={form.farthestRoute}
                    onChange={(e) =>
                      updateField("farthestRoute", e.target.value)
                    }
                    className={inputClass}
                  />
                )}
              </Field>

              <Field label="Driver" required>
                <select
                  required
                  value={form.driver}
                  onChange={(e) => updateField("driver", e.target.value)}
                  className={inputClass}
                >
                  <option value="">Select driver</option>
                  {driverOptions.map((driver) => (
                    <option key={driver.id} value={driver.name}>
                      {driver.name}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Helper">
                <select
                  value={form.helper}
                  onChange={(e) => updateField("helper", e.target.value)}
                  className={inputClass}
                >
                  <option value="">Select helper</option>
                  {helperOptions.map((helper) => (
                    <option key={helper.id} value={helper.name}>
                      {helper.name}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
              <label className="flex items-center justify-between gap-3 text-sm text-gray-900">
                <span>
                  Extra helper
                  <span className="mt-0.5 block text-xs font-normal text-gray-500">
                    Enable if an additional helper joined this run
                  </span>
                </span>
                <input
                  type="checkbox"
                  checked={form.hasExtraHelper}
                  onChange={(e) => {
                    updateField("hasExtraHelper", e.target.checked);
                    if (!e.target.checked) {
                      updateField("extraHelper", "");
                      updateField("extraHelperNote", "");
                    }
                  }}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </label>

              {form.hasExtraHelper && (
                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Extra Helper Name" required>
                    <select
                      required
                      value={form.extraHelper}
                      onChange={(e) =>
                        updateField("extraHelper", e.target.value)
                      }
                      className={inputClass}
                    >
                      <option value="">Select extra helper</option>
                      {helperOptions.map((helper) => (
                        <option key={helper.id} value={helper.name}>
                          {helper.name}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Reason for Extra Helper">
                    <input
                      type="text"
                      value={form.extraHelperNote}
                      onChange={(e) =>
                        updateField("extraHelperNote", e.target.value)
                      }
                      className={inputClass}
                    />
                  </Field>
                </div>
              )}
            </div>

            <Field label="Remarks">
              <textarea
                rows={3}
                value={form.remarks}
                onChange={(e) => updateField("remarks", e.target.value)}
                className={inputClass}
              />
            </Field>

            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={form.flagged}
                  onChange={(e) => updateField("flagged", e.target.checked)}
                  className="rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                />
                Flagged
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={form.approved}
                  onChange={(e) => updateField("approved", e.target.checked)}
                  className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                />
                Approved
              </label>
            </div>

            <p className="text-xs text-gray-500">
              Changing the client or route recalculates driver and helper
              payouts from the current rate sheet.
            </p>

            {error && (
              <p
                role="alert"
                className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
              >
                {error}
              </p>
            )}
          </div>

          <div className="flex justify-end gap-3 border-t border-gray-100 px-6 py-4">
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
              disabled={isSaving}
              className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              {isSaving ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function includeCurrent<T extends { id: string }>(
  list: T[],
  current: T | undefined
): T[] {
  if (!current || list.some((item) => item.id === current.id)) return list;
  return [current, ...list];
}

function Field({
  label,
  required,
  className,
  children,
}: {
  label: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={`block ${className ?? ""}`}>
      <span className="mb-1.5 block text-sm font-medium text-gray-700">
        {label}
        {required ? <span className="text-red-500"> *</span> : null}
      </span>
      {children}
    </label>
  );
}

const inputClass =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20";
