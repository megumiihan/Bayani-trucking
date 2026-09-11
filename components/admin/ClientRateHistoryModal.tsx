"use client";

import { useEffect, useState } from "react";
import type { ClientRateHistoryKind } from "@prisma/client";
import { fetchClientRateHistory } from "@/lib/actions/client";
import type { ClientRateHistoryEntry } from "@/lib/mappers/clientRateHistory";
import { formatCurrency } from "@/lib/mockData";
import { fractionToPercentInput } from "@/lib/platform";

interface ClientRateHistoryModalProps {
  clientId: string | null;
  clientName: string;
  kind: ClientRateHistoryKind;
  open: boolean;
  onClose: () => void;
}

const historyDateFormatter = new Intl.DateTimeFormat("en-PH", {
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

const kindLabels: Record<ClientRateHistoryKind, string> = {
  LIVESTOCK: "Livestock per-head rates",
  PLATFORM: "Platform rates",
};

export default function ClientRateHistoryModal({
  clientId,
  clientName,
  kind,
  open,
  onClose,
}: ClientRateHistoryModalProps) {
  const [entries, setEntries] = useState<ClientRateHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !clientId) return;

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    fetchClientRateHistory(clientId, kind).then((result) => {
      if (cancelled) return;
      setIsLoading(false);
      if (!result.success) {
        setError(result.error);
        setEntries([]);
        return;
      }
      setEntries(result.entries);
    });

    return () => {
      cancelled = true;
    };
  }, [open, clientId, kind]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close modal"
        className="absolute inset-0 bg-slate-900/50"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-labelledby="client-rate-history-title"
        aria-modal="true"
        className="relative flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl"
      >
        <div className="border-b border-slate-100 px-6 py-4">
          <h2
            id="client-rate-history-title"
            className="text-lg font-semibold text-slate-900"
          >
            Rate History — {clientName}
          </h2>
          <p className="mt-1 text-sm text-slate-500">{kindLabels[kind]}</p>
        </div>

        <div className="overflow-y-auto overscroll-contain px-6 py-4">
          {isLoading && (
            <p className="py-8 text-center text-sm text-slate-500">
              Loading history…
            </p>
          )}

          {error && (
            <p
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
            >
              {error}
            </p>
          )}

          {!isLoading && !error && entries.length === 0 && (
            <p className="py-8 text-center text-sm text-slate-500">
              No rate changes recorded yet for this client.
            </p>
          )}

          {!isLoading && entries.length > 0 && (
            <ul className="space-y-4">
              {entries.map((entry) => (
                <li
                  key={entry.id}
                  className="rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-3"
                >
                  <p className="text-xs text-slate-500">
                    {historyDateFormatter.format(new Date(entry.changedAt))}
                    {" · "}
                    {entry.changedByEmail}
                  </p>
                  {entry.kind === "LIVESTOCK" ? (
                    <dl className="mt-3 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                      <RateChange
                        label="Driver / head"
                        from={entry.prevPigheadDriverRate}
                        to={entry.newPigheadDriverRate}
                        format="currency"
                      />
                      <RateChange
                        label="Helper / head"
                        from={entry.prevPigheadHelperRate}
                        to={entry.newPigheadHelperRate}
                        format="currency"
                      />
                    </dl>
                  ) : (
                    <dl className="mt-3 grid grid-cols-1 gap-2 text-sm sm:grid-cols-3">
                      <RateChange
                        label="Platform share"
                        from={entry.prevPlatformShare}
                        to={entry.newPlatformShare}
                        format="percent"
                      />
                      <RateChange
                        label="Driver %"
                        from={entry.prevPlatformDriverRate}
                        to={entry.newPlatformDriverRate}
                        format="percent"
                      />
                      <RateChange
                        label="Helper %"
                        from={entry.prevPlatformHelperRate}
                        to={entry.newPlatformHelperRate}
                        format="percent"
                      />
                    </dl>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="border-t border-slate-100 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function RateChange({
  label,
  from,
  to,
  format,
}: {
  label: string;
  from: number | null;
  to: number | null;
  format: "currency" | "percent";
}) {
  if (from == null || to == null) return null;

  const formatValue = (value: number) =>
    format === "currency"
      ? formatCurrency(value)
      : `${fractionToPercentInput(value)}%`;

  const changed = from !== to;

  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">
        {label}
      </dt>
      <dd className="mt-0.5 font-mono tabular-nums text-slate-800">
        {formatValue(from)}
        <span className="mx-1 text-slate-400">→</span>
        <span className={changed ? "font-semibold text-blue-700" : ""}>
          {formatValue(to)}
        </span>
      </dd>
    </div>
  );
}
