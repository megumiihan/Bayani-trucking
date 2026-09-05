"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { formatCurrency, type Employee } from "@/lib/mockData";
import { formatTruckLabel, type Truck } from "@/lib/trucks";
import {
  getCalculationTypeLabel,
  isLivestockClient,
  type Client,
} from "@/lib/clients";
import { LIVESTOCK_MAX_HEADS } from "@/lib/livestock";
import type { DestinationRouteRate } from "@/lib/rates";
import {
  getUniqueRouteNamesForClient,
  getDefaultRouteRate,
  type DestinationClient,
} from "@/lib/rates";
import {
  calculateDestinationPayout,
  calculateLivestockPayout,
} from "@/lib/calculations";
import { saveShipment } from "@/lib/actions/shipment";
import { useRole } from "@/context/RoleContext";
import PageHeader from "@/components/ui/PageHeader";
import SearchableSelect from "@/components/ui/SearchableSelect";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

interface ShipmentInputFormProps {
  employees: Employee[];
  trucks: Truck[];
  clients: Client[];
  routes: DestinationRouteRate[];
}

export default function ShipmentInputForm({
  employees,
  trucks,
  clients,
  routes,
}: ShipmentInputFormProps) {
  const router = useRouter();
  const { isAdmin } = useRole();

  const defaultClient = clients[0];

  const initialForm = {
    date: todayISO(),
    truckId: "",
    plateNumber: "",
    client: defaultClient?.name ?? "",
    shipmentNumber: "",
    clientNumber: defaultClient?.id ?? "",
    waybillNumber: "",
    farthestRoute: "",
    driver: "",
    helper: "",
    hasExtraHelper: false,
    extraHelper: "",
    extraHelperNote: "",
    remarks: "",
    pigheadCount: "",
  };

  const [form, setForm] = useState(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const drivers = useMemo(
    () =>
      employees.filter(
        (employee) => employee.role === "Driver" && employee.tenureStatus !== "inactive"
      ),
    [employees]
  );

  const helpers = useMemo(
    () =>
      employees.filter(
        (employee) => employee.role === "Helper" && employee.tenureStatus !== "inactive"
      ),
    [employees]
  );

  const activeTrucks = useMemo(
    () => trucks.filter((truck) => truck.isActive),
    [trucks]
  );

  const selectedClient = clients.find((client) => client.name === form.client);
  const usesDestinationRates = selectedClient?.calculationType === "Destination";
  const usesLivestockRates = isLivestockClient(selectedClient);
  const livestockRoutes = routes.filter(
    (route) => route.client === form.client
  );
  const selectedLivestockRoute = livestockRoutes.find(
    (route) => route.routeName === form.farthestRoute
  );
  const driverBase = selectedLivestockRoute?.driverBaseRate ?? 0;
  const helperBase = selectedLivestockRoute?.helperBaseRate ?? 0;
  const driverHeadRate = selectedClient?.pigheadDriverRate ?? null;
  const helperHeadRate = selectedClient?.pigheadHelperRate ?? null;

  const routeOptions = useMemo(() => {
    if (usesDestinationRates) {
      return getUniqueRouteNamesForClient(form.client as DestinationClient);
    }
    return [];
  }, [form.client, usesDestinationRates]);

  const selectedRoute = useMemo(
    () =>
      usesDestinationRates && form.farthestRoute
        ? getDefaultRouteRate(form.client as DestinationClient, form.farthestRoute)
        : undefined,
    [form.client, form.farthestRoute, usesDestinationRates]
  );

  const payoutPreview = useMemo(() => {
    if (usesLivestockRates && driverHeadRate != null && helperHeadRate != null) {
      return calculateLivestockPayout({
        pighead: Number(form.pigheadCount),
        driverBase,
        helperBase,
        driverRate: driverHeadRate,
        helperRate: helperHeadRate,
        hasExtraHelper: form.hasExtraHelper,
      });
    }
    if (usesDestinationRates && form.farthestRoute && selectedRoute) {
      return calculateDestinationPayout({
        client: form.client as DestinationClient,
        routeName: form.farthestRoute,
        distance: selectedRoute.distance,
        hasExtraHelper: form.hasExtraHelper,
      });
    }
    return null;
  }, [
    driverBase,
    driverHeadRate,
    form.client,
    form.farthestRoute,
    form.hasExtraHelper,
    form.pigheadCount,
    helperBase,
    helperHeadRate,
    selectedRoute,
    usesDestinationRates,
    usesLivestockRates,
  ]);

  const updateField = <K extends keyof typeof form>(
    key: K,
    value: (typeof form)[K]
  ) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleTruckChange = (truckId: string) => {
    const truck = trucks.find((entry) => entry.id === truckId);
    if (!truck) return;

    setForm((current) => ({
      ...current,
      truckId: truck.id,
      plateNumber: truck.plateNumber,
    }));
  };

  const handleClientChange = (clientName: string) => {
    const client = clients.find((entry) => entry.name === clientName);
    if (!client) return;

    setForm((current) => ({
      ...current,
      client: client.name,
      clientNumber: client.id,
      farthestRoute: "",
      pigheadCount: "",
    }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.farthestRoute || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage(null);
    setShowSuccess(false);

    const result = await saveShipment({
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
      hasExtraHelper: form.hasExtraHelper,
      extraHelper: form.extraHelper,
      extraHelperNote: form.extraHelperNote,
      remarks: form.remarks,
      pigheadCount: usesLivestockRates ? Number(form.pigheadCount) : null,
    });

    setIsSubmitting(false);

    if (!result.success) {
      setErrorMessage(result.error);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    setShowSuccess(true);
    setForm({ ...initialForm, date: todayISO() });
    router.refresh();

    window.scrollTo({ top: 0, behavior: "smooth" });
    setTimeout(() => setShowSuccess(false), 5000);
  };

  return (
    <div>
      <PageHeader
        title="New Shipment"
        description={
          isAdmin
            ? "Record a delivery and preview estimated driver and helper payouts."
            : "Record a delivery."
        }
      />

      {errorMessage && (
        <div
          role="alert"
          className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          <svg
            className="mt-0.5 h-5 w-5 shrink-0 text-red-600"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"
            />
          </svg>
          <div>
            <p className="font-medium">Could not save shipment</p>
            <p className="mt-1 text-red-700">{errorMessage}</p>
          </div>
        </div>
      )}

      {showSuccess && (
        <div
          role="status"
          className="mb-6 flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800"
        >
          <svg
            className="h-5 w-5 shrink-0 text-green-600"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
            />
          </svg>
          <span className="font-medium">
            Shipment saved successfully and recorded in the database.
          </span>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className={`grid grid-cols-1 gap-6 ${isAdmin ? "lg:grid-cols-3" : ""}`}
      >
        <div className="space-y-5 lg:col-span-2">
          <FormSection title="Delivery Details">
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
                  {activeTrucks.map((truck) => (
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
                  placeholder="e.g. SHP-2026-07240"
                  value={form.shipmentNumber}
                  onChange={(e) => updateField("shipmentNumber", e.target.value)}
                  className={inputClass}
                />
              </Field>

              <Field label="Waybill Number" required>
                <input
                  type="text"
                  required
                  placeholder="e.g. WB-887999"
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
                    onChange={(routeName) => updateField("farthestRoute", routeName)}
                    placeholder="Type to search farthest route…"
                    required
                  />
                ) : livestockRoutes.length > 0 ? (
                  <select
                    required
                    value={form.farthestRoute}
                    onChange={(e) => updateField("farthestRoute", e.target.value)}
                    className={inputClass}
                  >
                    <option value="">Select farthest route</option>
                    {livestockRoutes.map((route) => (
                      <option key={route.id} value={route.routeName}>
                        {route.routeName}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    required
                    placeholder="Enter farthest route or delivery details…"
                    value={form.farthestRoute}
                    onChange={(e) => updateField("farthestRoute", e.target.value)}
                    className={inputClass}
                  />
                )}
              </Field>

              {usesLivestockRates && (
                <Field label="Number of heads" required>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={LIVESTOCK_MAX_HEADS}
                    step={1}
                    required
                    value={form.pigheadCount}
                    onChange={(e) => updateField("pigheadCount", e.target.value)}
                    placeholder="e.g. 8"
                    className={inputClass}
                  />
                  <span className="mt-1 block text-xs text-gray-500">
                    Driver ₱{driverBase} + ₱{driverHeadRate ?? "—"}/head · Helper
                    ₱{helperBase} + ₱{helperHeadRate ?? "—"}/head
                  </span>
                </Field>
              )}
            </div>
          </FormSection>

          <FormSection title="Crew Assignment">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Driver" required>
                <select
                  required
                  value={form.driver}
                  onChange={(e) => updateField("driver", e.target.value)}
                  className={inputClass}
                >
                  <option value="">Select driver</option>
                  {drivers.map((driver) => (
                    <option key={driver.id} value={driver.name}>
                      {driver.name}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Helper" required>
                <select
                  required
                  value={form.helper}
                  onChange={(e) => updateField("helper", e.target.value)}
                  className={inputClass}
                >
                  <option value="">Select helper</option>
                  {helpers.map((helper) => (
                    <option key={helper.id} value={helper.name}>
                      {helper.name}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <div className="mt-4 rounded-lg border border-gray-100 bg-gray-50 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">Extra Helper</p>
                  <p className="text-xs text-gray-500">
                    Enable if an additional helper joined this run
                  </p>
                </div>
                <ToggleSwitch
                  checked={form.hasExtraHelper}
                  onChange={(checked) => {
                    updateField("hasExtraHelper", checked);
                    if (!checked) {
                      updateField("extraHelper", "");
                      updateField("extraHelperNote", "");
                    }
                  }}
                />
              </div>

              {form.hasExtraHelper && (
                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Extra Helper Name" required>
                    <select
                      required
                      value={form.extraHelper}
                      onChange={(e) => updateField("extraHelper", e.target.value)}
                      className={inputClass}
                    >
                      <option value="">Select extra helper</option>
                      {helpers.map((helper) => (
                        <option key={helper.id} value={helper.name}>
                          {helper.name}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Reason for Extra Helper" required>
                    <input
                      type="text"
                      placeholder="e.g. Heavy load at warehouse"
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
          </FormSection>

          <FormSection title="Remarks">
            <textarea
              rows={3}
              placeholder="Optional notes about this delivery..."
              value={form.remarks}
              onChange={(e) => updateField("remarks", e.target.value)}
              className={inputClass}
            />
          </FormSection>

          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            {isSubmitting && (
              <svg
                className="h-4 w-4 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 0 1 4 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            )}
            {isSubmitting ? "Saving…" : "Save Shipment"}
          </button>
        </div>

        {isAdmin && (
        <aside className="lg:col-span-1">
          <div className="sticky top-24 rounded-xl border border-blue-100 bg-blue-50 p-5 shadow-sm">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-blue-800">
              Live Payout Preview
            </h3>
            <p className="mt-1 text-xs text-blue-600">
              {usesLivestockRates
                ? `${form.client} livestock · base + heads × per-head rate`
                : usesDestinationRates
                  ? `${form.client} destination-based rates`
                  : selectedClient
                    ? `${getCalculationTypeLabel(selectedClient.calculationType)} calculation — preview coming soon`
                    : "Select a client to preview payouts"}
            </p>

            {payoutPreview ? (
              <div className="mt-5 space-y-4">
                <div className="rounded-lg bg-white p-4 shadow-sm">
                  <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
                    Client & Route
                  </p>
                  <p className="mt-1 font-semibold text-gray-900">
                    {form.client} · {form.farthestRoute}
                  </p>
                  <p className="text-xs text-gray-500">
                    {usesLivestockRates
                      ? `₱${driverBase} + ${form.pigheadCount || 0} × ₱${driverHeadRate ?? 0} driver · ₱${helperBase} + ${form.pigheadCount || 0} × ₱${helperHeadRate ?? 0} helper`
                      : "Estimated rates — final payout may vary once distance is confirmed by operations"}
                  </p>
                </div>

                <PayoutRow
                  label={form.driver ? `Driver — ${form.driver}` : "Driver Rate"}
                  amount={payoutPreview.driverPayout}
                />
                <PayoutRow
                  label={form.helper ? `Helper — ${form.helper}` : "Helper Rate"}
                  amount={payoutPreview.helperPayout}
                />

                {form.hasExtraHelper && (
                  <PayoutRow
                    label={
                      form.extraHelper
                        ? `Extra Helper — ${form.extraHelper}`
                        : "Extra Helper Rate"
                    }
                    amount={payoutPreview.extraHelperPayout}
                  />
                )}

                <div className="border-t border-blue-200 pt-4">
                  <PayoutRow
                    label="Total Crew Payout"
                    amount={
                      payoutPreview.driverPayout +
                      payoutPreview.helperPayout +
                      payoutPreview.extraHelperPayout
                    }
                    emphasized
                  />
                </div>
              </div>
            ) : (
              <p className="mt-5 text-sm text-blue-700">
                {usesLivestockRates
                  ? "Select a farthest route and number of heads to preview livestock payouts."
                  : usesDestinationRates
                    ? "Select a client and farthest route to preview destination-based payouts."
                    : "Payout preview for this client type will be available once its calculation logic is added."}
              </p>
            )}
          </div>
        </aside>
        )}
      </form>
    </div>
  );
}

function FormSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-base font-semibold text-gray-900">{title}</h2>
      {children}
    </section>
  );
}

function Field({
  label,
  required,
  className = "",
  children,
}: {
  label: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </span>
      {children}
    </label>
  );
}

function PayoutRow({
  label,
  amount,
  emphasized = false,
}: {
  label: string;
  amount: number;
  emphasized?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span
        className={`text-sm ${emphasized ? "font-semibold text-gray-900" : "text-gray-600"}`}
      >
        {label}
      </span>
      <span
        className={`font-mono ${emphasized ? "text-lg font-bold text-blue-800" : "font-semibold text-gray-900"}`}
      >
        {formatCurrency(amount)}
      </span>
    </div>
  );
}

function ToggleSwitch({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
        checked ? "bg-blue-600" : "bg-gray-200"
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}

const inputClass =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20";
