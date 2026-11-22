"use client";

import { useState, type FormEvent } from "react";
import { createRateClient } from "@/lib/actions/route";
import type { Client } from "@/lib/clients";
import { inputClass } from "@/components/ui/formStyles";

interface AddRateClientFormProps {
  calcType: "DESTINATION" | "WEIGHT";
  onCreated: (client: Client) => void;
}

/** Inline "new client" form for destination- and weight-based rate panels. */
export default function AddRateClientForm({
  calcType,
  onCreated,
}: AddRateClientFormProps) {
  const [name, setName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const label =
    calcType === "WEIGHT" ? "New weight-based client" : "New destination-based client";

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setIsSaving(true);
    setError(null);
    const result = await createRateClient({ name, calcType });
    setIsSaving(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setName("");
    onCreated(result.client);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="grid grid-cols-1 gap-3 border-t border-slate-100 px-5 py-4 sm:grid-cols-4 sm:px-6"
    >
      <label className="block sm:col-span-3">
        <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">
          {label}
        </span>
        <input
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Client name"
          className={inputClass}
        />
      </label>
      <div className="flex items-end">
        <button
          type="submit"
          disabled={isSaving}
          className="w-full rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
        >
          {isSaving ? "Adding…" : "Add client"}
        </button>
      </div>
      {error && (
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 sm:col-span-4"
        >
          {error}
        </p>
      )}
    </form>
  );
}
