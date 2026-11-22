"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  createWeightRoute,
  updateWeightRate,
  type WeightRateValues,
} from "@/lib/actions/route";
import type { Client } from "@/lib/clients";
import { formatCurrency } from "@/lib/mockData";
import type { DestinationRouteRate } from "@/lib/rates";
import { WEIGHT_TIER_KGS } from "@/lib/weight";
import { inputClass } from "@/components/ui/formStyles";
import { useEscapeToClose } from "@/components/ui/useEscapeToClose";
import DestinationRateHistoryModal from "@/components/admin/DestinationRateHistoryModal";
import AddRateClientForm from "@/components/admin/AddRateClientForm";
import { AddRateInput } from "@/components/admin/DestinationRatesPanel";

interface WeightRatesPanelProps {
  clients: Client[];
  rates: DestinationRouteRate[];
}

const RATE_FIELDS: Array<{ key: keyof WeightRateValues; label: string }> = [
  { key: "helperBaseRate", label: "Helper" },
  { key: "driverBaseRate", label: "Driver" },
  { key: "sameDriverRate", label: "Same driver" },
  { key: "newHelperRate", label: "Inexp. helper" },
  { key: "newDriverRate", label: "Inexp. driver" },
];

function rateValues(rate: DestinationRouteRate): WeightRateValues {
  return {
    helperBaseRate: rate.helperBaseRate,
    driverBaseRate: rate.driverBaseRate,
    sameDriverRate: rate.sameDriverRate ?? 0,
    newHelperRate: rate.newHelperRate ?? 0,
    newDriverRate: rate.newDriverRate ?? 0,
  };
}

export default function WeightRatesPanel({
  clients: initialClients,
  rates: initialRates,
}: WeightRatesPanelProps) {
  const [clients, setClients] = useState(initialClients);
  const [rates, setRates] = useState(initialRates);
  const [selectedClientId, setSelectedClientId] = useState(
    initialClients[0]?.id ?? ""
  );
  const [showHistory, setShowHistory] = useState(false);
  const [editingRate, setEditingRate] = useState<DestinationRouteRate | null>(
    null
  );
  const [message, setMessage] = useState<string | null>(null);

  const selectedClient = clients.find((client) => client.id === selectedClientId);

  const clientRates = useMemo(
    () =>
      rates
        .filter((rate) => rate.client === selectedClient?.name)
        .sort((a, b) => {
          const routeCompare = a.routeName.localeCompare(b.routeName);
          if (routeCompare !== 0) return routeCompare;
          return (a.weightKg ?? 0) - (b.weightKg ?? 0);
        }),
    [rates, selectedClient?.name]
  );

  const replaceRate = (route: DestinationRouteRate) =>
    setRates((current) =>
      current.map((rate) => (rate.id === route.id ? route : rate))
    );

  return (
    <>
      <div className="card-surface overflow-hidden rounded-2xl">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-6 py-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Weight-based rates
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Payout depends on destination, kg tier, and each person’s bounty
              experience. Same-driver rate applies when the helper is a driver.
              Inexperienced rates apply to crew tagged “Bounty- inexperienced”.
            </p>
          </div>
          {clients.length > 0 && (
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <select
                value={selectedClientId}
                onChange={(e) => {
                  setSelectedClientId(e.target.value);
                  setMessage(null);
                }}
                aria-label="Weight client"
                className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm text-slate-700"
              >
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={!selectedClientId}
                onClick={() => setShowHistory(true)}
                className="text-sm font-medium text-slate-500 underline-offset-2 hover:text-slate-800 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
              >
                Rate history
              </button>
            </div>
          )}
        </div>

        {message && (
          <p className="border-b border-emerald-100 bg-emerald-50 px-6 py-2 text-sm text-emerald-800">
            {message}
          </p>
        )}

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100 text-sm">
            <thead className="bg-slate-50">
              <tr>
                {["Destination", "KG", ...RATE_FIELDS.map((f) => f.label), ""].map(
                  (col) => (
                    <th
                      key={col || "actions"}
                      className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500"
                    >
                      {col}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {clientRates.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                    {clients.length === 0
                      ? "No weight-based clients yet. Add one below."
                      : "No weight tiers for this client. Add one below."}
                  </td>
                </tr>
              ) : (
                clientRates.map((rate) => {
                  const values = rateValues(rate);
                  return (
                    <tr key={rate.id} className="hover:bg-slate-50/80">
                      <td className="px-4 py-3 text-blue-700">
                        {rate.routeName}
                        {rate.distance ? (
                          <span className="mt-0.5 block text-xs text-slate-500">
                            {rate.distance}
                          </span>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-slate-700">{rate.weightKg}</td>
                      {RATE_FIELDS.map((field) => (
                        <td key={field.key} className="px-4 py-3 tabular-nums">
                          {formatCurrency(values[field.key])}
                        </td>
                      ))}
                      <td className="px-4 py-3 pr-6">
                        <button
                          type="button"
                          onClick={() => setEditingRate(rate)}
                          className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {selectedClient && (
          <AddWeightTierForm
            clientId={selectedClient.id}
            clientName={selectedClient.name}
            onCreated={(route) => {
              setRates((current) => [...current, route]);
              setMessage(`Added ${route.routeName} · ${route.weightKg} kg.`);
            }}
          />
        )}

        <AddRateClientForm
          calcType="WEIGHT"
          onCreated={(client) => {
            setClients((current) =>
              [...current, client].sort((a, b) => a.name.localeCompare(b.name))
            );
            setSelectedClientId(client.id);
            setMessage(`Added ${client.name}. Add its weight tiers next.`);
          }}
        />
      </div>

      <EditWeightRateModal
        rate={editingRate}
        onClose={() => setEditingRate(null)}
        onSaved={(route) => {
          replaceRate(route);
          setEditingRate(null);
          setMessage(`Saved ${route.routeName} · ${route.weightKg} kg.`);
        }}
      />

      <DestinationRateHistoryModal
        open={showHistory}
        clientId={selectedClientId || null}
        clientName={selectedClient?.name ?? ""}
        onClose={() => setShowHistory(false)}
      />
    </>
  );
}

function emptyRateInputs(): Record<keyof WeightRateValues, string> {
  return {
    helperBaseRate: "",
    driverBaseRate: "",
    sameDriverRate: "",
    newHelperRate: "",
    newDriverRate: "",
  };
}

function toRateValues(inputs: Record<keyof WeightRateValues, string>) {
  return {
    helperBaseRate: Number(inputs.helperBaseRate),
    driverBaseRate: Number(inputs.driverBaseRate),
    sameDriverRate: Number(inputs.sameDriverRate),
    newHelperRate: Number(inputs.newHelperRate),
    newDriverRate: Number(inputs.newDriverRate),
  };
}

function AddWeightTierForm({
  clientId,
  clientName,
  onCreated,
}: {
  clientId: string;
  clientName: string;
  onCreated: (route: DestinationRouteRate) => void;
}) {
  const [routeName, setRouteName] = useState("");
  const [distance, setDistance] = useState("");
  const [weightKg, setWeightKg] = useState<string>(String(WEIGHT_TIER_KGS[0]));
  const [inputs, setInputs] = useState(emptyRateInputs);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setIsSaving(true);
    setError(null);
    const result = await createWeightRoute({
      clientId,
      routeName,
      distance,
      weightKg: Number(weightKg),
      ...toRateValues(inputs),
    });
    setIsSaving(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    // Keep destination so the next kg tier for the same route is quick to add.
    setInputs(emptyRateInputs());
    onCreated(result.route);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="grid grid-cols-2 gap-3 border-t border-slate-100 px-6 py-4 sm:grid-cols-5"
    >
      <p className="col-span-2 text-xs font-semibold uppercase tracking-wider text-slate-500 sm:col-span-5">
        Add weight tier · {clientName}
      </p>
      <label className="col-span-2 block">
        <span className="mb-1.5 block text-xs font-medium text-slate-500">
          Destination
        </span>
        <input
          type="text"
          required
          value={routeName}
          onChange={(e) => setRouteName(e.target.value)}
          placeholder="e.g. CENTRAL TUMAUINI/ BAGGAO"
          className={inputClass}
        />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-xs font-medium text-slate-500">
          Distance (optional)
        </span>
        <input
          type="text"
          value={distance}
          onChange={(e) => setDistance(e.target.value)}
          placeholder="e.g. 1-120KM"
          className={inputClass}
        />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-xs font-medium text-slate-500">KG tier</span>
        <input
          type="number"
          inputMode="numeric"
          min="1"
          step="1"
          required
          list="weight-tier-options"
          value={weightKg}
          onChange={(e) => setWeightKg(e.target.value)}
          className={inputClass}
        />
        <datalist id="weight-tier-options">
          {WEIGHT_TIER_KGS.map((kg) => (
            <option key={kg} value={kg} />
          ))}
        </datalist>
      </label>
      <div className="hidden sm:block" />
      {RATE_FIELDS.map((field) => (
        <AddRateInput
          key={field.key}
          label={field.label}
          value={inputs[field.key]}
          onChange={(value) =>
            setInputs((current) => ({ ...current, [field.key]: value }))
          }
        />
      ))}
      <div className="col-span-2 flex justify-end sm:col-span-5">
        <button
          type="submit"
          disabled={isSaving}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          {isSaving ? "Adding…" : "Add tier"}
        </button>
      </div>
      {error && (
        <p
          role="alert"
          className="col-span-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 sm:col-span-5"
        >
          {error}
        </p>
      )}
    </form>
  );
}

function EditWeightRateModal({
  rate,
  onClose,
  onSaved,
}: {
  rate: DestinationRouteRate | null;
  onClose: () => void;
  onSaved: (route: DestinationRouteRate) => void;
}) {
  const [inputs, setInputs] = useState(emptyRateInputs);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!rate) return;
    const values = rateValues(rate);
    setInputs({
      helperBaseRate: String(values.helperBaseRate),
      driverBaseRate: String(values.driverBaseRate),
      sameDriverRate: String(values.sameDriverRate),
      newHelperRate: String(values.newHelperRate),
      newDriverRate: String(values.newDriverRate),
    });
    setError(null);
  }, [rate]);

  const close = () => {
    if (!isSaving) onClose();
  };

  useEscapeToClose(Boolean(rate), close, isSaving);

  if (!rate) return null;
  const current = rateValues(rate);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setIsSaving(true);
    setError(null);
    const result = await updateWeightRate({
      routeId: rate.id,
      ...toRateValues(inputs),
    });
    setIsSaving(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    onSaved(result.route);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close modal"
        className="absolute inset-0 bg-slate-900/50"
        onClick={close}
      />
      <div
        role="dialog"
        aria-labelledby="edit-weight-rate-title"
        aria-modal="true"
        className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
      >
        <h2 id="edit-weight-rate-title" className="text-lg font-semibold text-slate-900">
          Edit Weight Tier
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          {rate.client} · {rate.routeName}
          {rate.distance ? ` · ${rate.distance}` : ""} · {rate.weightKg} kg
        </p>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {RATE_FIELDS.map((field) => (
            <label key={field.key} className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">
                {field.label} rate
              </span>
              <input
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                required
                value={inputs[field.key]}
                onChange={(e) =>
                  setInputs((prev) => ({ ...prev, [field.key]: e.target.value }))
                }
                className={inputClass}
              />
              <span className="mt-1 block text-xs text-slate-400">
                Current: {formatCurrency(current[field.key])}
              </span>
            </label>
          ))}

          {error && (
            <p
              role="alert"
              aria-live="polite"
              className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
            >
              {error}
            </p>
          )}

          <p className="text-xs text-slate-400">
            Applies to new trips. Past shipments keep their saved payouts.
          </p>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={close}
              disabled={isSaving}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
            >
              {isSaving ? "Saving…" : "Save Rates"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
