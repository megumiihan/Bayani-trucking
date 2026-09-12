"use client";

import { useEffect, useState } from "react";
import { fetchDestinationRateHistory } from "@/lib/actions/route";
import type { DestinationRateHistoryEntry } from "@/lib/mappers/routeHistory";
import { formatCurrency } from "@/lib/mockData";
import { useEscapeToClose } from "@/components/ui/useEscapeToClose";

interface DestinationRateHistoryModalProps {
  clientId: string | null;
  clientName: string;
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

export default function DestinationRateHistoryModal({
  clientId,
  clientName,
  open,
  onClose,
}: DestinationRateHistoryModalProps) {
  const [entries, setEntries] = useState<DestinationRateHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !clientId) return;

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    fetchDestinationRateHistory(clientId).then((result) => {
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
  }, [open, clientId]);

  useEscapeToClose(open, onClose);

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
        aria-labelledby="rate-history-title"
        aria-modal="true"
        className="relative flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl"
      >
        <div className="border-b border-slate-100 px-6 py-4">
          <h2 id="rate-history-title" className="text-lg font-semibold text-slate-900">
            Rate History — {clientName}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Previous and new rates for each edit, newest first.
          </p>
        </div>

        <div className="overflow-y-auto overscroll-contain px-6 py-4">
          {isLoading && (
            <p className="py-8 text-center text-sm text-slate-500">Loading history…</p>
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
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-slate-900">
                        {entry.routeName}
                        {entry.distance ? (
                          <span className="ml-1 text-slate-500">· {entry.distance}</span>
                        ) : null}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {historyDateFormatter.format(new Date(entry.changedAt))}
                        {" · "}
                        {entry.changedByEmail}
                      </p>
                    </div>
                  </div>
                  <dl className="mt-3 grid grid-cols-1 gap-2 text-sm sm:grid-cols-3">
                    <RateChange
                      label="Driver"
                      from={entry.prevDriverBaseRate}
                      to={entry.newDriverBaseRate}
                    />
                    <RateChange
                      label="Helper"
                      from={entry.prevHelperBaseRate}
                      to={entry.newHelperBaseRate}
                    />
                    <RateChange
                      label="Extra helper"
                      from={entry.prevExtraHelperBaseRate}
                      to={entry.newExtraHelperBaseRate}
                    />
                  </dl>
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
}: {
  label: string;
  from: number;
  to: number;
}) {
  const changed = from !== to;
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">
        {label}
      </dt>
      <dd className="mt-0.5 font-mono tabular-nums text-slate-800">
        {formatCurrency(from)}
        <span className="mx-1 text-slate-400">→</span>
        <span className={changed ? "font-semibold text-blue-700" : ""}>
          {formatCurrency(to)}
        </span>
      </dd>
    </div>
  );
}
