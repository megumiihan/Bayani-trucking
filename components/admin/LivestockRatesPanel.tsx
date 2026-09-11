"use client";

import { useState, type FormEvent } from "react";
import {
  createLivestockClient,
  createLivestockRoute,
  updateLivestockRates,
} from "@/lib/actions/client";
import type { Client } from "@/lib/clients";
import { formatCurrency } from "@/lib/mockData";
import ClientRateHistoryModal from "@/components/admin/ClientRateHistoryModal";

interface LivestockRatesPanelProps {
  clients: Client[];
}

export default function LivestockRatesPanel({
  clients,
}: LivestockRatesPanelProps) {
  const [rows, setRows] = useState(clients);
  const [newName, setNewName] = useState("");
  const [newDriverRate, setNewDriverRate] = useState("25");
  const [newHelperRate, setNewHelperRate] = useState("25");
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [routeClientId, setRouteClientId] = useState(clients[0]?.id ?? "");
  const [routeName, setRouteName] = useState("");
  const [routeDriverBase, setRouteDriverBase] = useState("700");
  const [routeHelperBase, setRouteHelperBase] = useState("700");
  const [isAddingRoute, setIsAddingRoute] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [routeMessage, setRouteMessage] = useState<string | null>(null);
  const [historyClientId, setHistoryClientId] = useState("");
  const [showHistory, setShowHistory] = useState(false);

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault();
    setIsCreating(true);
    setCreateError(null);
    const result = await createLivestockClient({
      name: newName,
      pigheadDriverRate: Number(newDriverRate),
      pigheadHelperRate: Number(newHelperRate),
    });
    setIsCreating(false);

    if (!result.success) {
      setCreateError(result.error);
      return;
    }

    setRows((current) => {
      const next = [...current, result.client].sort((a, b) =>
        a.name.localeCompare(b.name)
      );
      if (!routeClientId) setRouteClientId(result.client.id);
      return next;
    });
    setNewName("");
    setNewDriverRate("25");
    setNewHelperRate("25");
  };

  const handleAddRoute = async (event: FormEvent) => {
    event.preventDefault();
    setIsAddingRoute(true);
    setRouteError(null);
    setRouteMessage(null);
    const result = await createLivestockRoute({
      clientId: routeClientId,
      routeName,
      driverBaseRate: Number(routeDriverBase),
      helperBaseRate: Number(routeHelperBase),
    });
    setIsAddingRoute(false);

    if (!result.success) {
      setRouteError(result.error);
      return;
    }

    setRouteName("");
    setRouteMessage("Route added. It will appear in the tables below after refresh.");
  };

  return (
    <div className="card-surface overflow-hidden rounded-2xl">
      <div className="flex flex-col gap-3 border-b border-slate-100 px-6 py-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Livestock per-head rates
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Payout is the route’s driver/helper base + (heads × these per-head
            rates). Add farthest routes below or in the client tables.
          </p>
        </div>
        {rows.length > 0 && (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <select
              value={historyClientId}
              onChange={(e) => setHistoryClientId(e.target.value)}
              aria-label="Client for rate history"
              className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm text-slate-700"
            >
              <option value="">Select client…</option>
              {rows.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={!historyClientId}
              onClick={() => setShowHistory(true)}
              className="text-sm font-medium text-slate-500 underline-offset-2 hover:text-slate-800 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
            >
              Rate history
            </button>
          </div>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-100 text-sm">
          <thead className="bg-gray-50">
            <tr>
              {["Client", "Driver / head", "Helper / head", ""].map((col) => (
                <th
                  key={col || "actions"}
                  className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                  No livestock clients yet.
                </td>
              </tr>
            ) : (
              rows.map((client) => (
                <LivestockRateRow
                  key={client.id}
                  client={client}
                  onSaved={(updated) =>
                    setRows((current) =>
                      current.map((row) =>
                        row.id === updated.id ? updated : row
                      )
                    )
                  }
                  onViewHistory={() => {
                    setHistoryClientId(client.id);
                    setShowHistory(true);
                  }}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      <form
        onSubmit={handleCreate}
        className="grid grid-cols-1 gap-3 border-t border-gray-100 px-6 py-4 sm:grid-cols-4"
      >
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-gray-500">
            New livestock client
          </span>
          <input
            type="text"
            required
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Client name"
            className={inputClass}
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-gray-500">
            Driver / head
          </span>
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            required
            value={newDriverRate}
            onChange={(e) => setNewDriverRate(e.target.value)}
            className={inputClass}
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-gray-500">
            Helper / head
          </span>
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            required
            value={newHelperRate}
            onChange={(e) => setNewHelperRate(e.target.value)}
            className={inputClass}
          />
        </label>
        <div className="flex items-end">
          <button
            type="submit"
            disabled={isCreating}
            className="w-full rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
          >
            {isCreating ? "Adding…" : "Add client"}
          </button>
        </div>
        {createError && (
          <p
            role="alert"
            className="sm:col-span-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
          >
            {createError}
          </p>
        )}
      </form>

      {rows.length > 0 && (
        <form
          onSubmit={handleAddRoute}
          className="grid grid-cols-1 gap-3 border-t border-gray-100 px-6 py-4 sm:grid-cols-5"
        >
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-gray-500">
              Add farthest route
            </span>
            <select
              required
              value={routeClientId}
              onChange={(e) => setRouteClientId(e.target.value)}
              className={inputClass}
            >
              {rows.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-gray-500">
              Route name
            </span>
            <input
              type="text"
              required
              value={routeName}
              onChange={(e) => setRouteName(e.target.value)}
              placeholder="e.g. AURORA, CABATUAN"
              className={inputClass}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-gray-500">
              Driver base
            </span>
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              required
              value={routeDriverBase}
              onChange={(e) => setRouteDriverBase(e.target.value)}
              className={inputClass}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-gray-500">
              Helper base
            </span>
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              required
              value={routeHelperBase}
              onChange={(e) => setRouteHelperBase(e.target.value)}
              className={inputClass}
            />
          </label>
          <div className="sm:col-span-5 flex items-center justify-between gap-3">
            <p className="text-xs text-gray-500">
              This writes a DestinationRoute row — the same table Pepsi and Big
              Mak use.
            </p>
            <button
              type="submit"
              disabled={isAddingRoute}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              {isAddingRoute ? "Adding…" : "Add route"}
            </button>
          </div>
          {routeError && (
            <p
              role="alert"
              className="sm:col-span-5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
            >
              {routeError}
            </p>
          )}
          {routeMessage && (
            <p className="sm:col-span-5 text-sm text-emerald-700">{routeMessage}</p>
          )}
        </form>
      )}

      <ClientRateHistoryModal
        open={showHistory}
        clientId={historyClientId || null}
        clientName={
          rows.find((client) => client.id === historyClientId)?.name ?? ""
        }
        kind="LIVESTOCK"
        onClose={() => setShowHistory(false)}
      />
    </div>
  );
}

function LivestockRateRow({
  client,
  onSaved,
  onViewHistory,
}: {
  client: Client;
  onSaved: (client: Client) => void;
  onViewHistory: () => void;
}) {
  const [driverRate, setDriverRate] = useState(
    String(client.pigheadDriverRate ?? "")
  );
  const [helperRate, setHelperRate] = useState(
    String(client.pigheadHelperRate ?? "")
  );
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    const result = await updateLivestockRates({
      id: client.id,
      pigheadDriverRate: Number(driverRate),
      pigheadHelperRate: Number(helperRate),
    });
    setIsSaving(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    onSaved(result.client);
  };

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-4 py-3 font-semibold text-gray-900">{client.name}</td>
      <td className="px-4 py-3">
        <input
          type="number"
          inputMode="decimal"
          min="0"
          step="0.01"
          value={driverRate}
          onChange={(e) => setDriverRate(e.target.value)}
          className={inputClass}
          aria-label={`${client.name} driver per-head rate`}
        />
        <p className="mt-1 text-xs text-gray-400">
          Now {formatCurrency(client.pigheadDriverRate ?? 0)}
        </p>
      </td>
      <td className="px-4 py-3">
        <input
          type="number"
          inputMode="decimal"
          min="0"
          step="0.01"
          value={helperRate}
          onChange={(e) => setHelperRate(e.target.value)}
          className={inputClass}
          aria-label={`${client.name} helper per-head rate`}
        />
        <p className="mt-1 text-xs text-gray-400">
          Now {formatCurrency(client.pigheadHelperRate ?? 0)}
        </p>
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-col items-start gap-1">
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="rounded-md bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50"
          >
            {isSaving ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            onClick={onViewHistory}
            className="text-xs font-medium text-slate-500 underline-offset-2 hover:text-slate-800 hover:underline"
          >
            Rate history
          </button>
        </div>
        {error && <p className="mt-1 text-xs text-red-700">{error}</p>}
      </td>
    </tr>
  );
}

const inputClass =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20";
