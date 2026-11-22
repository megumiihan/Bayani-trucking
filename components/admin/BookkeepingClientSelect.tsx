"use client";

import type { Client } from "@/lib/clients";
import { inputClass } from "@/components/ui/formStyles";

/** Select value meaning "type in a one-off client". */
export const OTHERS_CLIENT = "__others__";

interface BookkeepingClientSelectProps {
  clients: Client[];
  value: string;
  onChange: (value: string) => void;
}

/**
 * Regular clients first, then one-off clients already added through "Others",
 * then the "Others" entry itself.
 */
export default function BookkeepingClientSelect({ clients, value, onChange }: BookkeepingClientSelectProps) {
  const regular = clients.filter((c) => !c.isTemporary);
  const temporary = clients.filter((c) => c.isTemporary);
  return (
    <select required value={value} onChange={(e) => onChange(e.target.value)} className={inputClass}>
      <option value="">Select a client</option>
      {regular.map((client) => (
        <option key={client.id} value={client.id}>
          {client.name}
        </option>
      ))}
      {temporary.length > 0 && (
        <optgroup label="Other clients">
          {temporary.map((client) => (
            <option key={client.id} value={client.id}>
              {client.name}
            </option>
          ))}
        </optgroup>
      )}
      <option value={OTHERS_CLIENT}>Others (one-off client)…</option>
    </select>
  );
}
