"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  checkItemsFor,
  todayISO,
  type CheckItem,
  type CheckItems,
  type CheckResult,
} from "@/lib/truckMaintenance";
import type { CheckWriteInput } from "@/lib/truckRecords";
import { inputClass } from "@/components/ui/formStyles";
import { useEscapeToClose } from "@/components/ui/useEscapeToClose";

interface TruckCheckModalProps {
  isOpen: boolean;
  isSaving: boolean;
  error: string | null;
  plateNumber: string;
  truckType: string;
  /** All check items, archived included. */
  checkItems: CheckItem[];
  onClose: () => void;
  onSave: (input: CheckWriteInput) => Promise<void>;
}

export default function TruckCheckModal({
  isOpen,
  isSaving,
  error,
  plateNumber,
  truckType,
  checkItems,
  onClose,
  onSave,
}: TruckCheckModalProps) {
  const items = checkItemsFor(checkItems, truckType);
  const [checkedAt, setCheckedAt] = useState(todayISO);
  const [results, setResults] = useState<CheckItems>({});
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    setCheckedAt(todayISO());
    setResults({});
    setNotes("");
  }, [isOpen]);

  useEscapeToClose(isOpen, onClose, isSaving);
  if (!isOpen) return null;

  const set = (key: string, result: CheckResult) =>
    setResults((current) => ({ ...current, [key]: result }));
  const markAllOk = () =>
    setResults(Object.fromEntries(items.map((item) => [item.key, "ok" as const])));
  const unanswered = items.filter((item) => !results[item.key]).length;
  const issues = items.filter((item) => results[item.key] === "issue").length;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (isSaving || unanswered > 0) return;
    await onSave({ checkedAt, items: results, notes });
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
        aria-labelledby="truck-check-title"
        className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-gray-200 bg-white p-6 shadow-xl"
      >
        <h2 id="truck-check-title" className="text-lg font-semibold text-gray-900">
          Monthly condition check · {plateNumber}
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Mark each item. Anything marked Issue shows on the maintenance board until the next check.
        </p>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-gray-700">Date checked</span>
              <input
                type="date"
                required
                value={checkedAt}
                max={todayISO()}
                onChange={(e) => setCheckedAt(e.target.value)}
                className={inputClass}
              />
            </label>
            <button
              type="button"
              onClick={markAllOk}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Mark all OK
            </button>
          </div>

          <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200">
            {items.map((item) => {
              const value = results[item.key];
              return (
                <li key={item.key} className="flex items-center justify-between gap-3 px-3 py-2">
                  <span className="text-sm text-gray-800">{item.label}</span>
                  <div role="radiogroup" aria-label={item.label} className="flex shrink-0 gap-1">
                    {(["ok", "issue"] as const).map((result) => {
                      const selected = value === result;
                      return (
                        <button
                          key={result}
                          type="button"
                          role="radio"
                          aria-checked={selected}
                          onClick={() => set(item.key, result)}
                          className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                            selected
                              ? result === "ok"
                                ? "bg-green-600 text-white"
                                : "bg-red-600 text-white"
                              : "border border-gray-200 text-gray-500 hover:bg-gray-50"
                          }`}
                        >
                          {result === "ok" ? "OK" : "Issue"}
                        </button>
                      );
                    })}
                  </div>
                </li>
              );
            })}
          </ul>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-gray-700">Notes</span>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={issues > 0 ? "Describe the issues found" : "Optional"}
              className={inputClass}
            />
          </label>

          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}

          <div className="flex items-center justify-between gap-2 pt-2">
            <p className="text-xs text-gray-500">
              {unanswered > 0 ? `${unanswered} item${unanswered === 1 ? "" : "s"} left` : issues > 0 ? `${issues} issue${issues === 1 ? "" : "s"} found` : "All OK"}
            </p>
            <div className="flex gap-2">
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
                disabled={isSaving || unanswered > 0}
                className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
              >
                {isSaving ? "Saving…" : "Save check"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
