"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { saveTruckDocument } from "@/lib/actions/truck";
import { resizeImageToFit } from "@/lib/resizeImage";
import {
  TRUCK_CERTIFICATE_MAX_BYTES,
  TRUCK_CERTIFICATE_MAX_SIDE,
  truckDocumentLabel,
} from "@/lib/truckMaintenance";
import type { TruckDocumentUi } from "@/lib/truckRecords";
import { inputClass } from "@/components/ui/formStyles";
import { useEscapeToClose } from "@/components/ui/useEscapeToClose";

interface TruckDocumentModalProps {
  /** Document type key being edited; null = closed. */
  docType: string | null;
  truckId: string;
  plateNumber: string;
  /** Saved record for this type, if any. */
  document: TruckDocumentUi | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function TruckDocumentModal({
  docType,
  truckId,
  plateNumber,
  document,
  onClose,
  onSaved,
}: TruckDocumentModalProps) {
  const isOpen = docType !== null;
  const inputRef = useRef<HTMLInputElement>(null);
  const [dueDate, setDueDate] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setDueDate(document?.renewalDueDate ?? "");
    setFile(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  }, [isOpen, document]);

  useEscapeToClose(isOpen, onClose, isSaving);
  if (!isOpen) return null;

  const label = truckDocumentLabel(docType);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (isSaving || !dueDate) return;
    setError(null);
    setIsSaving(true);
    try {
      const formData = new FormData();
      formData.append("renewalDueDate", dueDate);
      if (file) {
        let upload: Blob = file;
        if (file.type.startsWith("image/")) {
          upload = await resizeImageToFit(file, TRUCK_CERTIFICATE_MAX_SIDE);
        } else if (file.type !== "application/pdf") {
          setError("Choose a PDF or a photo.");
          return;
        }
        if (upload.size > TRUCK_CERTIFICATE_MAX_BYTES) {
          setError("File is too large (3.5 MB max). Try a smaller scan or a photo.");
          return;
        }
        const name = upload === file ? file.name : file.name.replace(/\.[^.]+$/, "") + ".jpg";
        formData.append("file", new File([upload], name, { type: upload.type }));
        formData.append("name", file.name);
      }
      const result = await saveTruckDocument(truckId, docType, formData);
      if (!result.success) {
        setError(result.error);
        return;
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the document.");
    } finally {
      setIsSaving(false);
    }
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
        aria-labelledby="truck-document-title"
        className="relative w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-xl"
      >
        <h2 id="truck-document-title" className="text-lg font-semibold text-gray-900">
          {label} · {plateNumber}
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          The renewal shows on the maintenance board 30 days before it&apos;s due.
        </p>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-gray-700">Renewal due date</span>
            <input
              type="date"
              required
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className={inputClass}
            />
          </label>

          <div>
            <span className="mb-1.5 block text-sm font-medium text-gray-700">
              File <span className="font-normal text-gray-400">(PDF or photo, optional)</span>
            </span>
            <input
              ref={inputRef}
              type="file"
              accept="application/pdf,image/*"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={isSaving}
              className="w-full truncate rounded-lg border border-dashed border-gray-300 px-3 py-3 text-left text-sm text-gray-600 hover:border-blue-400 hover:bg-blue-50/40 disabled:opacity-50"
            >
              {file
                ? file.name
                : document?.hasFile
                  ? `Replace ${document.fileName ?? "current file"}`
                  : "Choose a file"}
            </button>
          </div>

          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
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
              disabled={isSaving || !dueDate}
              className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
            >
              {isSaving ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
