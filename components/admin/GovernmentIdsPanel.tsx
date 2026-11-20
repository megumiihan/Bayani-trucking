"use client";

import { useRef, useState } from "react";
import {
  getGovernmentIdCardUrl,
  removeGovernmentIdCard,
  updateGovernmentIdNumbers,
  uploadGovernmentIdCard,
} from "@/lib/actions/governmentIds";
import {
  GOVERNMENT_ID_KINDS,
  ID_CARD_MAX_SIDE,
  formatGovernmentId,
  governmentIdMeta,
  type GovernmentIdKind,
  type GovernmentIds,
} from "@/lib/governmentIds";
import { resizeImageToFit } from "@/lib/resizeImage";

interface GovernmentIdsPanelProps {
  employeeId: string;
  initialIds: GovernmentIds;
}

const hasCardKey = {
  philhealth: "hasPhilhealthCard",
  sss: "hasSssCard",
} as const;

export default function GovernmentIdsPanel({ employeeId, initialIds }: GovernmentIdsPanelProps) {
  const [ids, setIds] = useState(initialIds);
  const [numbers, setNumbers] = useState({
    philhealth: initialIds.philhealthNumber ?? "",
    sss: initialIds.sssNumber ?? "",
  });
  const [isSavingNumbers, setIsSavingNumbers] = useState(false);
  const [numbersError, setNumbersError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const isDirty =
    numbers.philhealth !== (ids.philhealthNumber ?? "") || numbers.sss !== (ids.sssNumber ?? "");

  const handleSaveNumbers = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingNumbers(true);
    setNumbersError(null);
    const result = await updateGovernmentIdNumbers(employeeId, {
      philhealthNumber: numbers.philhealth,
      sssNumber: numbers.sss,
    });
    setIsSavingNumbers(false);
    if (!result.success) {
      setNumbersError(result.error);
      return;
    }
    setIds(result.ids);
    setNumbers({
      philhealth: result.ids.philhealthNumber ?? "",
      sss: result.ids.sssNumber ?? "",
    });
    setSavedAt(Date.now());
  };

  return (
    <section className="mb-8 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-gray-900">Government IDs</h2>
        <p className="text-sm text-gray-500">
          Regular employee benefits. Card photos are private and open through a one-minute link.
        </p>
      </div>

      <form onSubmit={handleSaveNumbers} className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {GOVERNMENT_ID_KINDS.map((kind) => (
          <div key={kind} className="rounded-lg border border-gray-100 bg-gray-50 p-4">
            <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
              {governmentIdMeta[kind].label} number
              <input
                type="text"
                inputMode="numeric"
                autoComplete="off"
                value={numbers[kind]}
                placeholder={governmentIdMeta[kind].placeholder}
                onChange={(e) => {
                  setNumbers((current) => ({
                    ...current,
                    [kind]: formatGovernmentId(kind, e.target.value),
                  }));
                  setNumbersError(null);
                  setSavedAt(null);
                }}
                className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 font-mono text-sm tracking-wide text-gray-900"
              />
            </label>
            <CardPhoto
              employeeId={employeeId}
              kind={kind}
              hasCard={ids[hasCardKey[kind]]}
              onChange={setIds}
            />
          </div>
        ))}

        <div className="flex items-center gap-3 md:col-span-2">
          <button
            type="submit"
            disabled={!isDirty || isSavingNumbers}
            className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
          >
            {isSavingNumbers ? "Saving…" : "Save numbers"}
          </button>
          {numbersError && <p className="text-sm text-red-600">{numbersError}</p>}
          {savedAt && !isDirty && <p className="text-sm text-green-700">Saved.</p>}
        </div>
      </form>
    </section>
  );
}

function CardPhoto({
  employeeId,
  kind,
  hasCard,
  onChange,
}: {
  employeeId: string;
  kind: GovernmentIdKind;
  hasCard: boolean;
  onChange: (ids: GovernmentIds) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<"upload" | "remove" | "view" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const label = governmentIdMeta[kind].label;

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    setBusy("upload");
    try {
      const blob = await resizeImageToFit(file, ID_CARD_MAX_SIDE);
      const formData = new FormData();
      formData.append("card", new File([blob], `${kind}.jpg`, { type: blob.type }));
      const result = await uploadGovernmentIdCard(employeeId, kind, formData);
      if (!result.success) setError(result.error);
      else onChange(result.ids);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not process that image.");
    } finally {
      setBusy(null);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleView = async () => {
    setError(null);
    // Open the tab synchronously so pop-up blockers allow it, then point it at the signed URL.
    const tab = window.open("", "_blank");
    setBusy("view");
    const result = await getGovernmentIdCardUrl(employeeId, kind);
    setBusy(null);
    if (!result.success) {
      tab?.close();
      setError(result.error);
      return;
    }
    if (tab) {
      tab.opener = null;
      tab.location.href = result.url;
    } else {
      window.location.href = result.url;
    }
  };

  const handleRemove = async () => {
    if (!window.confirm(`Delete the ${label} card photo? This cannot be undone.`)) return;
    setError(null);
    setBusy("remove");
    const result = await removeGovernmentIdCard(employeeId, kind);
    setBusy(null);
    if (!result.success) setError(result.error);
    else onChange(result.ids);
  };

  const buttonClass =
    "rounded-lg border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50";

  return (
    <div className="mt-3">
      <p className="mb-1.5 text-xs font-medium text-gray-600">{label} card photo</p>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      <div className="flex flex-wrap items-center gap-2">
        {hasCard ? (
          <>
            <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700">
              <span aria-hidden>✓</span> On file
            </span>
            <button type="button" disabled={busy !== null} onClick={handleView} className={buttonClass}>
              {busy === "view" ? "Opening…" : "View"}
            </button>
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => inputRef.current?.click()}
              className={buttonClass}
            >
              {busy === "upload" ? "Uploading…" : "Replace"}
            </button>
            <button
              type="button"
              disabled={busy !== null}
              onClick={handleRemove}
              className="rounded-lg px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              {busy === "remove" ? "Removing…" : "Remove"}
            </button>
          </>
        ) : (
          <>
            <span className="text-xs text-gray-400">None uploaded</span>
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => inputRef.current?.click()}
              className={buttonClass}
            >
              {busy === "upload" ? "Uploading…" : "Upload photo"}
            </button>
          </>
        )}
      </div>
      {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
    </div>
  );
}
