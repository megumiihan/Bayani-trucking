"use client";

import { useState, type FormEvent } from "react";
import {
  createPlatformClient,
  updatePlatformRates,
} from "@/lib/actions/client";
import type { Client } from "@/lib/clients";
import {
  fractionToPercentInput,
  parsePercentToFraction,
} from "@/lib/platform";

interface PlatformRatesPanelProps {
  clients: Client[];
}

export default function PlatformRatesPanel({
  clients,
}: PlatformRatesPanelProps) {
  const [rows, setRows] = useState(clients);
  const [newName, setNewName] = useState("");
  const [newShare, setNewShare] = useState("20");
  const [newDriverRate, setNewDriverRate] = useState("17");
  const [newHelperRate, setNewHelperRate] = useState("12");
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault();
    const platformShare = parsePercentToFraction(newShare);
    const platformDriverRate = parsePercentToFraction(newDriverRate);
    const platformHelperRate = parsePercentToFraction(newHelperRate);
    if (
      platformShare == null ||
      platformDriverRate == null ||
      platformHelperRate == null
    ) {
      setCreateError("Enter percents between 0 and 100.");
      return;
    }

    setIsCreating(true);
    setCreateError(null);
    const result = await createPlatformClient({
      name: newName,
      platformShare,
      platformDriverRate,
      platformHelperRate,
    });
    setIsCreating(false);

    if (!result.success) {
      setCreateError(result.error);
      return;
    }

    setRows((current) =>
      [...current, result.client].sort((a, b) => a.name.localeCompare(b.name))
    );
    setNewName("");
    setNewShare("20");
    setNewDriverRate("17");
    setNewHelperRate("12");
  };

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-100 px-6 py-4">
        <h2 className="text-base font-semibold text-gray-900">
          Platform rates
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Each trip types a destination and a platform rate. Crew pay is (rate −
          rate × platform share) × driver or helper percent. Changing these
          updates new trips, not past payout snapshots.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-100 text-sm">
          <thead className="bg-gray-50">
            <tr>
              {["Client", "Platform share %", "Driver %", "Helper %", ""].map(
                (col) => (
                  <th
                    key={col || "actions"}
                    className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                  >
                    {col}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                  No platform clients yet.
                </td>
              </tr>
            ) : (
              rows.map((client) => (
                <PlatformRateRow
                  key={client.id}
                  client={client}
                  onSaved={(updated) =>
                    setRows((current) =>
                      current.map((row) =>
                        row.id === updated.id ? updated : row
                      )
                    )
                  }
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      <form
        onSubmit={handleCreate}
        className="grid grid-cols-1 gap-3 border-t border-gray-100 px-4 py-4 sm:grid-cols-5"
      >
        <input
          type="text"
          required
          placeholder="New platform client"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          className={inputClass}
        />
        <input
          type="number"
          inputMode="decimal"
          min="0"
          max="100"
          step="0.01"
          required
          value={newShare}
          onChange={(e) => setNewShare(e.target.value)}
          className={inputClass}
          aria-label="Platform share percent"
        />
        <input
          type="number"
          inputMode="decimal"
          min="0"
          max="100"
          step="0.01"
          required
          value={newDriverRate}
          onChange={(e) => setNewDriverRate(e.target.value)}
          className={inputClass}
          aria-label="Driver percent"
        />
        <input
          type="number"
          inputMode="decimal"
          min="0"
          max="100"
          step="0.01"
          required
          value={newHelperRate}
          onChange={(e) => setNewHelperRate(e.target.value)}
          className={inputClass}
          aria-label="Helper percent"
        />
        <button
          type="submit"
          disabled={isCreating}
          className="rounded-lg bg-blue-700 px-3 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-50"
        >
          {isCreating ? "Adding…" : "Add client"}
        </button>
        {createError && (
          <p
            role="alert"
            className="sm:col-span-5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
          >
            {createError}
          </p>
        )}
      </form>
    </div>
  );
}

function PlatformRateRow({
  client,
  onSaved,
}: {
  client: Client;
  onSaved: (client: Client) => void;
}) {
  const [share, setShare] = useState(fractionToPercentInput(client.platformShare));
  const [driverRate, setDriverRate] = useState(
    fractionToPercentInput(client.platformDriverRate)
  );
  const [helperRate, setHelperRate] = useState(
    fractionToPercentInput(client.platformHelperRate)
  );
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    const platformShare = parsePercentToFraction(share);
    const platformDriverRate = parsePercentToFraction(driverRate);
    const platformHelperRate = parsePercentToFraction(helperRate);
    if (
      platformShare == null ||
      platformDriverRate == null ||
      platformHelperRate == null
    ) {
      setError("Enter percents between 0 and 100.");
      return;
    }

    setIsSaving(true);
    setError(null);
    const result = await updatePlatformRates({
      id: client.id,
      platformShare,
      platformDriverRate,
      platformHelperRate,
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
          max="100"
          step="0.01"
          value={share}
          onChange={(e) => setShare(e.target.value)}
          className={inputClass}
          aria-label={`${client.name} platform share`}
        />
      </td>
      <td className="px-4 py-3">
        <input
          type="number"
          inputMode="decimal"
          min="0"
          max="100"
          step="0.01"
          value={driverRate}
          onChange={(e) => setDriverRate(e.target.value)}
          className={inputClass}
          aria-label={`${client.name} driver rate`}
        />
      </td>
      <td className="px-4 py-3">
        <input
          type="number"
          inputMode="decimal"
          min="0"
          max="100"
          step="0.01"
          value={helperRate}
          onChange={(e) => setHelperRate(e.target.value)}
          className={inputClass}
          aria-label={`${client.name} helper rate`}
        />
      </td>
      <td className="px-4 py-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="rounded-md bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50"
        >
          {isSaving ? "Saving…" : "Save"}
        </button>
        {error && <p className="mt-1 text-xs text-red-700">{error}</p>}
      </td>
    </tr>
  );
}

const inputClass =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20";
