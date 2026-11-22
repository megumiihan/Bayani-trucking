"use client";

import Link from "next/link";
import { useState } from "react";
import type { Client } from "@/lib/clients";
import type { Supplier } from "@/lib/suppliers";
import ClientsDirectoryPanel from "@/components/admin/ClientsDirectoryPanel";
import SuppliersDirectoryPanel from "@/components/admin/SuppliersDirectoryPanel";
import PageHeader from "@/components/ui/PageHeader";

export type DirectoryTab = "clients" | "suppliers";

const TABS: { value: DirectoryTab; label: string }[] = [
  { value: "clients", label: "Clients" },
  { value: "suppliers", label: "Suppliers" },
];

interface AdminDirectoryProps {
  initialTab: DirectoryTab;
  clients: Client[];
  suppliers: Supplier[];
}

export default function AdminDirectory({ initialTab, clients, suppliers }: AdminDirectoryProps) {
  const [tab, setTab] = useState<DirectoryTab>(initialTab);

  const selectTab = (next: DirectoryTab) => {
    setTab(next);
    const url = next === "clients" ? window.location.pathname : `${window.location.pathname}?tab=${next}`;
    window.history.replaceState(null, "", url);
  };

  return (
    <div>
      <Link
        href="/admin/bookkeeping"
        className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-900"
      >
        <span aria-hidden>←</span> Bookkeeping
      </Link>
      <PageHeader
        title="Clients & suppliers"
        description="Registered names, addresses and TINs used on billables, collection receipts, expenses and disbursements."
      />

      <div
        role="tablist"
        aria-label="Directory"
        className="mb-4 inline-flex gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1"
      >
        {TABS.map(({ value, label }) => {
          const isActive = tab === value;
          return (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => selectTab(value)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 ${
                isActive ? "bg-white text-blue-700 shadow-sm" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Both stay mounted so a search or edit in one tab survives switching. */}
      <div role="tabpanel" hidden={tab !== "clients"}>
        <ClientsDirectoryPanel initialClients={clients} />
      </div>
      <div role="tabpanel" hidden={tab !== "suppliers"}>
        <SuppliersDirectoryPanel initialSuppliers={suppliers} />
      </div>
    </div>
  );
}
