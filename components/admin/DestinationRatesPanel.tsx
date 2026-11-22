"use client";

import { useMemo, useState, type FormEvent } from "react";
import {
  createDestinationRoute,
  updateDestinationRates,
} from "@/lib/actions/route";
import type { Client } from "@/lib/clients";
import { formatCurrency } from "@/lib/mockData";
import type { DestinationRouteRate } from "@/lib/rates";
import { inputClass } from "@/components/ui/formStyles";
import EditDestinationRateModal from "@/components/admin/EditDestinationRateModal";
import DestinationRateHistoryModal from "@/components/admin/DestinationRateHistoryModal";
import AddRateClientForm from "@/components/admin/AddRateClientForm";

interface DestinationRatesPanelProps {
  clients: Client[];
  initialRates: DestinationRouteRate[];
}

export default function DestinationRatesPanel({
  clients: initialClients,
  initialRates,
}: DestinationRatesPanelProps) {
  const [clients, setClients] = useState(initialClients);
  const [rates, setRates] = useState(initialRates);
  const [selectedClientId, setSelectedClientId] = useState(clients[0]?.id ?? "");
  const [selectedRouteIds, setSelectedRouteIds] = useState<Set<string>>(
    () => new Set()
  );
  const [bulkDriver, setBulkDriver] = useState("");
  const [bulkHelper, setBulkHelper] = useState("");
  const [bulkExtraHelper, setBulkExtraHelper] = useState("");
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [bulkSuccess, setBulkSuccess] = useState<string | null>(null);
  const [isBulkSaving, setIsBulkSaving] = useState(false);
  const [editingRate, setEditingRate] = useState<DestinationRouteRate | null>(
    null
  );
  const [editError, setEditError] = useState<string | null>(null);
  const [isEditSaving, setIsEditSaving] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const selectedClient = clients.find((client) => client.id === selectedClientId);

  const clientRates = useMemo(
    () =>
      rates
        .filter((rate) => rate.client === selectedClient?.name)
        .sort((a, b) => {
          const routeCompare = a.routeName.localeCompare(b.routeName);
          if (routeCompare !== 0) return routeCompare;
          return a.distance.localeCompare(b.distance);
        }),
    [rates, selectedClient?.name]
  );

  const allVisibleSelected =
    clientRates.length > 0 &&
    clientRates.every((rate) => selectedRouteIds.has(rate.id));

  const toggleRoute = (routeId: string) => {
    setSelectedRouteIds((current) => {
      const next = new Set(current);
      if (next.has(routeId)) next.delete(routeId);
      else next.add(routeId);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (allVisibleSelected) {
      setSelectedRouteIds(new Set());
      return;
    }
    setSelectedRouteIds(new Set(clientRates.map((rate) => rate.id)));
  };

  const handleClientChange = (clientId: string) => {
    setSelectedClientId(clientId);
    setSelectedRouteIds(new Set());
    setBulkDriver("");
    setBulkHelper("");
    setBulkExtraHelper("");
    setBulkError(null);
    setBulkSuccess(null);
  };

  const applyRateUpdates = async (
    updates: Array<{
      routeId: string;
      driverBaseRate: number;
      helperBaseRate: number;
      extraHelperBaseRate: number;
    }>
  ) => {
    const result = await updateDestinationRates(updates);
    if (!result.success) return result;

    setRates((current) => {
      const byId = new Map(result.routes.map((route) => [route.id, route]));
      return current.map((rate) => byId.get(rate.id) ?? rate);
    });

    return result;
  };

  const handleBulkSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setBulkError(null);
    setBulkSuccess(null);

    if (selectedRouteIds.size === 0) {
      setBulkError("Select at least one route or distance band.");
      return;
    }

    const hasDriver = bulkDriver.trim() !== "";
    const hasHelper = bulkHelper.trim() !== "";
    const hasExtra = bulkExtraHelper.trim() !== "";

    if (!hasDriver && !hasHelper && !hasExtra) {
      setBulkError("Enter at least one rate to apply.");
      return;
    }

    const selectedRates = clientRates.filter((rate) =>
      selectedRouteIds.has(rate.id)
    );

    const updates = selectedRates.map((rate) => ({
      routeId: rate.id,
      driverBaseRate: hasDriver ? Number(bulkDriver) : rate.driverBaseRate,
      helperBaseRate: hasHelper ? Number(bulkHelper) : rate.helperBaseRate,
      extraHelperBaseRate: hasExtra
        ? Number(bulkExtraHelper)
        : rate.extraHelperBaseRate,
    }));

    setIsBulkSaving(true);
    const result = await applyRateUpdates(updates);
    setIsBulkSaving(false);

    if (!result.success) {
      setBulkError(result.error);
      return;
    }

    setBulkSuccess(
      `Updated ${result.routes.length} route${result.routes.length === 1 ? "" : "s"}.`
    );
    setSelectedRouteIds(new Set());
    setBulkDriver("");
    setBulkHelper("");
    setBulkExtraHelper("");
  };

  const handleEditSave = async (values: {
    driverBaseRate: number;
    helperBaseRate: number;
    extraHelperBaseRate: number;
  }) => {
    if (!editingRate) return;

    setIsEditSaving(true);
    setEditError(null);

    const result = await applyRateUpdates([
      {
        routeId: editingRate.id,
        ...values,
      },
    ]);

    setIsEditSaving(false);

    if (!result.success) {
      setEditError(result.error);
      return;
    }

    setEditingRate(null);
    setEditError(null);
    setBulkSuccess("Route rates saved.");
  };

  return (
    <>
      <div className="card-surface overflow-hidden rounded-2xl">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Destination-based rates
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-slate-500">
              Select a client, choose one or more routes, then apply new driver
              and helper rates in bulk—or edit a single row.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowHistory(true)}
            disabled={!selectedClientId}
            className="shrink-0 text-sm font-medium text-slate-500 underline-offset-2 hover:text-slate-800 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
          >
            Rate history
          </button>
        </div>

        {clients.length > 0 && (
        <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
          <label className="block max-w-xs">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">
              Client
            </span>
            <select
              value={selectedClientId}
              onChange={(e) => handleClientChange(e.target.value)}
              className={inputClass}
            >
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        )}

        {selectedRouteIds.size > 0 && (
          <form
            onSubmit={handleBulkSubmit}
            className="border-b border-blue-100 bg-blue-50/60 px-5 py-4 sm:px-6"
          >
            <p className="mb-3 text-sm font-medium text-blue-900">
              Bulk update · {selectedRouteIds.size} selected
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
              <BulkRateInput
                label="Driver rate"
                value={bulkDriver}
                onChange={setBulkDriver}
              />
              <BulkRateInput
                label="Helper rate"
                value={bulkHelper}
                onChange={setBulkHelper}
              />
              <BulkRateInput
                label="Extra helper rate"
                value={bulkExtraHelper}
                onChange={setBulkExtraHelper}
              />
              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={isBulkSaving}
                  className="w-full rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
                >
                  {isBulkSaving ? "Applying…" : "Apply to Selected"}
                </button>
              </div>
            </div>
            <p className="mt-2 text-xs text-blue-800/80">
              Leave a field blank to keep the current rate for that column.
            </p>
            {bulkError && (
              <p role="alert" className="mt-2 text-sm text-red-700">
                {bulkError}
              </p>
            )}
          </form>
        )}

        {bulkSuccess && selectedRouteIds.size === 0 && (
          <p className="border-b border-emerald-100 bg-emerald-50 px-5 py-2 text-sm text-emerald-800 sm:px-6">
            {bulkSuccess}
          </p>
        )}

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50/90">
              <tr className="border-b border-slate-200">
                <th className="w-10 px-4 py-3 pl-6">
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={toggleSelectAll}
                    aria-label="Select all routes"
                    className="rounded border-slate-300 text-blue-700 focus:ring-blue-500"
                  />
                </th>
                {["Route", "Distance", "Driver", "Helper", "Extra helper", ""].map(
                  (col) => (
                    <th
                      key={col || "actions"}
                      className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 last:pr-6"
                    >
                      {col}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {clientRates.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-12 text-center text-slate-500"
                  >
                    {clients.length === 0
                      ? "No destination-based clients yet. Add one below."
                      : "No destination routes for this client. Add one below."}
                  </td>
                </tr>
              ) : (
                clientRates.map((rate) => {
                  const isSelected = selectedRouteIds.has(rate.id);
                  return (
                    <tr
                      key={rate.id}
                      className={`transition-colors hover:bg-slate-50/80 ${
                        isSelected ? "bg-blue-50/40" : ""
                      }`}
                    >
                      <td className="px-4 py-3 pl-6">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleRoute(rate.id)}
                          aria-label={`Select ${rate.routeName}`}
                          className="rounded border-slate-300 text-blue-700 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-4 py-3 font-medium text-blue-800">
                        {rate.routeName}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {rate.distance || "—"}
                      </td>
                      <td className="px-4 py-3 font-mono tabular-nums text-slate-900">
                        {formatCurrency(rate.driverBaseRate)}
                      </td>
                      <td className="px-4 py-3 font-mono tabular-nums text-slate-900">
                        {formatCurrency(rate.helperBaseRate)}
                      </td>
                      <td className="px-4 py-3 font-mono tabular-nums text-slate-900">
                        {formatCurrency(rate.extraHelperBaseRate)}
                      </td>
                      <td className="px-4 py-3 pr-6">
                        <button
                          type="button"
                          onClick={() => {
                            setEditError(null);
                            setEditingRate(rate);
                          }}
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
          <AddDestinationRouteForm
            clientId={selectedClient.id}
            clientName={selectedClient.name}
            onCreated={(route) => {
              setRates((current) => [...current, route]);
              setBulkSuccess(`Added ${route.description ?? route.routeName}.`);
            }}
          />
        )}

        <AddRateClientForm
          calcType="DESTINATION"
          onCreated={(client) => {
            setClients((current) =>
              [...current, client].sort((a, b) => a.name.localeCompare(b.name))
            );
            handleClientChange(client.id);
          }}
        />
      </div>

      <EditDestinationRateModal
        rate={editingRate}
        isSaving={isEditSaving}
        error={editError}
        onClose={() => {
          if (isEditSaving) return;
          setEditingRate(null);
          setEditError(null);
        }}
        onSave={handleEditSave}
      />

      <DestinationRateHistoryModal
        open={showHistory}
        clientId={selectedClientId}
        clientName={selectedClient?.name ?? ""}
        onClose={() => setShowHistory(false)}
      />
    </>
  );
}

function BulkRateInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-blue-900/80">
        {label}
      </span>
      <input
        type="number"
        inputMode="decimal"
        min="0"
        step="0.01"
        placeholder="Keep current"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={inputClass}
      />
    </label>
  );
}

function AddDestinationRouteForm({
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
  const [driver, setDriver] = useState("");
  const [helper, setHelper] = useState("");
  const [extraHelper, setExtraHelper] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setIsSaving(true);
    setError(null);
    const result = await createDestinationRoute({
      clientId,
      routeName,
      distance,
      driverBaseRate: Number(driver),
      helperBaseRate: Number(helper),
      extraHelperBaseRate: Number(extraHelper),
    });
    setIsSaving(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setRouteName("");
    setDistance("");
    setDriver("");
    setHelper("");
    setExtraHelper("");
    onCreated(result.route);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="grid grid-cols-2 gap-3 border-t border-slate-100 px-5 py-4 sm:grid-cols-6 sm:px-6"
    >
      <p className="col-span-2 text-xs font-semibold uppercase tracking-wider text-slate-500 sm:col-span-6">
        Add route · {clientName}
      </p>
      <label className="col-span-2 block">
        <span className="mb-1.5 block text-xs font-medium text-slate-500">
          Route / destination
        </span>
        <input
          type="text"
          required
          value={routeName}
          onChange={(e) => setRouteName(e.target.value)}
          placeholder="e.g. ILAGAN CITY, ISABELA"
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
      <AddRateInput label="Driver" value={driver} onChange={setDriver} />
      <AddRateInput label="Helper" value={helper} onChange={setHelper} />
      <AddRateInput label="Extra helper" value={extraHelper} onChange={setExtraHelper} />
      <div className="col-span-2 flex justify-end sm:col-span-6">
        <button
          type="submit"
          disabled={isSaving}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          {isSaving ? "Adding…" : "Add route"}
        </button>
      </div>
      {error && (
        <p
          role="alert"
          className="col-span-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 sm:col-span-6"
        >
          {error}
        </p>
      )}
    </form>
  );
}

export function AddRateInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-slate-500">{label}</span>
      <input
        type="number"
        inputMode="decimal"
        min="0"
        step="0.01"
        required
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={inputClass}
      />
    </label>
  );
}
