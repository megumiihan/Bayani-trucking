"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { BillableUi, CollectionReceiptUi } from "@/lib/bookkeeping";
import {
  clientInitials,
  summarizeClientCollections,
  type ClientCollectionSummary,
} from "@/lib/clientCollections";
import { getCalculationTypeLabel, type CalculationType, type Client } from "@/lib/clients";
import { formatCurrency } from "@/lib/mockData";
import { formatShortDate } from "@/lib/truckMaintenance";
import ClientDetailsModal from "@/components/admin/ClientDetailsModal";
import Badge from "@/components/ui/Badge";
import EmptyState from "@/components/ui/EmptyState";
import PageHeader from "@/components/ui/PageHeader";

interface AdminClientsOverviewProps {
  initialClients: Client[];
  billables: BillableUi[];
  receipts: CollectionReceiptUi[];
}

type ViewMode = "grid" | "list";
type SortKey = "name" | "billing" | "collected" | "outstanding" | "lastCollected";
type SortDir = "asc" | "desc";

interface ClientRow {
  client: Client;
  summary: ClientCollectionSummary;
}

const VIEW_STORAGE_KEY = "clients-overview-view";

export const billingStyles: Record<CalculationType, { header: string; badge: string }> = {
  Destination: { header: "bg-blue-700", badge: "bg-blue-100 text-blue-800" },
  Weight: { header: "bg-sky-500", badge: "bg-sky-100 text-sky-800" },
  Livestock: { header: "bg-emerald-600", badge: "bg-emerald-100 text-emerald-800" },
  Platform: { header: "bg-violet-600", badge: "bg-violet-100 text-violet-800" },
};

const displayName = (client: Client) => client.legalName || client.name;

export default function AdminClientsOverview({
  initialClients,
  billables,
  receipts,
}: AdminClientsOverviewProps) {
  const [clients, setClients] = useState(initialClients);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [view, setView] = useState<ViewMode>("grid");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({ key: "name", dir: "asc" });

  useEffect(() => {
    try {
      const saved = localStorage.getItem(VIEW_STORAGE_KEY);
      if (saved === "grid" || saved === "list") setView(saved);
    } catch {
      // Storage unavailable; keep the default view.
    }
  }, []);

  const changeView = (next: ViewMode) => {
    setView(next);
    try {
      localStorage.setItem(VIEW_STORAGE_KEY, next);
    } catch {
      // Ignore.
    }
  };

  const rows = useMemo<ClientRow[]>(
    () =>
      clients.map((client) => ({
        client,
        summary: summarizeClientCollections(
          billables.filter((b) => b.clientId === client.id),
          receipts.filter((r) => r.clientId === client.id),
        ),
      })),
    [clients, billables, receipts],
  );

  const totals = useMemo(
    () => ({
      collected: rows.reduce((sum, r) => sum + r.summary.collected, 0),
      outstanding: rows.reduce((sum, r) => sum + r.summary.outstanding, 0),
      unpaid: rows.reduce((sum, r) => sum + r.summary.unpaidCount, 0),
    }),
    [rows],
  );

  const visibleRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? rows.filter(({ client }) =>
          [client.name, client.legalName, client.address, client.tin, client.calculationType]
            .some((v) => v?.toLowerCase().includes(q)),
        )
      : rows;

    const byName = (a: ClientRow, b: ClientRow) =>
      displayName(a.client).localeCompare(displayName(b.client));

    const compare = (a: ClientRow, b: ClientRow): number => {
      switch (sort.key) {
        case "name":
          return byName(a, b);
        case "billing":
          return a.client.calculationType.localeCompare(b.client.calculationType) || byName(a, b);
        case "collected":
          return a.summary.collected - b.summary.collected || byName(a, b);
        case "outstanding":
          return a.summary.outstanding - b.summary.outstanding || byName(a, b);
        case "lastCollected":
          return (a.summary.lastCollectedOn ?? "").localeCompare(b.summary.lastCollectedOn ?? "") || byName(a, b);
      }
    };

    const sign = sort.dir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => sign * compare(a, b));
  }, [rows, query, sort]);

  const toggleSort = (key: SortKey) =>
    setSort((current) =>
      current.key === key
        ? { key, dir: current.dir === "asc" ? "desc" : "asc" }
        : { key, dir: key === "name" || key === "billing" ? "asc" : "desc" },
    );

  return (
    <div>
      <PageHeader
        title="Client Overview"
        description="Clients at a glance. Open a client for their registered details and collections."
        actions={
          <>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search clients…"
              aria-label="Search clients"
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 sm:w-56"
            />
            <ViewToggle view={view} onChange={changeView} />
            <button
              type="button"
              onClick={() => setIsAddOpen(true)}
              className="rounded-lg bg-blue-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-800"
            >
              Add client
            </button>
          </>
        }
      />

      <ClientDetailsModal
        isOpen={isAddOpen}
        client={null}
        onClose={() => setIsAddOpen(false)}
        onSaved={(saved) => {
          setClients((list) => [...list, saved]);
          setIsAddOpen(false);
        }}
      />

      <p className="mb-4 text-sm text-gray-500 tabular-nums">
        <span className="font-medium text-green-700">{formatCurrency(totals.collected)}</span> collected
        {" · "}
        <span className={totals.outstanding > 0 ? "font-medium text-amber-700" : "font-medium text-gray-700"}>
          {formatCurrency(totals.outstanding)}
        </span>{" "}
        outstanding across {totals.unpaid} unpaid {totals.unpaid === 1 ? "invoice" : "invoices"}
      </p>

      {visibleRows.length === 0 ? (
        <EmptyState
          icon={<BuildingIcon />}
          title={query ? "No matching clients" : "No clients yet"}
          description={query ? `Nothing matches “${query}”.` : "Clients you add will appear here."}
        />
      ) : view === "grid" ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {visibleRows.map((row) => (
            <ClientCard key={row.client.id} {...row} />
          ))}
        </div>
      ) : (
        <ClientTable rows={visibleRows} sort={sort} onSort={toggleSort} />
      )}
    </div>
  );
}

function ViewToggle({ view, onChange }: { view: ViewMode; onChange: (view: ViewMode) => void }) {
  const base = "flex h-9 w-10 items-center justify-center text-gray-600 transition-colors";
  const active = "bg-gray-100 text-gray-900 shadow-inner";
  return (
    <div role="group" aria-label="View mode" className="flex overflow-hidden rounded-lg border border-gray-300 bg-white shadow-sm">
      <button
        type="button"
        aria-label="Grid view"
        aria-pressed={view === "grid"}
        onClick={() => onChange("grid")}
        className={`${base} ${view === "grid" ? active : "hover:bg-gray-50"}`}
      >
        <svg viewBox="0 0 16 16" className="h-4 w-4" fill="currentColor" aria-hidden>
          <rect x="1" y="1" width="6" height="6" rx="1" />
          <rect x="9" y="1" width="6" height="6" rx="1" />
          <rect x="1" y="9" width="6" height="6" rx="1" />
          <rect x="9" y="9" width="6" height="6" rx="1" />
        </svg>
      </button>
      <button
        type="button"
        aria-label="List view"
        aria-pressed={view === "list"}
        onClick={() => onChange("list")}
        className={`${base} border-l border-gray-300 ${view === "list" ? active : "hover:bg-gray-50"}`}
      >
        <svg viewBox="0 0 16 16" className="h-4 w-4" fill="currentColor" aria-hidden>
          <rect x="1" y="2" width="2" height="2" rx="0.5" />
          <rect x="5" y="2" width="10" height="2" rx="0.5" />
          <rect x="1" y="7" width="2" height="2" rx="0.5" />
          <rect x="5" y="7" width="10" height="2" rx="0.5" />
          <rect x="1" y="12" width="2" height="2" rx="0.5" />
          <rect x="5" y="12" width="10" height="2" rx="0.5" />
        </svg>
      </button>
    </div>
  );
}

export function ClientMonogram({
  client,
  size,
  className = "",
}: {
  client: Client;
  size: number;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      style={{ width: size, height: size, fontSize: size * 0.36 }}
      className={`flex shrink-0 items-center justify-center rounded-full bg-white font-bold text-slate-700 shadow-sm ring-1 ring-slate-200 ${className}`}
    >
      {clientInitials(displayName(client))}
    </span>
  );
}

function ClientCard({ client, summary }: ClientRow) {
  const styles = billingStyles[client.calculationType];
  return (
    <Link
      href={`/admin/clients/${client.id}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
    >
      <div className={`h-16 ${styles.header}`} />
      <div className="relative z-10 -mt-10 flex flex-1 flex-col items-center px-3 pb-4 text-center">
        <ClientMonogram client={client} size={72} className="ring-4 ring-white" />
        <p className="mt-3 line-clamp-2 text-sm font-semibold text-blue-700 group-hover:underline">
          {displayName(client)}
        </p>
        {client.legalName && client.legalName !== client.name && (
          <p className="text-xs text-gray-500">{client.name}</p>
        )}
        <div className="mt-1.5">
          <Badge label={getCalculationTypeLabel(client.calculationType)} className={styles.badge} />
        </div>
        <p className="mt-2 text-[11px] text-gray-500 tabular-nums">
          <span className="font-medium text-green-700">{formatCurrency(summary.collected)}</span> collected
        </p>
        {summary.outstanding > 0 && (
          <p className="text-[11px] font-medium text-amber-700 tabular-nums">
            {formatCurrency(summary.outstanding)} outstanding
          </p>
        )}
      </div>
    </Link>
  );
}

function ClientTable({
  rows,
  sort,
  onSort,
}: {
  rows: ClientRow[];
  sort: { key: SortKey; dir: SortDir };
  onSort: (key: SortKey) => void;
}) {
  const header = (key: SortKey, label: string, align: "left" | "right" = "left") => (
    <th
      scope="col"
      aria-sort={sort.key === key ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}
      className={`px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 ${
        align === "right" ? "text-right" : "text-left"
      }`}
    >
      <button type="button" onClick={() => onSort(key)} className="inline-flex items-center gap-1 hover:text-gray-900">
        {label}
        <span aria-hidden className={sort.key === key ? "text-gray-900" : "text-gray-300"}>
          {sort.key === key && sort.dir === "desc" ? "↓" : "↑"}
        </span>
      </button>
    </th>
  );

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="w-14 px-2 py-3">
              <span className="sr-only">Monogram</span>
            </th>
            {header("name", "Client")}
            <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
              TIN
            </th>
            {header("billing", "Billing")}
            {header("lastCollected", "Last collection")}
            {header("collected", "Collected", "right")}
            {header("outstanding", "Outstanding", "right")}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map(({ client, summary }) => (
            <tr key={client.id} className="hover:bg-gray-50">
              <td className="px-2 py-2.5">
                <ClientMonogram client={client} size={36} />
              </td>
              <td className="px-4 py-2.5">
                <Link
                  href={`/admin/clients/${client.id}`}
                  className="text-sm font-medium text-blue-700 hover:text-blue-800 hover:underline"
                >
                  {displayName(client)}
                </Link>
                {client.legalName && client.legalName !== client.name && (
                  <p className="text-xs text-gray-500">{client.name}</p>
                )}
              </td>
              <td className="whitespace-nowrap px-4 py-2.5 text-sm tabular-nums text-gray-700">
                {client.tin || <span className="text-gray-400">Not set</span>}
              </td>
              <td className="px-4 py-2.5">
                <Badge
                  label={getCalculationTypeLabel(client.calculationType)}
                  className={billingStyles[client.calculationType].badge}
                />
              </td>
              <td className="whitespace-nowrap px-4 py-2.5 text-sm text-gray-700">
                {summary.lastCollectedOn ? formatShortDate(summary.lastCollectedOn) : <span className="text-gray-400">—</span>}
              </td>
              <td className="px-4 py-2.5 text-right text-sm font-semibold tabular-nums text-green-700">
                {formatCurrency(summary.collected)}
              </td>
              <td
                className={`px-4 py-2.5 text-right text-sm font-semibold tabular-nums ${
                  summary.outstanding > 0 ? "text-amber-700" : "text-gray-400"
                }`}
              >
                {formatCurrency(summary.outstanding)}
                {summary.unpaidCount > 0 && (
                  <span className="block text-[11px] font-normal text-gray-500">
                    {summary.unpaidCount} unpaid
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BuildingIcon() {
  return (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
    </svg>
  );
}
