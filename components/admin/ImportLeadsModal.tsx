"use client";

import { useEffect, useState, type ChangeEvent } from "react";
import * as XLSX from "xlsx";
import {
  LEAD_SOURCES,
  LEAD_TYPES,
  type LeadSource,
  type LeadType,
  type LeadWriteInput,
} from "@/lib/leads";
import { useEscapeToClose } from "@/components/ui/useEscapeToClose";

type ImportRow = Partial<LeadWriteInput>;

interface ImportLeadsModalProps {
  isOpen: boolean;
  isSaving: boolean;
  error: string | null;
  onClose: () => void;
  onImport: (rows: ImportRow[]) => Promise<void>;
}

// Header aliases → lead field. Matching ignores case, spaces and punctuation.
const HEADER_MAP: Record<string, keyof LeadWriteInput> = {
  company: "companyName",
  companyname: "companyName",
  business: "companyName",
  name: "companyName",
  contact: "contactPerson",
  contactperson: "contactPerson",
  owner: "contactPerson",
  phone: "phone",
  mobile: "phone",
  contactnumber: "phone",
  email: "email",
  emailaddress: "email",
  website: "website",
  facebook: "facebookUrl",
  facebookpage: "facebookUrl",
  fb: "facebookUrl",
  municipality: "municipality",
  city: "municipality",
  town: "municipality",
  province: "province",
  industry: "industry",
  type: "type",
  source: "source",
  notes: "notes",
};

function normalizeHeader(header: string) {
  return header.toLowerCase().replace(/[^a-z]/g, "");
}

function toRows(sheet: XLSX.WorkSheet): ImportRow[] {
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
  return raw.map((record) => {
    const row: ImportRow = {};
    for (const [header, value] of Object.entries(record)) {
      const field = HEADER_MAP[normalizeHeader(header)];
      if (!field) continue;
      const text = String(value ?? "").trim();
      if (field === "type") {
        const upper = text.toUpperCase().replace(/[\s-]+/g, "_");
        if ((LEAD_TYPES as readonly string[]).includes(upper)) row.type = upper as LeadType;
        else if (/move|moving|lipat/i.test(text)) row.type = "ONE_TIME_MOVE";
      } else if (field === "source") {
        const upper = text.toUpperCase().replace(/[\s-]+/g, "_");
        if ((LEAD_SOURCES as readonly string[]).includes(upper)) row.source = upper as LeadSource;
        else if (/facebook|fb/i.test(text)) row.source = "FACEBOOK_SEARCH";
        else if (/web/i.test(text)) row.source = "WEBSITE";
      } else {
        (row as Record<string, string>)[field] = text;
      }
    }
    return row;
  });
}

export default function ImportLeadsModal({
  isOpen,
  isSaving,
  error,
  onClose,
  onImport,
}: ImportLeadsModalProps) {
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    setRows([]);
    setFileError(null);
    setFileName("");
  }, [isOpen]);

  useEscapeToClose(isOpen, onClose, isSaving);
  if (!isOpen) return null;

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setFileError(null);
    try {
      const workbook = XLSX.read(await file.arrayBuffer());
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const parsed = toRows(sheet).filter((r) => r.companyName);
      if (parsed.length === 0) {
        setFileError("No rows with a company name were found. Check the header row.");
      }
      setRows(parsed);
    } catch {
      setFileError("Couldn't read that file. Save it as .csv or .xlsx and try again.");
      setRows([]);
    }
  };

  const valid = rows.filter((r) => r.companyName);

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
        aria-labelledby="import-leads-title"
        className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-gray-200 bg-white p-6 shadow-xl"
      >
        <h2 id="import-leads-title" className="text-lg font-semibold text-gray-900">
          Import leads
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Upload a .csv or .xlsx with a header row. Recognised columns: Company, Contact person,
          Phone, Email, Website, Facebook, Municipality, Province, Industry, Type, Source, Notes.
          Companies already in the list are skipped.
        </p>

        <label className="mt-5 block">
          <span className="sr-only">Choose file</span>
          <input
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={handleFile}
            className="block w-full text-sm text-gray-700 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-blue-700 hover:file:bg-blue-100"
          />
        </label>
        {fileName && !fileError && (
          <p className="mt-2 text-sm text-gray-600">
            {valid.length} row{valid.length === 1 ? "" : "s"} ready from {fileName}
          </p>
        )}

        {valid.length > 0 && (
          <div className="mt-4 max-h-56 overflow-auto rounded-lg border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-3 py-2">Company</th>
                  <th className="px-3 py-2">Phone</th>
                  <th className="px-3 py-2">Email</th>
                  <th className="px-3 py-2">Province</th>
                </tr>
              </thead>
              <tbody>
                {valid.slice(0, 50).map((r, i) => (
                  <tr key={i} className="border-t border-slate-100">
                    <td className="px-3 py-1.5">{r.companyName}</td>
                    <td className="px-3 py-1.5">{r.phone}</td>
                    <td className="px-3 py-1.5">{r.email}</td>
                    <td className="px-3 py-1.5">{r.province}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {(fileError || error) && (
          <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {fileError ?? error}
          </p>
        )}

        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onImport(valid)}
            disabled={isSaving || valid.length === 0}
            className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            {isSaving ? "Importing…" : `Import ${valid.length || ""} leads`}
          </button>
        </div>
      </div>
    </div>
  );
}
