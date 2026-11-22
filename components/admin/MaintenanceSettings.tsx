"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  removeCheckItem,
  removeMaintenanceType,
  saveCheckItem,
  saveMaintenanceType,
} from "@/lib/actions/truck";
import {
  MAX_INTERVAL_MONTHS,
  REPAIR_TYPE_KEY,
  type CheckItem,
  type MaintenanceConfig,
  type MaintenanceType,
} from "@/lib/truckMaintenance";

interface MaintenanceSettingsProps {
  config: MaintenanceConfig;
}

const fieldClass =
  "w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus-visible:border-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/20";
const primaryButton =
  "rounded-md bg-blue-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-800 disabled:opacity-50";
const secondaryButton =
  "rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50";

/**
 * Admin editor for the maintenance schedule and the monthly checklist.
 * Changes apply to every truck. Removing an entry archives it so history keeps its label.
 */
export default function MaintenanceSettings({ config: initialConfig }: MaintenanceSettingsProps) {
  const router = useRouter();
  const [config, setConfig] = useState(initialConfig);
  const types = config.types.filter((type) => !type.archived);
  const checkItems = config.checkItems.filter((item) => !item.archived);

  const applied = (next: MaintenanceConfig) => {
    setConfig(next);
    // The maintenance board above is worked out from these settings.
    router.refresh();
  };

  return (
    <section className="mt-8 rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-100 px-6 py-4">
        <h2 className="text-base font-semibold text-gray-900">Maintenance settings</h2>
        <p className="text-sm text-gray-500">
          Applies to every truck. Removed entries disappear from the forms and the board; past records keep their names.
        </p>
      </div>
      <div className="grid grid-cols-1 divide-y divide-gray-100 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] xl:divide-x xl:divide-y-0">
        <TypesPanel types={types} onChange={applied} />
        <CheckItemsPanel items={checkItems} onChange={applied} />
      </div>
    </section>
  );
}

// ─── Maintenance types ──────────────────────────────────────────────────────

interface TypeDraft {
  key?: string;
  label: string;
  interval: string;
  mandatory: boolean;
  reeferOnly: boolean;
}

const emptyTypeDraft: TypeDraft = { label: "", interval: "6", mandatory: true, reeferOnly: false };

function toTypeDraft(type: MaintenanceType): TypeDraft {
  return {
    key: type.key,
    label: type.label,
    interval: type.intervalMonths == null ? "" : String(type.intervalMonths),
    mandatory: type.mandatory,
    reeferOnly: type.reeferOnly,
  };
}

function TypesPanel({
  types,
  onChange,
}: {
  types: MaintenanceType[];
  onChange: (config: MaintenanceConfig) => void;
}) {
  // null = nothing open; draft without key = adding.
  const [draft, setDraft] = useState<TypeDraft | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const open = (next: TypeDraft) => {
    setError(null);
    setDraft(next);
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!draft || isSaving) return;
    const interval = draft.interval.trim() === "" ? null : Number(draft.interval);
    setIsSaving(true);
    setError(null);
    const result = await saveMaintenanceType({
      key: draft.key,
      label: draft.label,
      intervalMonths: interval,
      mandatory: draft.mandatory,
      reeferOnly: draft.reeferOnly,
    });
    setIsSaving(false);
    if (!result.success) return setError(result.error);
    setDraft(null);
    onChange(result.config);
  };

  const remove = async (type: MaintenanceType) => {
    if (
      !window.confirm(
        `Remove "${type.label}" for all trucks? It leaves the schedule and the repair form. Repairs already logged keep it.`
      )
    )
      return;
    setError(null);
    const result = await removeMaintenanceType(type.key);
    if (!result.success) return setError(result.error);
    if (draft?.key === type.key) setDraft(null);
    onChange(result.config);
  };

  return (
    <div className="p-6">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Maintenance types</h3>
          <p className="text-xs text-gray-500">Each repeats this many months after it was last logged.</p>
        </div>
        {!(draft && draft.key === undefined) && (
          <button type="button" onClick={() => open(emptyTypeDraft)} className={secondaryButton}>
            + Add type
          </button>
        )}
      </div>

      <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200">
        {types.map((type) =>
          draft?.key === type.key ? (
            <li key={type.key} className="bg-blue-50/40 p-3">
              <TypeForm
                draft={draft}
                isRepair={type.key === REPAIR_TYPE_KEY}
                isSaving={isSaving}
                onChange={setDraft}
                onSubmit={save}
                onCancel={() => setDraft(null)}
              />
            </li>
          ) : (
            <li key={type.key} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2.5">
              <span className="min-w-0 flex-1 text-sm font-medium text-gray-900">{type.label}</span>
              <span className="text-xs tabular-nums text-gray-600">
                {type.intervalMonths == null
                  ? "Unscheduled"
                  : `Every ${type.intervalMonths} mo${type.intervalMonths === 1 ? "" : "s"}`}
              </span>
              {type.intervalMonths != null && (
                <span
                  className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                    type.mandatory ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {type.mandatory ? "Required" : "Check"}
                </span>
              )}
              {type.reeferOnly && (
                <span className="rounded bg-sky-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-sky-800">
                  Reefer only
                </span>
              )}
              <span className="flex gap-3 text-xs">
                <button
                  type="button"
                  onClick={() => open(toTypeDraft(type))}
                  className="font-medium text-blue-700 hover:underline"
                >
                  Edit
                </button>
                {type.key !== REPAIR_TYPE_KEY && (
                  <button
                    type="button"
                    onClick={() => remove(type)}
                    className="text-gray-400 hover:text-red-600"
                  >
                    Remove
                  </button>
                )}
              </span>
            </li>
          )
        )}
        {draft && draft.key === undefined && (
          <li className="bg-blue-50/40 p-3">
            <TypeForm
              draft={draft}
              isRepair={false}
              isSaving={isSaving}
              onChange={setDraft}
              onSubmit={save}
              onCancel={() => setDraft(null)}
            />
          </li>
        )}
      </ul>
      {error && (
        <p role="alert" className="mt-2 text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}

function TypeForm({
  draft,
  isRepair,
  isSaving,
  onChange,
  onSubmit,
  onCancel,
}: {
  draft: TypeDraft;
  isRepair: boolean;
  isSaving: boolean;
  onChange: (draft: TypeDraft) => void;
  onSubmit: (event: FormEvent) => void;
  onCancel: () => void;
}) {
  const scheduled = draft.interval.trim() !== "";
  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_9rem]">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-gray-700">Name</span>
          <input
            autoFocus
            required
            maxLength={80}
            value={draft.label}
            onChange={(e) => onChange({ ...draft, label: e.target.value })}
            placeholder="e.g. Wheel alignment"
            className={fieldClass}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-gray-700">Every (months)</span>
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={MAX_INTERVAL_MONTHS}
            step={1}
            disabled={isRepair}
            value={isRepair ? "" : draft.interval}
            onChange={(e) => onChange({ ...draft, interval: e.target.value })}
            placeholder="Unscheduled"
            className={`${fieldClass} disabled:bg-gray-50 disabled:text-gray-400`}
          />
        </label>
      </div>
      {!isRepair && (
        <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-gray-700">
          <label className={`inline-flex items-center gap-2 ${scheduled ? "" : "text-gray-400"}`}>
            <input
              type="checkbox"
              disabled={!scheduled}
              checked={scheduled && draft.mandatory}
              onChange={(e) => onChange({ ...draft, mandatory: e.target.checked })}
              className="h-4 w-4 rounded border-gray-300"
            />
            Required when overdue
          </label>
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={draft.reeferOnly}
              onChange={(e) => onChange({ ...draft, reeferOnly: e.target.checked })}
              className="h-4 w-4 rounded border-gray-300"
            />
            Reefer trucks only
          </label>
        </div>
      )}
      <p className="text-xs text-gray-500">
        {isRepair
          ? "One-off repairs are never due, so they have no period."
          : scheduled
            ? "Leave the period empty for a one-off type that's never due."
            : "No period: this type is logged as needed and never shows as due."}
      </p>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} disabled={isSaving} className={secondaryButton}>
          Cancel
        </button>
        <button type="submit" disabled={isSaving || !draft.label.trim()} className={primaryButton}>
          {isSaving ? "Saving…" : draft.key ? "Save" : "Add type"}
        </button>
      </div>
    </form>
  );
}

// ─── Monthly check items ────────────────────────────────────────────────────

function CheckItemsPanel({
  items,
  onChange,
}: {
  items: CheckItem[];
  onChange: (config: MaintenanceConfig) => void;
}) {
  const [editing, setEditing] = useState<{ key: string; label: string; reeferOnly: boolean } | null>(null);
  const [newLabel, setNewLabel] = useState("");
  const [newReefer, setNewReefer] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const add = async (event: FormEvent) => {
    event.preventDefault();
    if (isSaving || !newLabel.trim()) return;
    setIsSaving(true);
    setError(null);
    const result = await saveCheckItem({ label: newLabel, reeferOnly: newReefer });
    setIsSaving(false);
    if (!result.success) return setError(result.error);
    setNewLabel("");
    setNewReefer(false);
    onChange(result.config);
  };

  const saveEdit = async (event: FormEvent) => {
    event.preventDefault();
    if (!editing || isSaving) return;
    setIsSaving(true);
    setError(null);
    const result = await saveCheckItem(editing);
    setIsSaving(false);
    if (!result.success) return setError(result.error);
    setEditing(null);
    onChange(result.config);
  };

  const remove = async (item: CheckItem) => {
    if (
      !window.confirm(
        `Remove "${item.label}" from the monthly check for all trucks? Past checks keep their results.`
      )
    )
      return;
    setError(null);
    const result = await removeCheckItem(item.key);
    if (!result.success) return setError(result.error);
    if (editing?.key === item.key) setEditing(null);
    onChange(result.config);
  };

  return (
    <div className="p-6">
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-gray-900">Monthly condition checks</h3>
        <p className="text-xs text-gray-500">Each item is marked OK or Issue when a truck is checked.</p>
      </div>

      <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200">
        {items.length === 0 && (
          <li className="px-3 py-4 text-center text-sm text-gray-500">No checks yet. Add one below.</li>
        )}
        {items.map((item) =>
          editing?.key === item.key ? (
            <li key={item.key} className="bg-blue-50/40 p-3">
              <form onSubmit={saveEdit} className="space-y-2">
                <input
                  autoFocus
                  required
                  maxLength={80}
                  aria-label="Check name"
                  value={editing.label}
                  onChange={(e) => setEditing({ ...editing, label: e.target.value })}
                  className={fieldClass}
                />
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={editing.reeferOnly}
                      onChange={(e) => setEditing({ ...editing, reeferOnly: e.target.checked })}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    Reefer trucks only
                  </label>
                  <span className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setEditing(null)}
                      disabled={isSaving}
                      className={secondaryButton}
                    >
                      Cancel
                    </button>
                    <button type="submit" disabled={isSaving || !editing.label.trim()} className={primaryButton}>
                      {isSaving ? "Saving…" : "Save"}
                    </button>
                  </span>
                </div>
              </form>
            </li>
          ) : (
            <li key={item.key} className="flex items-center gap-3 px-3 py-2">
              <span className="min-w-0 flex-1 text-sm text-gray-800">{item.label}</span>
              {item.reeferOnly && (
                <span className="rounded bg-sky-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-sky-800">
                  Reefer only
                </span>
              )}
              <span className="flex gap-3 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setEditing({ key: item.key, label: item.label, reeferOnly: item.reeferOnly });
                  }}
                  className="font-medium text-blue-700 hover:underline"
                >
                  Edit
                </button>
                <button type="button" onClick={() => remove(item)} className="text-gray-400 hover:text-red-600">
                  Remove
                </button>
              </span>
            </li>
          )
        )}
      </ul>

      <form onSubmit={add} className="mt-3 space-y-2">
        <div className="flex gap-2">
          <input
            maxLength={80}
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="New check, e.g. Seatbelts"
            aria-label="New check name"
            className={fieldClass}
          />
          <button type="submit" disabled={isSaving || !newLabel.trim()} className={`${primaryButton} shrink-0`}>
            Add
          </button>
        </div>
        <label className="inline-flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={newReefer}
            onChange={(e) => setNewReefer(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300"
          />
          Reefer trucks only
        </label>
      </form>
      {error && (
        <p role="alert" className="mt-2 text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
