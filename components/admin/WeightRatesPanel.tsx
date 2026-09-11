"use client";

import { useMemo, useState } from "react";
import type { Client } from "@/lib/clients";
import { formatCurrency } from "@/lib/mockData";
import type { DestinationRouteRate } from "@/lib/rates";
import DestinationRateHistoryModal from "@/components/admin/DestinationRateHistoryModal";

interface WeightRatesPanelProps {
  clients: Client[];
  rates: DestinationRouteRate[];
}

export default function WeightRatesPanel({
  clients,
  rates,
}: WeightRatesPanelProps) {
  const [selectedClientId, setSelectedClientId] = useState(clients[0]?.id ?? "");
  const [showHistory, setShowHistory] = useState(false);

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

  if (clients.length === 0 || rates.length === 0) return null;

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
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <select
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
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
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100 text-sm">
            <thead className="bg-slate-50">
              <tr>
                {[
                  "Destination",
                  "KG",
                  "Helper",
                  "Driver",
                  "Same driver",
                  "New helper",
                  "New driver",
                ].map((col) => (
                  <th
                    key={col}
                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {clientRates.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                    No weight tiers for this client.
                  </td>
                </tr>
              ) : (
                clientRates.map((rate) => (
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
                    <td className="px-4 py-3 tabular-nums">
                      {formatCurrency(rate.helperBaseRate)}
                    </td>
                    <td className="px-4 py-3 tabular-nums">
                      {formatCurrency(rate.driverBaseRate)}
                    </td>
                    <td className="px-4 py-3 tabular-nums">
                      {formatCurrency(rate.sameDriverRate ?? 0)}
                    </td>
                    <td className="px-4 py-3 tabular-nums">
                      {formatCurrency(rate.newHelperRate ?? 0)}
                    </td>
                    <td className="px-4 py-3 tabular-nums">
                      {formatCurrency(rate.newDriverRate ?? 0)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <DestinationRateHistoryModal
        open={showHistory}
        clientId={selectedClientId || null}
        clientName={selectedClient?.name ?? ""}
        onClose={() => setShowHistory(false)}
      />
    </>
  );
}
